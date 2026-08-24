import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import { icons as categoryIcons } from '../data/icons';
import PageLoader from '../components/PageLoader';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { apiFetch } from '../utils/api';
import { badgeDefinitions, categoryLabels } from '../data/badgeDefinitions';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ProgressRing({ percent, size = 100 }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth="8"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span className="absolute text-lg font-bold text-white">{percent}%</span>
    </div>
  );
}

function NextUpCard({ badge, value }) {
  const percent = Math.min(Math.round((value / badge.threshold) * 100), 100);
  const remaining = badge.threshold - value;
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-400/40 transition-colors">
      <Badge category={badge.category} unlocked={false} label={null} size={46} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{badge.label}</p>
        <p className="text-[11px] text-white/40 mb-1.5">{categoryLabels[badge.category]} · encore {remaining}</p>
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: ACCENT }} />
        </div>
      </div>
      <span className="text-xs font-semibold text-white/50 shrink-0">{value}/{badge.threshold}</span>
    </div>
  );
}

function CategoryExplorer({ cat, badges, value }) {
  const sorted = [...badges].sort((a, b) => a.threshold - b.threshold);
  const nextBadge = sorted.find((b) => value < b.threshold);
  const currentBadge = [...sorted].reverse().find((b) => value >= b.threshold);
  const focusBadge = nextBadge || sorted[sorted.length - 1];
  const prevThreshold = currentBadge ? currentBadge.threshold : 0;
  const progressPercent = nextBadge
    ? Math.min(Math.round(((value - prevThreshold) / (nextBadge.threshold - prevThreshold)) * 100), 100)
    : 100;
  const unlockedInCat = sorted.filter((b) => value >= b.threshold).length;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/[0.06]">
        <Badge category={cat} unlocked={!!currentBadge} label={null} size={64} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white font-medium">{focusBadge.label}</p>
            <span className="text-xs text-white/40">{unlockedInCat}/{sorted.length}</span>
          </div>
          {nextBadge ? (
            <>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5">
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: ACCENT }} />
              </div>
              <p className="text-[11px] text-white/40 mt-1.5">{value} / {nextBadge.threshold}</p>
            </>
          ) : (
            <p className="text-[11px] mt-1.5" style={{ color: ACCENT }}>Tous les paliers débloqués 🎉</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
        {sorted.map((b) => (
          <Badge key={b.id} category={b.category} unlocked={value >= b.threshold} label={b.threshold} size={52} />
        ))}
      </div>
    </div>
  );
}

function Badges() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seenBadges, setSeenBadges] = useState([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const [currentUnlockIndex, setCurrentUnlockIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('total');

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/activities/badge-stats`).then((r) => r.json()),
      apiFetch(`${API_URL}/api/activities/seen-badges`).then((r) => r.json()),
    ]).then(([statsData, seenData]) => {
      setStats(statsData);
      setSeenBadges(seenData);
      setLoading(false);

      const getValue = (category) => {
        if (category === 'total') return statsData.total;
        if (category === 'streak') return statsData.streak;
        if (category === 'target') return statsData.targetDays;
        return statsData.typeCounts[category] || 0;
      };

      const unlocked = badgeDefinitions.filter((b) => getValue(b.category) >= b.threshold);
      const newOnes = unlocked.filter((b) => !seenData.includes(b.id));
      if (newOnes.length > 0) {
        setNewlyUnlocked(newOnes);
      }
    }).catch(() => setLoading(false));
  }, []);

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

  if (loading) return <PageLoader />;
  if (!stats) return null;

  const getValue = (category) => {
    if (category === 'total') return stats.total;
    if (category === 'streak') return stats.streak;
    if (category === 'target') return stats.targetDays;
    return stats.typeCounts[category] || 0;
  };

  const isUnlocked = (badge) => getValue(badge.category) >= badge.threshold;
  const unlockedCount = badgeDefinitions.filter(isUnlocked).length;
  const totalCount = badgeDefinitions.length;
  const overallPercent = Math.round((unlockedCount / totalCount) * 100);
  const categories = ['total', 'streak', 'target', 'appel', 'rdv', 'devis', 'commande'];

  const nextUpBadges = badgeDefinitions
    .filter((b) => !isUnlocked(b))
    .map((b) => ({ badge: b, value: getValue(b.category), remaining: b.threshold - getValue(b.category) }))
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3);

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      {newlyUnlocked.length > 0 && (
        <BadgeUnlockModal
          badge={newlyUnlocked[currentUnlockIndex]}
          onClose={handleCloseUnlock}
          onNext={handleNextUnlock}
          remaining={newlyUnlocked.length - currentUnlockIndex - 1}
        />
      )}

      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-white">Badges</h1>
          <p className="text-white/40 text-sm mt-1">Ta collection de badges, débloqués au fil de tes activités</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6" style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}>
          <ProgressRing percent={overallPercent} size={100} />
          <div className="text-center sm:text-left flex-1">
                        <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Collection de badges</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1" style={{ color: '#fff' }}>{unlockedCount}<span className="text-lg font-normal" style={{ color: 'rgba(255,255,255,0.7)' }}> / {totalCount} débloqués</span></p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{stats.streak > 0 ? `Série en cours : ${stats.streak} jour${stats.streak > 1 ? 's' : ''}` : 'Enregistre une activité pour démarrer ta série'}</p>
          </div>
        </div>

        {nextUpBadges.length > 0 && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Prochains à débloquer</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {nextUpBadges.map(({ badge, value }) => (
                <NextUpCard key={badge.id} badge={badge} value={value} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Catégories</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {categories.map((cat) => {
              const active = activeTab === cat;
              const catBadges = badgeDefinitions.filter((b) => b.category === cat);
              const catUnlocked = catBadges.filter(isUnlocked).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all"
                  style={active
                    ? { backgroundColor: `${ACCENT}17`, borderColor: `${ACCENT}80` }
                    : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <svg width="22" height="22" viewBox={categoryIcons[cat]?.viewBox || '0 0 24 24'} style={{ color: active ? ACCENT : 'var(--text-secondary)' }}>
                    {categoryIcons[cat]?.content}
                  </svg>
                  <p className="text-xs font-medium text-center" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{categoryLabels[cat]}</p>
                  <p className="text-[10px]" style={{ color: active ? ACCENT : 'var(--text-muted)' }}>{catUnlocked}/{catBadges.length}</p>
                </button>
              );
            })}
          </div>

          <CategoryExplorer
            cat={activeTab}
            badges={badgeDefinitions.filter((b) => b.category === activeTab)}
            value={getValue(activeTab)}
          />
        </div>

      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default Badges;