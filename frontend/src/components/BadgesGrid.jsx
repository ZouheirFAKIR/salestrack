import { useEffect, useState } from 'react';
import Badge from './Badge';
import PageLoader from './PageLoader';
import { apiFetch } from '../utils/api';
import { badgeDefinitions, categoryLabels } from '../data/badgeDefinitions';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CategoryRow({ cat, badges, value }) {
  const sorted = [...badges].sort((a, b) => a.threshold - b.threshold);
  const nextBadge = sorted.find((b) => value < b.threshold);
  const currentBadge = [...sorted].reverse().find((b) => value >= b.threshold);
  const focusBadge = nextBadge || sorted[sorted.length - 1];
  const prevThreshold = currentBadge ? currentBadge.threshold : 0;
  const progressPercent = nextBadge
    ? Math.min(Math.round(((value - prevThreshold) / (nextBadge.threshold - prevThreshold)) * 100), 100)
    : 100;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white/70">{categoryLabels[cat]}</p>
        <span className="text-xs text-white/40">{value}</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Badge category={cat} unlocked={!nextBadge || value >= 0 && currentBadge} label={null} size={56} />
        <div className="flex-1">
          <p className="text-sm text-white font-medium">{focusBadge.label}</p>
          {nextBadge ? (
            <>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%`, backgroundColor: ACCENT }}
                />
              </div>
              <p className="text-[11px] text-white/40 mt-1">{value} / {nextBadge.threshold}</p>
            </>
          ) : (
            <p className="text-[11px] mt-1" style={{ color: ACCENT }}>Tous les paliers débloqués</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {sorted.map((b) => (
          <div key={b.id} className="shrink-0">
            <Badge category={b.category} unlocked={value >= b.threshold} label={null} size={40} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgesGrid() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/activities/badge-stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

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
  const categories = ['appel', 'rdv', 'devis', 'commande', 'total', 'streak', 'target'];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5  flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Collection de badges</p>
          <p className="text-white/40 text-xs mt-0.5">Débloque-les en enregistrant tes activités</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold" style={{ color: ACCENT }}>{unlockedCount}</p>
          <p className="text-white/40 text-xs">sur {badgeDefinitions.length}</p>
        </div>
      </div>

      {categories.map((cat) => (
        <CategoryRow
          key={cat}
          cat={cat}
          badges={badgeDefinitions.filter((b) => b.category === cat)}
          value={getValue(cat)}
        />
      ))}
    </div>
  );
}

export default BadgesGrid;