const ACCENT = '#f86635';

import { icons as sharedIcons } from '../data/icons';

function Badge({ category, unlocked, value, label, size = 72 }) {
  const iconDef = sharedIcons[category];
  const iconSize = size * 0.19;
  const valueFontSize = size * (value != null && String(value).length > 2 ? 0.24 : 0.3);
  const HEX_CLIP = 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)';

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="relative flex flex-col items-center justify-center mx-auto transition-transform duration-300 hover:scale-105"
        style={{
          width: size,
          height: size * 1.06,
          clipPath: HEX_CLIP,
          background: 'linear-gradient(155deg, #1c3f52, #0f2436 60%, #081420)',
          border: `2px solid ${ACCENT}`,
          boxShadow: unlocked ? `0 0 14px ${ACCENT}55` : 'none',
          filter: unlocked ? 'none' : 'grayscale(1) brightness(0.65)',
          opacity: unlocked ? 1 : 0.7,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ clipPath: HEX_CLIP, background: 'linear-gradient(155deg, rgba(255,255,255,0.16), transparent 45%)' }}
        />

        {iconDef && (
          <svg width={iconSize} height={iconSize} viewBox={iconDef.viewBox} style={{ color: ACCENT, marginBottom: size * 0.02 }}>
            {iconDef.content}
          </svg>
        )}
        {value !== undefined && value !== null && (
          <span style={{ fontSize: valueFontSize, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {value}
          </span>
        )}
      </div>
      {label !== null && label !== undefined && (
        <p style={{ fontSize: 11, color: unlocked ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: 8, fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </p>
      )}
    </div>
  );
}

export default Badge;