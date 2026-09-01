import { useId } from 'react';

function SwimmerAvatar({ color = '#f86635', photoUrl, size = 48 }) {
  const clipId = `swim-${useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="0 0 60 82" width={size} height={size * 1.35} style={{ overflow: 'visible' }}>
      {/* bras arrière */}
      <ellipse cx="10" cy="42" rx="7" ry="11" fill={color} transform="rotate(-25 10 42)" />
      {/* jambes */}
      <ellipse cx="22" cy="72" rx="7" ry="6" fill="#2d3748" />
      <ellipse cx="38" cy="74" rx="7" ry="6" fill="#2d3748" />
      {/* pieds */}
      <ellipse cx="20" cy="76" rx="9" ry="4" fill="#1a202c" />
      <ellipse cx="40" cy="78" rx="9" ry="4" fill="#1a202c" />
      {/* corps / t-shirt */}
      <path d="M15 30 Q30 20 45 30 L47 58 Q30 68 13 58 Z" fill={color} />
      {/* col */}
      <path d="M22 30 Q30 36 38 30 L36 26 Q30 30 24 26 Z" fill="rgba(255,255,255,0.35)" />
      {/* bras avant */}
      <ellipse cx="50" cy="42" rx="7" ry="11" fill={color} transform="rotate(25 50 42)" />
      {/* cou */}
      <rect x="26" y="18" width="8" height="8" rx="3" fill="#f2c9a1" />
      {/* tête */}
      <circle cx="30" cy="14" r="14" fill="#f2c9a1" />
      {/* cheveux */}
      <path d="M17 10 Q30 -2 43 10 Q43 4 30 3 Q17 4 17 10Z" fill="#3a2a1a" />

      {photoUrl ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx="30" cy="15" r="10" />
            </clipPath>
          </defs>
          <image href={photoUrl} x="20" y="5" width="20" height="20" clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <>
          <circle cx="25" cy="14" r="1.6" fill="#2d3748" />
          <circle cx="35" cy="14" r="1.6" fill="#2d3748" />
          <path d="M25 19 Q30 22 35 19" stroke="#2d3748" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default SwimmerAvatar;