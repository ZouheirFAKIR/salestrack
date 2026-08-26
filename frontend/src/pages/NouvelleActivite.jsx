import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti';
import SuccessModal from '../components/SuccessModal';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import EmptyState from '../components/EmptyState';
import { apiFetch } from '../utils/api';
import { badgeDefinitions } from '../data/badgeDefinitions';
import { Icon } from '../data/icons';
import CoinIcon from '../components/CoinIcon';

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
  const [dailyBonus, setDailyBonus] = useState(null);
  const [pendingObjective, setPendingObjective] = useState(null);
  const [points, setPoints] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/api/rewards/balance`)
      .then((r) => r.json())
      .then((d) => setPoints(d.balance))
      .catch(() => {});
  }, [token]);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const prenom = user?.nom?.split(' ')[0] || 'Commercial';

  const activityTypes = [
    { key: 'appel', label: 'Appel' },
    { key: 'rdv', label: 'Rendez-vous' },
    { key: 'devis', label: 'Devis' },
    { key: 'commande', label: 'Commande' },
  ];

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

  useEffect(() => {
    if (newlyUnlocked.length === 0 && pendingObjective) {
      if (pendingObjective.kind === 'daily') {
        setDailyBonus(pendingObjective.points);
      } else {
        setCompletedType(pendingObjective);
      }
      setPendingObjective(null);
    }
  }, [newlyUnlocked, pendingObjective]);

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

        await checkForNewBadges();

        if (data.bonusAwarded) {
          apiFetch(`${API_URL}/api/rewards/balance`)
            .then((r) => r.json())
            .then((d) => setPoints(d.balance))
            .catch(() => {});
          window.dispatchEvent(new Event('points-updated'));
          setPendingObjective({ kind: 'daily', points: data.bonusPoints });
        } else if (beforeCount < target && afterCount >= target) {
          setPendingObjective({ kind: 'type', type: justCompletedType, count: afterCount, target });
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
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Confetti show={showConfetti} />
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      {completedType && (
        <SuccessModal
          onClose={() => setCompletedType(null)}
          title={`Objectif ${labels[completedType.type]} atteint !`}
          message={`Tu as fait ${completedType.count} sur ${completedType.target} — excellent travail !`}
        />
      )}
      {dailyBonus && (
        <SuccessModal
          onClose={() => setDailyBonus(null)}
          title="Objectif du jour complet !"
          message={`Tu as atteint tous tes objectifs du jour et gagné ${dailyBonus} points bonus 🎉`}
        />
      )}
      {newlyUnlocked.length > 0 && !completedType && !dailyBonus && (
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
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Nouvelle activité</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sélectionne un type puis confirme</p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-secondary)' }}>Aujourd'hui</p>
                <p className="text-sm sm:text-base font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{getDateParts().jourComplet}</p>
                <p className="text-[10px] sm:text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{getDateParts().annee}</p>
              </div>
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
              >
                <span className="text-sm sm:text-base font-semibold leading-none" style={{ color: '#fff' }}>{getDateParts().jourNum}</span>
                <span className="text-[8px] sm:text-[9px] uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{getDateParts().moisAbrev}</span>
              </div>
            </div>

            {combo > 0 && (
              <span className="text-xs px-3 py-1 rounded-full animate-bounce shrink-0 self-start sm:self-auto" style={{ backgroundColor: ACCENT, boxShadow: `0 0 20px ${ACCENT}80`, color: '#fff' }}>
                Combo x{combo} 🔥
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activityTypes.map((t) => {
              const isActive = type === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTypeClick(t)}
                  className="p-3 rounded-xl border transition-all duration-150 active:scale-95 hover:scale-[1.03] flex flex-col items-center"
                  style={isActive
                    ? { backgroundColor: ACCENT, borderColor: ACCENT, boxShadow: `0 0 20px ${ACCENT}55` }
                    : { backgroundColor: 'var(--surface-strong)', borderColor: 'var(--border)' }}
                >
                  <Icon name={t.key} size={22} className="mb-1" style={{ color: isActive ? '#fff' : 'var(--text-primary)' }} />
                  <span className="text-xs" style={{ color: isActive ? '#fff' : 'var(--text-primary)' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 rounded-2xl flex-1 flex flex-col justify-center min-h-40" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {!type && (
              <EmptyState
                icon="👆"
                title="Choisis un type ci-dessus"
                subtitle="Appel, rendez-vous, devis ou commande — sélectionne pour continuer."
              />
            )}

            {type === 'appel' && (
              <div className="animate-[fadeIn_0.2s_ease]">
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Détail de l'appel</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['sortant', 'entrant'].map((s) => (
                    <button key={s} onClick={() => setSens(s)} className="p-2.5 rounded-lg text-sm border transition-all active:scale-95"
                      style={sens === s ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 } : { backgroundColor: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {s === 'sortant' ? 'Sortant' : 'Entrant'}
                    </button>
                  ))}
                  {['repond', 'ne_repond_pas'].map((s) => (
                    <button key={s} onClick={() => setStatut(s)} className="p-2.5 rounded-lg text-sm border transition-all active:scale-95"
                      style={statut === s ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 } : { backgroundColor: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {s === 'repond' ? 'Répond' : 'Ne répond pas'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === 'rdv' && (
              <div className="animate-[fadeIn_0.2s_ease]">
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Détail du rendez-vous</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['present', 'absent'].map((s) => (
                    <button key={s} onClick={() => setStatut(s)} className="p-2.5 rounded-lg text-sm border transition-all active:scale-95"
                      style={statut === s ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 } : { backgroundColor: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {s === 'present' ? 'Présent' : 'Absent'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(type === 'devis' || type === 'commande') && (
              <div className="animate-[fadeIn_0.2s_ease] text-center mb-2">
                <Icon name={type} size={28} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{labels[type]}</p>
              </div>
            )}

            {type && (
              <div className="animate-[fadeIn_0.2s_ease]">
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Nombre</p>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setNombre((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 rounded-lg border text-lg flex items-center justify-center active:scale-95 transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={nombre}
                    onChange={(e) => setNombre(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center p-2 rounded-lg border outline-none focus:border-orange-500"
                    style={{ backgroundColor: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={() => setNombre((n) => Math.min(1000, n + 1))}
                    className="w-9 h-9 rounded-lg border text-lg flex items-center justify-center active:scale-95 transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit() || submitting}
                  className={`w-full p-2.5 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}
                  style={{
                    backgroundColor: canSubmit() ? ACCENT : 'var(--border)',
                    boxShadow: canSubmit() ? `0 4px 20px ${ACCENT}40` : 'none',
                    cursor: canSubmit() ? 'pointer' : 'not-allowed',
                    color: canSubmit() ? '#fff' : 'var(--text-muted)',
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
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: ACCENT, color: '#fff' }}>
                {prenom.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{prenom}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Aujourd'hui</p>
              </div>
            </div>
            <p className="text-4xl font-bold" style={{ color: ACCENT }}>
              {totalToday}<span className="text-xl font-medium" style={{ color: 'var(--text-muted)' }}> / {totalObjectif}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>activités enregistrées aujourd'hui</p>
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Objectifs du jour</p>
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: ACCENT }}>
                <CoinIcon size={12} />
                +5 en les complétant
              </span>
            </div>
            {activityTypes.map((t) => {
              const current = getStat(t.key);
              const target = typeQuotas[t.key] || 5;
              const percent = Math.min(Math.round((current / target) * 100), 100);
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon name={t.key} size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labels[t.key]}</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{current}/{target}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%`, backgroundColor: ACCENT }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {points !== null && (
            <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Solde de points</p>
                <p className="text-xl font-semibold flex items-center gap-1.5 mt-0.5" style={{ color: ACCENT }}>
                  <CoinIcon size={16} />
                  {points}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}>
            <p className="text-xl mb-1">🔥</p>
            <p className="text-xs font-medium" style={{ color: '#fff' }}>Reste actif chaque jour</p>
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