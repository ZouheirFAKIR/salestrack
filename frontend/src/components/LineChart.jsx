const ACCENT = '#f86635';

function LineChart({ data, target, labelKey = 'jour', formatLabel }) {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 160;
  const padding = 30;
  const values = data.map((d) => Number(d.total));
  const rawMax = Math.max(...values, target || 0, 1);
  const max = Math.ceil(rawMax / 5) * 5 || 5;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (Number(d.total) / max) * (height - padding * 2);
    return { x, y, total: Number(d.total) };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  const defaultFormat = (dateStr) => new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short' });
  const getLabel = formatLabel || defaultFormat;
  const yTicks = [0, Math.round(max / 2), max];

  const targetY = target != null ? height - padding - (Math.min(target, max) / max) * (height - padding * 2) : null;

  return (
    <div className="w-full" style={{ height: '200px' }}>
      <svg viewBox={`0 0 ${width} ${height + 30}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.4" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => {
          const y = height - padding - (t / max) * (height - padding * 2);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{t}</text>
            </g>
          );
        })}

        {targetY != null && (
          <g>
            <line
              x1={padding} y1={targetY} x2={width - padding} y2={targetY}
              stroke="#86efac" strokeWidth="1.5" strokeDasharray="5 4"
            />
            <text x={width - padding} y={targetY - 6} textAnchor="end" fontSize="10" fill="#86efac">
              Objectif : {target}
            </text>
          </g>
        )}

        <path d={areaPath} fill="url(#areaGradient)" />
        <path
          d={linePath} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: 'drawLine 1s ease forwards' }}
        />

        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r="10" fill="transparent" className="cursor-pointer" />
            <circle cx={p.x} cy={p.y} r="4" fill={ACCENT} stroke="var(--bg)" strokeWidth="2" style={{ animation: `popIn 0.3s ease ${0.6 + i * 0.05}s both` }} />
            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="11" fill="var(--text-primary)" className="opacity-0 group-hover:opacity-100 transition-opacity">{p.total}</text>
            <text x={p.x} y={height + 22} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{getLabel(data[i][labelKey])}</text>
          </g>
        ))}
      </svg>
      <style>{`
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes popIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

export default LineChart;