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

// Grand titre d'une partie de la page
function GroupTitle({ title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mt-4 sm:mt-6">
      <span className="w-1 h-7 rounded-full shrink-0" style={{ backgroundColor: ACCENT }} />
      <div className="min-w-0">
        <p className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// Petit titre précis au-dessus d'une carte
function BlockTitle({ title, subtitle }) {
  return (
    <div className="-mb-2 mt-1 min-w-0">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      {subtitle && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
}

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
      {showObjectives ? (
        <>
          <BlockTitle
            title="Mes objectifs du jour · Mes ventes de la semaine"
            subtitle="Ce que j'ai fait aujourd'hui face à mes objectifs, et mes devis, commandes et CA de la semaine (Odoo)"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch [&>*]:min-w-0">
            <ObjectivesCard typeQuotas={typeQuotas} title="Mes objectifs du jour" />
            <div className="[&>*]:h-full">
              <OdooRangeCard commercialId={userId} />
            </div>
          </div>
        </>
      ) : (
        <>
          <BlockTitle title="Mes ventes de la semaine" subtitle="Mes devis, commandes et chiffre d'affaires jour par jour (Odoo)" />
          <OdooRangeCard commercialId={userId} />
        </>
      )}

      <BlockTitle title="Mon pipeline d'opportunités" subtitle="Mes opportunités ouvertes par étape, et celles qui n'ont aucune activité prévue (Odoo)" />
      <OdooPipelineCard commercialId={userId} />

      <BlockTitle title="Mes activités Odoo" subtitle="Tâches, appels et rappels : prévues, terminées, en retard et annulées, puis leur évolution par catégorie" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start [&>*]:min-w-0">
        <OdooActivitiesCard commercialId={userId} />
        <OdooActivitiesChartCard commercialId={userId} />
      </div>

      <BlockTitle title="Ma liste d'attente & mon pipeline" subtitle="Pistes actives et perdues au total, puis nouvelles et perdues sur la période choisie (Odoo)" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start [&>*]:min-w-0">
        <OdooWaitingLostCard commercialId={userId} />
        <OdooWaitingPipelineChartCard commercialId={userId} />
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
    <div className="px-3 py-4 sm:p-6 pb-12 relative overflow-clip" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}20, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}16, transparent 70%)`, filter: 'blur(6px)' }}
      />

      <div className="max-w-6xl mx-auto flex flex-col gap-4 relative z-10 min-w-0">

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Salut {prenom} 👋</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {isManager ? "Voici l'activité de ton équipe" : 'Voici ton activité récente'}
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full capitalize font-medium self-start sm:self-auto" style={{ backgroundColor: `${ACCENT}17`, color: ACCENT }}>
            {todayStr}
          </span>
        </div>

        {isManager ? (
          <>
            {/* ===== 1. Mon équipe ===== */}
            <GroupTitle title="Mon équipe" subtitle="Le suivi de chaque commercial, aujourd'hui et sur la période" />

            <BlockTitle
              title="Suivi par commercial"
              subtitle="Choisis un commercial : ses objectifs d'aujourd'hui, puis toute son activité sur la période choisie"
            />
            <TeamBreakdownCard />

            {/* ===== 2. Ventes de l'équipe ===== */}
            <GroupTitle title="Ventes de l'équipe" subtitle="Les résultats Odoo de toute l'équipe" />

            <BlockTitle
              title="Devis, commandes & CA de l'équipe · Classement du jour"
              subtitle="Totaux de l'équipe pour le jour choisi, et classement des commerciaux par nombre d'activités aujourd'hui"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch [&>*]:min-w-0">
              <div className="lg:col-span-2 [&>*]:h-full">
                <TeamOdooSummaryCard />
              </div>
              <Leaderboard entries={leaderboard} currentUserId={user?.id} onSelectUser={setSelectedCommercial} />
            </div>

            <BlockTitle
              title="Devis et commandes par commercial"
              subtitle="Compare les commerciaux entre eux pour le jour choisi"
            />
            <TeamOdooTrendCard />

            {/* ===== 3. Mon activité ===== */}
            <GroupTitle title="Mon activité" subtitle="Tes propres objectifs et tes données Odoo" />
            <PersonalOdooSection userId={user?.id} typeQuotas={typeQuotas} showObjectives />
          </>
        ) : (
          <>
            {/* ===== 1. Ma journée ===== */}
            <GroupTitle title="Ma journée" subtitle="Ce que tu as fait aujourd'hui et ta place dans l'équipe" />
            <BlockTitle
              title="Mes objectifs du jour · Classement du jour"
              subtitle="Tes appels, RDV, devis, commandes et CA face à tes objectifs, et ton rang dans l'équipe"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch [&>*]:min-w-0">
              <ObjectivesCard typeQuotas={typeQuotas} title="Objectifs du jour" />
              <Leaderboard entries={leaderboard} currentUserId={user?.id} onSelectUser={setSelectedCommercial} />
            </div>

            {/* ===== 2. Mes données Odoo ===== */}
            <GroupTitle title="Mes données Odoo" subtitle="Tes ventes, ton pipeline et tes activités" />
            <PersonalOdooSection userId={user?.id} typeQuotas={typeQuotas} showObjectives={false} />

            {/* ===== 3. Équipe ===== */}
            <GroupTitle title="L'équipe" subtitle="Les résultats Odoo de toute l'équipe" />
            <BlockTitle title="Devis, commandes & CA de l'équipe" subtitle="Totaux de toute l'équipe pour le jour choisi" />
            <TeamOdooSummaryCard />
            <BlockTitle title="Devis et commandes par commercial" subtitle="Compare les commerciaux entre eux pour le jour choisi" />
            <TeamOdooTrendCard />
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

      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default Dashboard;