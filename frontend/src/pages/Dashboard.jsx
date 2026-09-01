import { useEffect, useState } from 'react';
import LineChart from '../components/LineChart';
import MultiLineChart from '../components/MultiLineChart';
import ActivityMultiChart from '../components/ActivityMultiChart';
import OdooRangeCard from '../components/OdooRangeCard';
import OdooActivitiesCard from '../components/OdooActivitiesCard';
import PageLoader from '../components/PageLoader';
import { apiFetch } from '../utils/api';
import { Icon } from '../data/icons';
import goldTrophy from '../assets/trophy.png';
import silverTrophy from '../assets/2sd_Trophie.png';
import bronzeTrophy from '../assets/Bronze_Trophie.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

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

function ChartCard({ title, data, target, total, labelKey, formatLabel }) {
  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      <p className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {total} activités
      </p>
      <LineChart data={data} target={target} labelKey={labelKey} formatLabel={formatLabel} />
    </div>
  );
}

function MultiChartCard({ title, data, keys = ['appel', 'rdv', 'devis', 'commande'], labelKey, formatLabel }) {
  const grandTotal = data.reduce((sum, d) => sum + keys.reduce((s, k) => s + Number(d[k] || 0), 0), 0);

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      <p className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {grandTotal} activités
      </p>
      <ActivityMultiChart data={data} keys={keys} labelKey={labelKey} formatLabel={formatLabel} />
    </div>
  );
}

const RANK_STYLES = {
  1: { icon: goldTrophy },
  2: { icon: silverTrophy },
  3: { icon: bronzeTrophy },
};

function Leaderboard({ entries, currentUserId }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Classement du jour</p>
      <div className="flex flex-col gap-2">
        {entries.map((e, i) => {
          const rank = i + 1;
          const isMe = e.id === currentUserId;
          const rankStyle = RANK_STYLES[rank];
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-lg p-2.5 transition-colors"
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
              <p className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: isMe ? ACCENT : 'var(--text-primary)' }}>
                {e.nom}{isMe && ' (toi)'}
              </p>
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
  const [daily, setDaily] = useState([]);
  const [odooDaily, setOdooDaily] = useState([]);
  const [odooLinked, setOdooLinked] = useState(true);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [yearly, setYearly] = useState([]);
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
      apiFetch(`${API_URL}/api/activities/daily`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/weekly`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/monthly`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/yearly`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/my-type-quotas`).then(r => r.json()),
      apiFetch(`${API_URL}/api/activities/leaderboard`).then(r => r.json()),
    ]).then(([statsData, dailyData, weeklyData, monthlyData, yearlyData, quotasData, leaderboardData]) => {
      setStats(statsData);
      setDaily(dailyData);
      setWeekly(weeklyData);
      setMonthly(monthlyData);
      setYearly(yearlyData);
      setTypeQuotas(quotasData);
      setLeaderboard(leaderboardData);
      setLoading(false);
    });

    if (user?.id) {
      apiFetch(`${API_URL}/api/odoo/daily/${user.id}?days=30`)
        .then((r) => r.json())
        .then((data) => {
          if (data.linked) {
            setOdooDaily(data.daily);
          } else {
            setOdooLinked(false);
          }
        })
        .catch(() => setOdooLinked(false));
    }
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

  const dailyTarget = typeQuotas ? Object.values(typeQuotas.quotas).reduce((sum, v) => sum + Number(v), 0) : 0;
  const weeklyTarget = dailyTarget * 7;
  const monthlyTarget = dailyTarget * 30;
  const yearlyTarget = dailyTarget * 365;

  const sumTotal = (arr) => arr.reduce((sum, d) => sum + Number(d.total), 0);

  return (
    <div className="p-4 sm:p-6 pb-12" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Salut {prenom} 👋</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Voici ton activité récente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Objectifs du jour</p>
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
                percent >= 25 ? ACCENT :
                '#ef4444';
              const displayPercent = Math.max(percent, 4);

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
                        cx="32" cy="32" r="26" stroke={ringColor} strokeWidth="5" fill="none" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (displayPercent / 100) * circumference}
                        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
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

        <Leaderboard entries={leaderboard} currentUserId={user?.id} />
        </div>

        <MultiChartCard title="Appels & Rendez-vous par jour (7 derniers jours)" data={daily} keys={['appel', 'rdv']} labelKey="jour" formatLabel={(d) => parseLocalDate(d).toLocaleDateString('fr-FR', { weekday: 'short' })} />

        <OdooRangeCard commercialId={user?.id} />
        <OdooActivitiesCard commercialId={user?.id} />
      </div>

      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default Dashboard;