import { useEffect, useState } from 'react';
import OdooRangeCard from '../components/OdooRangeCard';
import OdooActivitiesCard from '../components/OdooActivitiesCard';
import OdooActivitiesChartCard from '../components/OdooActivitiesChartCard';
import OdooPipelineCard from '../components/OdooPipelineCard';
import OdooWaitingLostCard from '../components/OdooWaitingLostCard';
import OdooWaitingPipelineChartCard from '../components/OdooWaitingPipelineChartCard';
import TeamOdooSummaryCard from '../components/TeamOdooSummaryCard';
import TeamOdooTrendCard from '../components/TeamOdooTrendCard';
import TeamBreakdownCard from '../components/TeamBreakdownCard';
import PageLoader from '../components/PageLoader';
import CommercialDetail from '../components/CommercialDetail';
import { apiFetch } from '../utils/api';
import { Icon } from '../data/icons';
import { TYPE_COLORS } from '../data/typeColors';
import goldTrophy from '../assets/trophy.png';
import silverTrophy from '../assets/2sd_Trophie.png';
import bronzeTrophy from '../assets/Bronze_Trophie.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes', ca: "Chiffre d'affaires" };
const ALL_TYPES = ['appel', 'rdv', 'devis', 'commande', 'ca'];

const cardStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

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

