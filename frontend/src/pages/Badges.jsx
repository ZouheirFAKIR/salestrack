import { useEffect, useState, useRef } from 'react';
import Badge from '../components/Badge';
import { icons as categoryIcons } from '../data/icons';
import PageLoader from '../components/PageLoader';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { apiFetch } from '../utils/api';
import { badgeDefinitions, categoryLabels } from '../data/badgeDefinitions';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CATEGORIES = ['total', 'streak', 'target', 'appel', 'rdv', 'devis', 'commande'];

function StatRow({ icon, iconBg, value, label, sub }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{label}{sub ? ` · ${sub}` : ''}</p>
      </div>
    </div>
  );
}

function TrophyRow({ items, onSelect }) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-start gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
      {items.map(({ badge, unlocked }) => (
        <button
          key={badge.id}
          onClick={() => onSelect(badge)}
          className="shrink-0 transition-transform hover:scale-105"
          style={{ width: 92 }}
        >
          <Badge category={badge.category} unlocked={unlocked} value={badge.threshold} label={null} size={60} />
          <p className="text-[11px] font-medium text-center mt-2 leading-tight" style={{ color: 'var(--text-primary)' }}>{badge.label}</p>
        </button>
      ))}
    </div>
  );
}

function BadgeInfoModal({ badge, value, onClose }) {
  const unlocked = value >= badge.threshold;
  const percent = Math.min(Math.round((value / badge.threshold) * 100), 100);
  const remaining = Math.max(badge.threshold - value, 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="rounded-2xl p-6 max-w-xs w-full text-center animate-[fadeIn_0.2s_ease]"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Badge category={badge.category} unlocked={unlocked} value={badge.threshold} label={null} size={100} />
        <p className="text-base font-semibold mt-4" style={{ color: 'var(--text-primary)' }}>{badge.label}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{categoryLabels[badge.category]}</p>

        {unlocked ? (
          <p className="text-sm font-medium mt-4" style={{ color: ACCENT }}>Débloqué 🎉</p>
        ) : (
          <>
            <div className="w-full rounded-full h-2 mt-4" style={{ backgroundColor: 'var(--surface-strong)' }}>
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: ACCENT }} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              {value} / {badge.threshold} — encore {remaining} pour débloquer
            </p>
          </>
        )}

        <button
          onClick={onClose}
          className="text-sm px-5 py-2 rounded-lg font-medium mt-5 transition-all hover:brightness-110"
          style={{ backgroundColor: ACCENT, color: '#fff' }}
        >
          Fermer
        </button>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

function Badges() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seenBadges, setSeenBadges] = useState([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const [currentUnlockIndex, setCurrentUnlockIndex] = useState(0);
  const [activeCat, setActiveCat] = useState(null);
  const [infoBadge, setInfoBadge] = useState(null);
  const gridSectionRef = useRef(null);

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

  const unlockedSorted = badgeDefinitions
    .filter(isUnlocked)
    .map((b) => ({ badge: b, unlocked: true }))
    .sort((a, b) => b.badge.threshold - a.badge.threshold);

  const nextUp = badgeDefinitions
    .filter((b) => !isUnlocked(b))
    .map((b) => ({ badge: b, unlocked: false, remaining: b.threshold - getValue(b.category) }))
    .sort((a, b) => a.remaining - b.remaining);

  const featured = unlockedSorted.length > 0 ? unlockedSorted.slice(0, 6) : nextUp.slice(0, 6);

  const displayedCat = activeCat || 'total';
  const catBadges = [...badgeDefinitions.filter((b) => b.category === displayedCat)].sort((a, b) => a.threshold - b.threshold);
  const catValue = getValue(displayedCat);

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

      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Badges</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Ta collection de trophées, débloqués au fil de tes activités</p>
        </div>

        <div className="rounded-2xl p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Ta progression</p>
            <div className="grid grid-cols-2 gap-4">
              <StatRow
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                iconBg={ACCENT}
                value={`${unlockedCount}/${totalCount}`}
                label="Trophées"
                sub={`${overallPercent}%`}
              />
              <StatRow
                icon={<svg width="16" height="16" viewBox={categoryIcons.streak?.viewBox} style={{ color: '#fff' }}>{categoryIcons.streak?.content}</svg>}
                iconBg="#e0562f"
                value={stats.streak}
                label="Série actuelle"
              />
              <StatRow
                icon={<svg width="16" height="16" viewBox={categoryIcons.target?.viewBox} style={{ color: '#fff' }}>{categoryIcons.target?.content}</svg>}
                iconBg="#c1481c"
                value={stats.targetDays}
                label="Objectifs atteints"
              />
              <StatRow
                icon={<svg width="16" height="16" viewBox={categoryIcons.total?.viewBox} style={{ color: '#fff' }}>{categoryIcons.total?.content}</svg>}
                iconBg="#9c3a16"
                value={stats.total}
                label="Activités totales"
              />
            </div>
          </div>

          <div className="lg:border-l lg:pl-6" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {unlockedSorted.length > 0 ? 'Tes derniers trophées' : 'Prochains à débloquer'}
            </p>
            <TrophyRow items={featured} onSelect={(badge) => setInfoBadge(badge)} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Toutes les catégories</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {CATEGORIES.map((cat) => {
              const active = displayedCat === cat;
              const catCount = badgeDefinitions.filter((b) => b.category === cat).length;
              const catUnlocked = badgeDefinitions.filter((b) => b.category === cat && isUnlocked(b)).length;
              const percent = Math.round((catUnlocked / catCount) * 100);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCat(cat);
                    setTimeout(() => gridSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-95"
                  style={active
                    ? { backgroundColor: `${ACCENT}17`, border: `1.5px solid ${ACCENT}`, boxShadow: `0 2px 14px ${ACCENT}33` }
                    : { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                      style={{ backgroundColor: active ? ACCENT : 'var(--surface-strong)' }}
                    >
                      <svg width="16" height="16" viewBox={categoryIcons[cat]?.viewBox || '0 0 24 24'} style={{ color: active ? '#fff' : 'var(--text-secondary)' }}>
                        {categoryIcons[cat]?.content}
                      </svg>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: active ? ACCENT : 'var(--text-muted)' }}>{catUnlocked}/{catCount}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{categoryLabels[cat]}</p>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--surface-strong)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${percent}%`, backgroundColor: active ? ACCENT : 'var(--text-muted)' }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div ref={gridSectionRef} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
              {catBadges.map((b) => (
                <button key={b.id} onClick={() => setInfoBadge(b)} className="transition-transform hover:scale-105">
                  <Badge category={b.category} unlocked={catValue >= b.threshold} value={b.threshold} label={null} size={56} />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {infoBadge && (
        <BadgeInfoModal
          badge={infoBadge}
          value={getValue(infoBadge.category)}
          onClose={() => setInfoBadge(null)}
        />
      )}
    </div>
  );
}

export default Badges;