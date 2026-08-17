const ACCENT = '#f86635';

const icons = {
  appel: (color) => (
    <path d="M28 30 Q28 26 32 26 L36 26 Q39 26 40 29 L42 35 Q43 38 40 40 Q42 46 48 48 Q50 45 53 46 L58 48 Q61 49 60 52 L58 56 Q56 60 51 59 Q35 55 30 39 Q28 34 28 30 Z" fill={color} />
  ),
  rdv: (color) => (
    <>
      <rect x="24" y="28" width="30" height="26" rx="3" fill="none" stroke={color} strokeWidth="3" />
      <line x1="24" y1="36" x2="54" y2="36" stroke={color} strokeWidth="3" />
      <circle cx="32" cy="44" r="2.5" fill={color} />
      <circle cx="40" cy="44" r="2.5" fill={color} />
      <circle cx="46" cy="44" r="2.5" fill={color} />
    </>
  ),
  devis: (color) => (
    <>
      <path d="M28 24 L44 24 L52 32 L52 56 L28 56 Z" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 24 L44 32 L52 32" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <line x1="33" y1="42" x2="47" y2="42" stroke={color} strokeWidth="2.5" />
      <line x1="33" y1="48" x2="47" y2="48" stroke={color} strokeWidth="2.5" />
    </>
  ),
  commande: (color) => (
    <>
      <path d="M26 32 L54 32 L51 58 L29 58 Z" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 32 Q32 22 40 22 Q48 22 48 32" fill="none" stroke={color} strokeWidth="3" />
    </>
  ),
  total: (color) => (
    <path d="M39 26 L44 37 L55 38 L47 46 L49 57 L39 51 L29 57 L31 46 L23 38 L34 37 Z" fill={color} />
  ),
  streak: (color, bgColor) => (
    <>
      <path d="M39 24 C44 32 50 34 50 42 C50 50 45 55 39 55 C33 55 28 50 28 42 C28 34 34 32 39 24 Z" fill={color} />
      <path d="M39 35 C41 39 44 41 44 45 C44 48 42 51 39 51 C36 51 34 48 34 45 C34 41 37 39 39 35 Z" fill={bgColor} />
    </>
  ),
  target: (color) => (
    <path d="M28 41 L36 49 L52 30" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

function Badge({ category, unlocked, label, size = 72 }) {
  const color = unlocked ? ACCENT : '#454545';
  const bgColor = unlocked ? '#1a1a1a' : '#161616';
  const borderColor = unlocked ? ACCENT : '#3a3a3a';
  const iconFn = icons[category];

  return (
    <div style={{ textAlign: 'center', opacity: unlocked ? 1 : 0.55 }}>
      <svg width={size} height={size * 1.13} viewBox="0 0 78 88">
        <path d="M39 3 L71 17 L71 49 Q71 69 39 84 Q7 69 7 49 L7 17 Z" fill={bgColor} stroke={borderColor} strokeWidth="1.5" />
        <circle cx="39" cy="41" r="20" fill="none" stroke={borderColor} strokeWidth="1.5" opacity="0.5" />
        {iconFn ? iconFn(color, bgColor) : null}
      </svg>
      {label && (
        <p style={{ fontSize: 10, color: unlocked ? '#fff' : 'rgba(255,255,255,0.35)', marginTop: 6, fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </p>
      )}
    </div>
  );
}

export default Badge;