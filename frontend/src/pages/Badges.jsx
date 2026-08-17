import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import PageLoader from '../components/PageLoader';
import { apiFetch } from '../utils/api';
import { badgeDefinitions, categoryLabels } from '../data/badgeDefinitions';
import BadgeUnlockModal from '../components/BadgeUnlockModal';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const [seenBadges, setSeenBadges] = useState([]);
const [newlyUnlocked, setNewlyUnlocked] = useState([]);
const [currentUnlockIndex, setCurrentUnlockIndex] = useState(0);


function CategorySection({ cat, badges, value, index }) {
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
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-5"
      style={{ animation: `fadeIn 0.4s ease ${index * 0.06}s both` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">{categoryLabels[cat]}</p>
          <p className="text-[11px] text-white/35 mt-0.5">{unlockedInCat}/{sorted.length} débloqués</p>
        </div>
        <span className="text-lg font-semibold text-white">{value}</span>
      </div>

      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/[0.06]">
        <Badge category={cat} unlocked={!!currentBadge} label={null} size={60} />
        <div className="flex-1">
          <p className="text-sm text-white font-medium">{focusBadge.label}</p>
          {nextBadge ? (
            <>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%`, backgroundColor: ACCENT }}
                />
              </div>
              <p className="text-[11px] text-white/40 mt-1.5">{value} / {nextBadge.threshold}</p>
            </>
          ) : (
            <p className="text-[11px] mt-1.5" style={{ color: ACCENT }}>Tous les paliers débloqués 🎉</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {sorted.map((b) => (
          <Badge key={b.id} category={b.category} unlocked={value >= b.threshold} label={b.threshold} size={44} />
        ))}
      </div>
    </div>
  );
}

function Badges() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    });
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

  {newlyUnlocked.length > 0 && (
  <BadgeUnlockModal
    badge={newlyUnlocked[currentUnlockIndex]}
    onClose={handleCloseUnlock}
    onNext={handleNextUnlock}
    remaining={newlyUnlocked.length - currentUnlockIndex - 1}
  />
)}

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}>
          <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Collection de badges</p>
          <p className="text-white text-4xl font-semibold">{unlockedCount}<span className="text-lg text-white/70"> / {totalCount}</span></p>
          <div className="w-full max-w-xs mx-auto bg-white/25 rounded-full h-2 mt-4">
            <div className="h-2 rounded-full bg-white transition-all duration-700" style={{ width: `${overallPercent}%` }} />
          </div>
          <p className="text-white/70 text-xs mt-2">{overallPercent}% de la collection débloquée</p>
        </div>

        {categories.map((cat, i) => (
          <CategorySection
            key={cat}
            cat={cat}
            badges={badgeDefinitions.filter((b) => b.category === cat)}
            value={getValue(cat)}
            index={i}
          />
        ))}

      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default Badges;