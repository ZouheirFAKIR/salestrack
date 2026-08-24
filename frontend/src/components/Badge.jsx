const ACCENT = '#f86635';

import { icons as sharedIcons } from '../data/icons';

function Badge({ category, unlocked, label, size = 72 }) {
  const iconSize = size * 0.52;
  const iconDef = sharedIcons[category];

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="relative flex items-center justify-center mx-auto transition-all duration-300"
        style={{
          width: size,
          height: size * 1.05,
          clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
          background: unlocked ? `linear-gradient(155deg, #ffab74, ${ACCENT} 45%, #c9501f)` : 'var(--surface-strong)',
          border: unlocked ? 'none' : '1px solid var(--border)',
          boxShadow: unlocked ? `0 0 18px ${ACCENT}4d` : 'none',
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox={iconDef?.viewBox || '0 0 24 24'} style={{ color: unlocked ? '#fff' : 'var(--text-muted)' }}>
          {iconDef?.content}
        </svg>
      </div>
      {label !== null && label !== undefined && (
        <p style={{ fontSize: 10, color: unlocked ? '#fff' : 'var(--text-secondary)', marginTop: 7, fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </p>
      )}
    </div>
  );
}

export default Badge;