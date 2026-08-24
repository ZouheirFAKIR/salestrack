import { useEffect, useState } from 'react';
import LineChart from '../components/LineChart';
import PageLoader from '../components/PageLoader';
import { apiFetch } from '../utils/api';
import { Icon } from '../data/icons';

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

function Dashboard() {
  const [stats, setStats] = useState([]);
  const [daily, setDaily] = useState([]);
  const [typeQuotas, setTypeQuotas] = useState(null);
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
      apiFetch(`${API_URL}/api/activities/daily`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/my-type-quotas`).then(r => r.json()),
    ]).then(([statsData, dailyData, quotasData]) => {
      setStats(statsData);
      setDaily(dailyData);
      setTypeQuotas(quotasData);
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

  return (
    <div className="p-4 sm:p-6 pb-12" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Salut {prenom} 👋</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Voici ton activité récente</p>
        </div>

        <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Objectifs du jour</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {allTypes.map((type, i) => {
              const s = getStat(type);
              const current = Number(s.total);
              const target = typeQuotas?.quotas[type] || 5;
              const percent = Math.min(Math.round((current / target) * 100), 100);
              const circumference = 2 * Math.PI * 26;

              return (
                <div
                  key={type}
                  className="rounded-xl p-3 flex flex-col items-center text-center hover:border-orange-400/40 transition-all"
                  style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', animation: `popIn 0.4s ease ${i * 0.06}s both` }}
                >
                  <div className="relative w-16 h-16 mb-2">
                    <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="26" stroke="var(--border)" strokeWidth="5" fill="none" />
                      <circle
                        cx="32" cy="32" r="26" stroke={ACCENT} strokeWidth="5" fill="none" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (percent / 100) * circumference}
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                      <Icon name={type} size={18} style={{ color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={current} />/{target}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{labels[type]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Activités par jour (7 derniers jours)</p>
          <p className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {daily.reduce((sum, d) => sum + Number(d.total), 0)} activités
          </p>
          <LineChart data={daily} />
        </div>
      </div>

      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default Dashboard;