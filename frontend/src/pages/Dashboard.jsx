import { useEffect, useState } from 'react';
import OdooRangeCard from '../components/OdooRangeCard';
import OdooActivitiesCard from '../components/OdooActivitiesCard';
import OdooActivitiesChartCard from '../components/OdooActivitiesChartCard';
import PageLoader from '../components/PageLoader';
import { apiFetch } from '../utils/api';
import { Icon } from '../data/icons';
import goldTrophy from '../assets/trophy.png';
import silverTrophy from '../assets/2sd_Trophie.png';
import bronzeTrophy from '../assets/Bronze_Trophie.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const interval = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(interval); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(interval);
  }, [value]);
  return <>{display}</>;
}

const RANK_STYLES = {
  1: { icon: goldTrophy },
  2: { icon: silverTrophy },
  3: { icon: bronzeTrophy },
};

function Leaderboard({ entries, currentUserId }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Classement du jour</p>
      <div className="flex flex-col gap-2">
        {entries.map((e, i) => {
          const rank = i + 1;
          const isMe = e.id === currentUserId;
          const rankStyle = RANK_STYLES[rank];
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl p-2.5 transition-colors"
              style={{
                backgroundColor: isMe ? `${ACCENT}14` : 'var(--surface-strong)',
                border: isMe ? `1px solid ${ACCENT}55` : '1px solid transparent',
              }}
            >
              {rankStyle ? (
                <img
                  src={rankStyle.icon}
                  alt={`Rang ${rank}`}
                  className="w-7 h-7 object-contain shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {rank}
                </div>
              )}
              {e.photo_url ? (
                <img src={e.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: ACCENT }}>
                  {e.nom?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: isMe ? ACCENT : 'var(--text-primary)' }}>
                  {e.nom}{isMe && ' (toi)'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {[
                    { key: 'appel', icon: 'appel', v: e.appel },
                    { key: 'rdv', icon: 'rdv', v: e.rdv },
                    { key: 'devis', icon: 'devis', v: e.devis },
                    { key: 'commande', icon: 'commande', v: e.commande },
                  ].map((t) => (
                    <span key={t.key} className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Icon name={t.icon} size={11} />
                      <span className="text-[11px]">{t.v}</span>
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
                {e.total} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>act.</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState([]);
  const [typeQuotas, setTypeQuotas] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const prenom = user?.nom?.split(' ')[0];

  const labels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };
  const allTypes = ['appel', 'rdv', 'devis', 'commande'];

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      apiFetch(`${API_URL}/api/activities/stats/today`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/my-type-quotas`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/leaderboard`).then(r => r.json()),
    ]).then(([statsData, quotasData, leaderboardData]) => {
      setStats(statsData);
      setTypeQuotas(quotasData);
      setLeaderboard(leaderboardData);
      setLoading(false);
    });
  }, [token]);

  const getStat = (type) => stats.find((s) => s.type === type) || { total: 0 };

  if (loading) return <PageLoader />;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <span className="text-4xl mb-4">🔒</span>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connecte-toi pour voir ton dashboard</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Tes statistiques personnelles apparaîtront ici</p>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-4 sm:p-6 pb-12 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}20, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}16, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <svg className="absolute top-32 right-8 pointer-events-none hidden lg:block" width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" stroke={ACCENT} strokeOpacity="0.16" strokeWidth="2" fill="none" />
        <circle cx="60" cy="60" r="30" stroke={ACCENT} strokeOpacity="0.12" strokeWidth="2" fill="none" />
      </svg>
      <div className="absolute bottom-1/4 left-6 w-2.5 h-2.5 rounded-full pointer-events-none hidden lg:block" style={{ backgroundColor: `${ACCENT}30` }} />

      <div className="max-w-6xl mx-auto flex flex-col gap-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Salut {prenom} 👋</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Voici ton activité récente</p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full capitalize font-medium self-start sm:self-auto" style={{ backgroundColor: `${ACCENT}17`, color: ACCENT }}>
            {todayStr}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Objectifs du jour</p>
            <div className="grid grid-cols-2 gap-3">
              {allTypes.map((type, i) => {
                const s = getStat(type);
                const current = Number(s.total);
                const target = typeQuotas?.quotas[type] || 5;
                const percent = Math.min(Math.round((current / target) * 100), 100);
                const circumference = 2 * Math.PI * 26;

                const ringColor =
                  percent >= 100 ? '#22c55e' :
                  percent >= 75 ? '#86efac' :
                  percent >= 25 ? '#f97316' :
                  '#ef4444';
                const displayPercent = Math.max(percent, 4);

                return (
                  <div
                    key={type}
                    className="rounded-xl p-3 flex flex-col items-center text-center"
                    style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', animation: `popIn 0.4s ease ${i * 0.06}s both` }}
                  >
                    <div className="relative w-16 h-16 mb-2">
                      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                        <circle cx="32" cy="32" r="26" stroke="var(--border)" strokeWidth="5" fill="none" />
                        <circle
                          cx="32" cy="32" r="26" stroke={ringColor} strokeWidth="5" fill="none" strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - (displayPercent / 100) * circumference}
                          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon name={type} size={18} style={{ color: ACCENT }} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={current} />/{target}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{labels[type]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <Leaderboard entries={leaderboard} currentUserId={user?.id} />
        </div>

        <div>
          <p className="text-sm font-medium mb-3 mt-2" style={{ color: 'var(--text-primary)' }}>Données Odoo</p>
          <div className="flex flex-col gap-4">
            <OdooRangeCard commercialId={user?.id} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <OdooActivitiesCard commercialId={user?.id} />
              <OdooActivitiesChartCard commercialId={user?.id} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default Dashboard;