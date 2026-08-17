import { useEffect, useState } from 'react';
import Badge from './Badge';
import PageLoader from './PageLoader';
import { apiFetch } from '../utils/api';
import { badgeDefinitions, categoryLabels } from '../data/badgeDefinitions';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    <div className="flex flex-col gap-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">Collection de badges</p>
          <p className="text-white/40 text-xs mt-0.5">Débloque-les en enregistrant tes activités</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold" style={{ color: ACCENT }}>{unlockedCount}</p>
          <p className="text-white/40 text-xs">sur {badgeDefinitions.length}</p>
        </div>
      </div>

      {categories.map((cat) => {
        const badges = badgeDefinitions.filter((b) => b.category === cat);
        const value = getValue(cat);
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/70">{categoryLabels[cat]}</p>
              <span className="text-xs text-white/40">{value}</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {badges.map((b) => (
                <Badge key={b.id} category={b.category} unlocked={isUnlocked(b)} label={b.label} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BadgesGrid;