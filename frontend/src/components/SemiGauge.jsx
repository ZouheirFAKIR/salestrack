const LOST_COLOR = '#64748b';

function SemiGauge({ percent, color, label, activeCount, lostCount }) {
  const size = 190;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = 72;
  const circumference = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const lostPercent = 100 - clamped;
  const progressLength = (clamped / 100) * circumference;
  const pathD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${cy + 8}`} width={size} height={cy + 8}>
        <path d={pathD} fill="none" stroke={LOST_COLOR} strokeWidth="16" strokeLinecap="round" />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--text-primary)">{Math.round(clamped)}%</text>
        <text x={cx - r} y={cy + 20} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{activeCount}</text>
        <text x={cx + r} y={cy + 20} textAnchor="middle" fontSize="13" fontWeight="700" fill={LOST_COLOR}>{lostCount}</text>
      </svg>
      <p className="text-base font-semibold -mt-1 mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{Math.round(clamped)}% actifs ({activeCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: LOST_COLOR }} />
          <span className="text-sm font-medium" style={{ color: LOST_COLOR }}>{Math.round(lostPercent)}% perdus ({lostCount})</span>
        </div>
      </div>
    </div>
  );
}

export default SemiGauge;