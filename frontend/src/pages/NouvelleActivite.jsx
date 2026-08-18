import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti';
import SuccessModal from '../components/SuccessModal';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { apiFetch } from '../utils/api';
import { badgeDefinitions } from '../data/badgeDefinitions';
import phoneIcon from '../assets/Phone.png';
import calendarIcon from '../assets/calendar.png';
import documentIcon from '../assets/document.png';
import cartIcon from '../assets/Cart.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function NouvelleActivite() {
  const navigate = useNavigate();
  const [type, setType] = useState(null);
  const [sens, setSens] = useState(null);
  const [statut, setStatut] = useState(null);
  const [nombre, setNombre] = useState(1);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [combo, setCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [todayStats, setTodayStats] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const [currentUnlockIndex, setCurrentUnlockIndex] = useState(0);
  const [typeQuotas, setTypeQuotas] = useState({ appel: 5, rdv: 2, devis: 1, commande: 1 });
  const [completedType, setCompletedType] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const prenom = user?.nom?.split(' ')[0] || 'Commercial';

  const activityTypes = [
    { key: 'appel', label: 'Appel', icon: phoneIcon },
    { key: 'rdv', label: 'Rendez-vous', icon: calendarIcon },
    { key: 'devis', label: 'Devis', icon: documentIcon },
    { key: 'commande', label: 'Commande', icon: cartIcon },
  ];

  const icons = { appel: phoneIcon, rdv: calendarIcon, devis: documentIcon, commande: cartIcon };
  const labels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

  const getDateParts = () => {
    const today = new Date();
    const jourComplet = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const jourNum = today.getDate();
    const moisAbrev = today.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    const annee = today.getFullYear();
    return { jourComplet, jourNum, moisAbrev, annee };
  };

  const loadStats = () => {
    if (!token) { setPageLoading(false); return; }
    apiFetch(`${API_URL}/api/activities/stats/today`)
      .then(r => r.json())
      .then((data) => {
        setTodayStats(data);
        setPageLoading(false);
      });
  };

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/api/activities/my-type-quotas`)
      .then((r) => r.json())
      .then((d) => setTypeQuotas(d.quotas));
  }, [token]);

  const resetForm = () => { setType(null); setSens(null); setStatut(null); setNombre(1); };

  const handleTypeClick = (t) => {
    setMessage('');
    setType(t.key);
    setSens(null);
    setStatut(null);
    setNombre(1);
  };

  const canSubmit = () => {
    if (type === 'appel') return sens && statut && nombre >= 1;
    if (type === 'rdv') return !!statut && nombre >= 1;
    if (type === 'devis' || type === 'commande') return nombre >= 1;
    return false;
  };

  const checkForNewBadges = async () => {
    try {
      const [badgeStatsRes, seenRes] = await Promise.all([
        apiFetch(`${API_URL}/api/activities/badge-stats`),
        apiFetch(`${API_URL}/api/activities/seen-badges`),
      ]);
      const badgeStats = await badgeStatsRes.json();
      const seenData = await seenRes.json();

      const getValue = (category) => {
        if (category === 'total') return badgeStats.total;
        if (category === 'streak') return badgeStats.streak;
        if (category === 'target') return badgeStats.targetDays;
        return badgeStats.typeCounts[category] || 0;
      };

      const unlocked = badgeDefinitions.filter((b) => getValue(b.category) >= b.threshold);
      const newOnes = unlocked.filter((b) => !seenData.includes(b.id));
      if (newOnes.length > 0) {
        setNewlyUnlocked(newOnes);
        setCurrentUnlockIndex(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsSeen = (badgeIds) => {
    apiFetch(`${API_URL}/api/activities/seen-badges`, {
      method: 'POST',
      body: JSON.stringify({ badgeIds }),
    });
  };

  const handleCloseUnlock = () => {
    markAsSeen(newlyUnlocked.map((b) => b.id));
    setNewlyUnlocked([]);
    setCurrentUnlockIndex(0);
  };

  const handleNextUnlock = () => {
    if (currentUnlockIndex < newlyUnlocked.length - 1) {
      setCurrentUnlockIndex((i) => i + 1);
    } else {
      handleCloseUnlock();
    }
  };

  const getStat = (key) => todayStats.find((s) => s.type === key)?.total || 0;

  const handleSubmit = async () => {
    if (!token) { navigate('/login'); return; }
    if (!canSubmit()) return;
    setSubmitting(true);

    const payload = { type, sens: sens || null, statut: statut || null, nombre };
    try {
      const res = await apiFetch(`${API_URL}/api/activities`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const newCombo = combo + data.count;
        setCombo(newCombo);
        setShowConfetti(true);
        setMessage(`Bien joué ! ${data.count} activité${data.count > 1 ? 's' : ''} enregistrée${data.count > 1 ? 's' : ''} 🔥`);

        const beforeCount = getStat(type);
        const afterCount = beforeCount + data.count;
        const target = typeQuotas[type] || 5;
        const justCompletedType = type;

        resetForm();
        loadStats();
        setTimeout(() => setShowConfetti(false), 1300);
        setTimeout(() => setMessage(''), 2500);
        checkForNewBadges();

        if (beforeCount < target && afterCount >= target) {
          setTimeout(() => setCompletedType({ type: justCompletedType, count: afterCount, target }), 1400);
        }
      }
    } catch (err) {
      setShake(true);
      setMessage("Erreur lors de l'enregistrement");
      setTimeout(() => setShake(false), 400);
    }
    setSubmitting(false);
  };

  const totalToday = todayStats.reduce((sum, s) => sum + Number(s.total), 0);
  const totalObjectif = Object.values(typeQuotas).reduce((sum, v) => sum + Number(v), 0);

  if (pageLoading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 flex items-center justify-center">
      <Confetti show={showConfetti} />
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      {completedType && (
        <SuccessModal
          onClose={() => setCompletedType(null)}
          title={`Objectif ${labels[completedType.type]} atteint !`}
          message={`Tu as fait ${completedType.count} sur ${completedType.target} — excellent travail !`}
        />
      )}
      {newlyUnlocked.length > 0 && (
        <BadgeUnlockModal
          badge={newlyUnlocked[currentUnlockIndex]}
          onClose={handleCloseUnlock}
          onNext={handleNextUnlock}
          remaining={newlyUnlocked.length - currentUnlockIndex - 1}
        />
      )}

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-white">Nouvelle activité</h1>
              <p className="text-white/40 text-xs">Sélectionne un type puis confirme</p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
              <div>
                <p className="text-white/40 text-[10px] sm:text-[11px] uppercase tracking-wide mb-0.5">Aujourd'hui</p>
                <p className="text-white text-sm sm:text-base font-medium capitalize">{getDateParts().jourComplet}</p>
                <p className="text-white/35 text-[10px] sm:text-[11px] mt-0.5">{getDateParts().annee}</p>
              </div>
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
              >
                <span className="text-white text-sm sm:text-base font-semibold leading-none">{getDateParts().jourNum}</span>
                <span className="text-white/80 text-[8px] sm:text-[9px] uppercase mt-0.5">{getDateParts().moisAbrev}</span>
              </div>
            </div>

            {combo > 0 && (
              <span className="text-xs text-white px-3 py-1 rounded-full animate-bounce shrink-0 self-start sm:self-auto" style={{ backgroundColor: ACCENT, boxShadow: `0 0 20px ${ACCENT}80` }}>
                Combo x{combo} 🔥
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activityTypes.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTypeClick(t)}
                className="p-3 rounded-xl border transition-all duration-150 active:scale-95 hover:scale-[1.03] flex flex-col items-center"
                style={type === t.key
                  ? { backgroundColor: ACCENT, borderColor: ACCENT, boxShadow: `0 0 20px ${ACCENT}55` }
                  : { backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <img src={t.icon} alt={t.label} className="w-6 h-6 mb-1" />
                <span className="text-xs text-white">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5 bg-white/5 border border-white/10 rounded-2xl flex-1 flex flex-col justify-center min-h-40">
            {!type && (
              <p className="text-white/30 text-sm text-center">Choisis un type ci-dessus pour continuer</p>
            )}

            {type === 'appel' && (
              <div className="animate-[fadeIn_0.2s_ease]">
                <p className="text-sm text-white/50 mb-3">Détail de l'appel</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['sortant', 'entrant'].map((s) => (
                    <button key={s} onClick={() => setSens(s)} className="p-2.5 rounded-lg text-sm border transition-all active:scale-95"
                      style={sens === s ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 } : { backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      {s === 'sortant' ? 'Sortant' : 'Entrant'}
                    </button>
                  ))}
                  {['repond', 'ne_repond_pas'].map((s) => (
                    <button key={s} onClick={() => setStatut(s)} className="p-2.5 rounded-lg text-sm border transition-all active:scale-95"
                      style={statut === s ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 } : { backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      {s === 'repond' ? 'Répond' : 'Ne répond pas'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === 'rdv' && (
              <div className="animate-[fadeIn_0.2s_ease]">
                <p className="text-sm text-white/50 mb-3">Détail du rendez-vous</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['present', 'absent'].map((s) => (
                    <button key={s} onClick={() => setStatut(s)} className="p-2.5 rounded-lg text-sm border transition-all active:scale-95"
                      style={statut === s ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 } : { backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      {s === 'present' ? 'Présent' : 'Absent'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(type === 'devis' || type === 'commande') && (
              <div className="animate-[fadeIn_0.2s_ease] text-center mb-2">
                <img src={icons[type]} alt={type} className="w-8 h-8 mx-auto mb-2 opacity-70" />
                <p className="text-white text-sm">{labels[type]}</p>
              </div>
            )}

            {type && (
              <div className="animate-[fadeIn_0.2s_ease]">
                <p className="text-sm text-white/50 mb-2">Nombre</p>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setNombre((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 rounded-lg border border-white/15 text-white text-lg flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={nombre}
                    onChange={(e) => setNombre(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center p-2 rounded-lg bg-black border border-white/15 text-white outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => setNombre((n) => Math.min(1000, n + 1))}
                    className="w-9 h-9 rounded-lg border border-white/15 text-white text-lg flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit() || submitting}
                  className={`w-full text-white p-2.5 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}
                  style={{
                    backgroundColor: canSubmit() ? ACCENT : 'rgba(255,255,255,0.1)',
                    boxShadow: canSubmit() ? `0 4px 20px ${ACCENT}40` : 'none',
                    cursor: canSubmit() ? 'pointer' : 'not-allowed',
                    color: canSubmit() ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {submitting && <Spinner size={15} color="#fff" />}
                  {submitting ? 'Enregistrement...' : `Enregistrer ${nombre > 1 ? `(${nombre})` : ''}`}
                </button>
              </div>
            )}
          </div>

          {message && <p className="text-sm font-medium animate-[fadeIn_0.2s_ease]" style={{ color: ACCENT }}>{message}</p>}
        </div>

        <div className="lg:col-span-1 flex flex-col gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: ACCENT }}>
                {prenom.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{prenom}</p>
                <p className="text-white/40 text-xs">Aujourd'hui</p>
              </div>
            </div>
            <p className="text-4xl font-bold" style={{ color: ACCENT }}>
              {totalToday}<span className="text-xl text-white/30 font-medium"> / {totalObjectif}</span>
            </p>
            <p className="text-xs text-white/40 mt-1">activités enregistrées aujourd'hui</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs text-white/50 uppercase tracking-wide">Objectifs du jour</p>
            {activityTypes.map((t) => {
              const current = getStat(t.key);
              const target = typeQuotas[t.key] || 5;
              const percent = Math.min(Math.round((current / target) * 100), 100);
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <img src={icons[t.key]} alt={t.key} className="w-4 h-4 opacity-60" />
                      <span className="text-xs text-white/60">{labels[t.key]}</span>
                    </div>
                    <span className="text-xs font-medium text-white">{current}/{target}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%`, backgroundColor: ACCENT }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}>
            <p className="text-xl mb-1">🔥</p>
            <p className="text-white text-xs font-medium">Reste actif chaque jour</p>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
      `}</style>
    </div>
  );
}

export default NouvelleActivite;