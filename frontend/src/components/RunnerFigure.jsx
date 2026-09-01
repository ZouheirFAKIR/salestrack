function RunnerFigure({ color = '#f86635', size = 48, victory = false, delay = 0, skinTone = '#f2c9a1', hairColor = '#2d1b0e' }) {
  const shadeColor = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
  };
  const shirtDark = shadeColor(color, -40);
  const shirtLight = shadeColor(color, 30);

  return (
    <svg viewBox="0 0 44 70" width={size} height={size * 1.6} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`shirt-${color}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shirtLight} />
          <stop offset="100%" stopColor={shirtDark} />
        </linearGradient>
        <radialGradient id={`skin-${color}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={shadeColor(skinTone, 15)} />
          <stop offset="100%" stopColor={skinTone} />
        </radialGradient>
      </defs>

      <ellipse cx="22" cy="66" rx="12" ry="3" fill="rgba(0,0,0,0.3)" />

      {!victory ? (
        <g className="runner-cycle" style={{ animationDelay: `${delay}s` }}>
          <g className="bob">
            <rect className="leg leg-back" x="17" y="38" width="6" height="19" rx="3" fill="#111721" style={{ transformOrigin: '20px 38px' }} />
            <ellipse className="shoe shoe-back" cx="19" cy="56" rx="4.5" ry="2.3" fill="#e8e8e8" style={{ transformOrigin: '19px 56px' }} />
            <rect className="leg leg-front" x="22" y="38" width="6" height="19" rx="3" fill="#232c3d" style={{ transformOrigin: '25px 38px' }} />
            <ellipse className="shoe shoe-front" cx="27" cy="56" rx="4.5" ry="2.3" fill="#f4f4f4" style={{ transformOrigin: '27px 56px' }} />
            <rect className="arm arm-back" x="10" y="23" width="5" height="16" rx="2.5" fill={`url(#skin-${color})`} style={{ transformOrigin: '12.5px 24px' }} />
            <rect x="14" y="19" width="16" height="22" rx="6" fill={`url(#shirt-${color})`} />
            <path d="M18 19 L22 24 L26 19" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <rect className="arm arm-front" x="29" y="23" width="5" height="16" rx="2.5" fill={`url(#skin-${color})`} style={{ transformOrigin: '31.5px 24px' }} />
            <circle cx="22" cy="11" r="9" fill={`url(#skin-${color})`} />
            <path d={`M13 9 Q22 -3 31 9 Q31 3 22 2 Q13 3 13 9Z`} fill={hairColor} />
            <ellipse cx="17.5" cy="10.5" rx="0.9" ry="1.4" fill="#1a202c" />
            <ellipse cx="26.5" cy="10.5" rx="0.9" ry="1.4" fill="#1a202c" />
            <circle cx="16" cy="13.5" r="1.6" fill="#f4a582" opacity="0.55" />
            <circle cx="28" cy="13.5" r="1.6" fill="#f4a582" opacity="0.55" />
            <path d="M18.5 16 Q22 18.5 25.5 16" stroke="#8a4a2f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </g>
          <g className="dust" style={{ transformOrigin: '19px 58px' }}>
            <circle cx="14" cy="58" r="2" fill="rgba(255,255,255,0.35)" />
            <circle cx="10" cy="59" r="1.3" fill="rgba(255,255,255,0.25)" />
            <circle cx="6" cy="57" r="1" fill="rgba(255,255,255,0.2)" />
          </g>
        </g>
      ) : (
        <g>
          <rect x="8" y="16" width="5" height="16" rx="2.5" fill={`url(#skin-${color})`} transform="rotate(-55 10.5 32)" />
          <rect x="14" y="19" width="16" height="22" rx="6" fill={`url(#shirt-${color})`} />
          <path d="M18 19 L22 24 L26 19" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <rect x="31" y="16" width="5" height="16" rx="2.5" fill={`url(#skin-${color})`} transform="rotate(55 33.5 32)" />
          <rect x="17" y="38" width="6" height="19" rx="3" fill="#111721" />
          <ellipse cx="19" cy="56" rx="4.5" ry="2.3" fill="#e8e8e8" />
          <rect x="22" y="38" width="6" height="19" rx="3" fill="#232c3d" />
          <ellipse cx="27" cy="56" rx="4.5" ry="2.3" fill="#f4f4f4" />
          <circle cx="22" cy="11" r="9" fill={`url(#skin-${color})`} />
          <path d={`M13 9 Q22 -3 31 9 Q31 3 22 2 Q13 3 13 9Z`} fill={hairColor} />
          <path d="M17.5 10.5 Q18.5 8.3 19.5 10.5" stroke="#1a202c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M24.5 10.5 Q25.5 8.3 26.5 10.5" stroke="#1a202c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M18 16 Q22 20.5 26 16" stroke="#8a4a2f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="22" cy="4" r="4.5" fill="#ffd700" stroke="#e6a800" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}

export default RunnerFigure;