// Une partie de la page : un titre court + son contenu, qui apparaît en douceur
function Section({ title, subtitle, index = 0, children }) {
  return (
    <section className="dash-in flex flex-col gap-4 min-w-0" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1 h-8 rounded-full shrink-0" style={{ background: `linear-gradient(${ACCENT}, ${ACCENT}55)` }} />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

// Grille où toutes les cartes d'une même ligne ont la même hauteur et les mêmes coins
const ROW = 'grid gap-4 sm:gap-5 items-stretch [&>*]:min-w-0 [&>*]:h-full [&>*]:rounded-2xl';

const RANK_STYLES = {
  1: { icon: goldTrophy },
  2: { icon: silverTrophy },
  3: { icon: bronzeTrophy },
};

function Leaderboard({ entries, currentUserId, onSelectUser }) {
  return (
    <div className="rounded-2xl p-3 sm:p-5 h-full min-w-0" style={cardStyle}>
      <p className="text-sm font-medium mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>Classement du jour</p>
      {(!entries || entries.length === 0) ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aucune activité aujourd'hui</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e, i) => {
            const rank = i + 1;
            const isMe = e.id === currentUserId;
            const rankStyle = RANK_STYLES[rank];
            return (
              <div
                key={e.id}
                onClick={() => onSelectUser(e)}
                className="flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-2.5 transition-colors"
                style={{
                  backgroundColor: isMe ? `${ACCENT}14` : 'var(--surface-strong)',
                  border: isMe ? `1px solid ${ACCENT}55` : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {rankStyle ? (
                  <img src={rankStyle.icon} alt={`Rang ${rank}`} className="w-7 h-7 object-contain shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {rank}
                  </div>
                )}
                {e.photo_url ? (
                  <img src={e.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
                    {e.nom?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isMe ? ACCENT : 'var(--text-primary)' }}>
                    {e.nom}{isMe && ' (toi)'}
                  </p>
                  <div className="flex items-center gap-x-2 gap-y-0.5 mt-0.5 flex-wrap">
                    {[
                      { key: 'appel', v: e.appel },
                      { key: 'rdv', v: e.rdv },
                      { key: 'devis', v: e.devis },
                      { key: 'commande', v: e.commande },
                    ].map((t) => (
                      <span key={t.key} className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <Icon name={t.key} size={11} />
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
      )}
    </div>
  );
}

function ObjectivesCard({ typeQuotas, title }) {
  return (
    <div className="rounded-2xl p-3 sm:p-5 h-full min-w-0" style={cardStyle}>
      <p className="text-sm font-medium mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {ALL_TYPES.map((type, i) => {
          const current = Number(typeQuotas?.today?.[type] || 0);
          const target = Number(typeQuotas?.quotas?.[type] ?? 0);
          const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
          const circumference = 2 * Math.PI * 26;
          const displayPercent = Math.max(percent, 4);
          const color = TYPE_COLORS[type];
          const isCA = type === 'ca';

          return (
            <div
              key={type}
              className={`rounded-xl p-2.5 sm:p-3 flex items-center text-center min-w-0 ${isCA ? 'col-span-2 flex-row justify-center gap-4' : 'flex-col'}`}
              style={{ backgroundColor: 'var(--surface-strong)', border: `1px solid ${color}30`, borderTop: `2.5px solid ${color}`, animation: `popIn 0.4s ease ${i * 0.06}s both` }}
            >
              <div className={`relative w-16 h-16 shrink-0 ${isCA ? '' : 'mb-2'}`}>
                <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="var(--border)" strokeWidth="5" fill="none" />
                  <circle
                    cx="32" cy="32" r="26" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (displayPercent / 100) * circumference}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon name={type} size={18} style={{ color }} />
                </div>
              </div>
              <div className={isCA ? 'text-left' : ''}>
                <p className="text-sm font-semibold break-words" style={{ color: 'var(--text-primary)' }}>
                  {isCA
                    ? `${Number(current).toLocaleString('fr-FR')} / ${Number(target).toLocaleString('fr-FR')} MAD`
                    : <><AnimatedNumber value={current} />/{target}</>}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{LABELS[type]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonalOdooSection({ userId, typeQuotas, showObjectives }) {
  return (
    <>
      <div className={`${ROW} grid-cols-1 lg:grid-cols-2`}>
        {showObjectives
          ? <ObjectivesCard typeQuotas={typeQuotas} title="Mes objectifs du jour" />
          : <OdooRangeCard commercialId={userId} />}
        {showObjectives
          ? <OdooRangeCard commercialId={userId} />
          : <OdooPipelineCard commercialId={userId} />}
      </div>

      <div className={`${ROW} grid-cols-1 md:grid-cols-2 2xl:grid-cols-3`}>
        {showObjectives && <OdooPipelineCard commercialId={userId} />}
        <OdooWaitingLostCard commercialId={userId} />
        <div className={showObjectives ? 'md:col-span-2 2xl:col-span-1 [&>*]:h-full [&>*]:rounded-2xl' : '[&>*]:h-full [&>*]:rounded-2xl 2xl:col-span-2'}>
          <OdooWaitingPipelineChartCard commercialId={userId} />
        </div>
      </div>

      <div className={`${ROW} grid-cols-1 lg:grid-cols-2`}>
        <OdooActivitiesCard commercialId={userId} />
        <OdooActivitiesChartCard commercialId={userId} />
      </div>
    </>
  );
}

function Dashboard() {
  const [typeQuotas, setTypeQuotas] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommercial, setSelectedCommercial] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const prenom = user?.nom?.split(' ')[0];
  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      apiFetch(`${API_URL}/api/activities/my-type-quotas`).then((r) => r.json()),
      apiFetch(`${API_URL}/api/activities/leaderboard`).then((r) => r.json()),
    ])
      .then(([quotasData, leaderboardData]) => {
        setTypeQuotas(quotasData);
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <PageLoader />;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <span className="text-4xl mb-4">🔒</span>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connecte-toi pour voir ton dashboard</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Tes statistiques personnelles apparaîtront ici</p>
        <a href="/login" className="px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: ACCENT, color: '#fff' }}>
          Se connecter
        </a>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="dash-scope px-4 py-6 sm:px-6 sm:py-8 lg:px-10 pb-16 relative overflow-clip" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Lueur douce en haut de page */}
      <div
        className="absolute inset-x-0 top-0 h-72 pointer-events-none"
        style={{ background: `radial-gradient(60% 100% at 85% 0%, ${ACCENT}14, transparent 70%)` }}
      />

      <div className="max-w-[1400px] mx-auto flex flex-col gap-8 sm:gap-10 relative z-10 min-w-0">

        {/* En-tête */}
        <header className="dash-in flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Salut {prenom} 👋</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {isManager ? "Voici l'activité de ton équipe" : 'Voici ton activité récente'}
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-medium self-start sm:self-auto first-letter:uppercase" style={{ backgroundColor: `${ACCENT}17`, color: ACCENT }}>
            {todayStr}
          </span>
        </header>

        {isManager ? (
          <>
            <Section index={1} title="L'équipe aujourd'hui" subtitle="Devis, commandes et CA de l'équipe, et classement du jour">
              <div className={`${ROW} grid-cols-1 md:grid-cols-2 2xl:grid-cols-3`}>
                <TeamOdooSummaryCard />
                <Leaderboard entries={leaderboard} currentUserId={user?.id} onSelectUser={setSelectedCommercial} />
                <div className="md:col-span-2 2xl:col-span-1 [&>*]:h-full [&>*]:rounded-2xl">
                  <TeamOdooTrendCard />
                </div>
              </div>
            </Section>

            <Section index={2} title="Mon équipe" subtitle="Choisis un commercial : ses objectifs du jour et son activité sur la période">
              <div className="[&>*]:rounded-2xl">
                <TeamBreakdownCard />
              </div>
            </Section>

            <Section index={3} title="Mon activité" subtitle="Tes propres objectifs et tes données Odoo">
              <PersonalOdooSection userId={user?.id} typeQuotas={typeQuotas} showObjectives />
            </Section>
          </>
        ) : (
          <>
            <Section index={1} title="Ma journée" subtitle="Tes objectifs du jour et ta place dans l'équipe">
              <div className={`${ROW} grid-cols-1 lg:grid-cols-2`}>
                <ObjectivesCard typeQuotas={typeQuotas} title="Objectifs du jour" />
                <Leaderboard entries={leaderboard} currentUserId={user?.id} onSelectUser={setSelectedCommercial} />
              </div>
            </Section>

            <Section index={2} title="Mes données Odoo" subtitle="Tes ventes, ton pipeline et tes activités">
              <PersonalOdooSection userId={user?.id} typeQuotas={typeQuotas} showObjectives={false} />
            </Section>

            <Section index={3} title="L'équipe" subtitle="Les résultats Odoo de toute l'équipe">
              <div className={`${ROW} grid-cols-1 lg:grid-cols-5`}>
                <div className="lg:col-span-2 [&>*]:h-full [&>*]:rounded-2xl"><TeamOdooSummaryCard /></div>
                <div className="lg:col-span-3 [&>*]:h-full [&>*]:rounded-2xl"><TeamOdooTrendCard /></div>
              </div>
            </Section>
          </>
        )}
      </div>

      {selectedCommercial && (
        <CommercialDetail
          commercial={selectedCommercial}
          onClose={() => setSelectedCommercial(null)}
          onQuotaUpdated={() => {}}
        />
      )}

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes dashIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .dash-in { animation: dashIn 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) { .dash-in { animation: none; } }
      `}</style>
    </div>
  );
}

export default Dashboard;