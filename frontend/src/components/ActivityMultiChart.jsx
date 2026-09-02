const DEFAULT_COLORS = {
  appel: '#f86635',
  rdv: '#3fb8e8',
  devis: '#a78bfa',
  commande: '#22c55e',
};

const DEFAULT_LABELS = {
  appel: 'Appels',
  rdv: 'Rendez-vous',
  devis: 'Devis',
  commande: 'Commandes',
};

const PALETTE = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#0891b2', '#be185d', '#65a30d'];

function ActivityMultiChart({ data, keys = ['appel', 'rdv', 'devis', 'commande'], labelKey = 'jour', formatLabel, colors, labels }) {
  if (!data || data.length === 0) return null;

  const COLORS = colors || keys.reduce((acc, k, i) => ({ ...acc, [k]: DEFAULT_COLORS[k] || PALETTE[i % PALETTE.length] }), {});
  const LABELS = labels || DEFAULT_LABELS;

  const width = 600;
  const height = 160;
  const padding = 30;

  const allValues = data.flatMap((d) => keys.map((k) => Number(d[k] || 0)));
  const rawMax = Math.max(...allValues, 1);
  const max = Math.ceil(rawMax / 5) * 5 || 5;

  const getPoints = (key) =>
    data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (Number(d[key] || 0) / max) * (height - padding * 2);
      return { x, y, value: Number(d[key] || 0) };
    });

  const defaultFormat = (dateStr) => new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short' });
  const getLabel = formatLabel || defaultFormat;
  const yTicks = [0, Math.round(max / 2), max];

  return (
    <div className="w-full" style={{ height: '220px' }}>
      <div className="flex items-center gap-3 mb-2 px-1 flex-wrap">
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[k] }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{LABELS[k]}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height + 30}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t, i) => {
          const y = height - padding - (t / max) * (height - padding * 2);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{t}</text>
            </g>
          );
        })}

        {keys.map((key, keyIndex) => {
          const points = getPoints(key);
          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          return (
            <g key={key}>
              <path
                d={linePath} fill="none" stroke={COLORS[key]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: `drawLine 1s ease ${keyIndex * 0.15}s forwards` }}
              />
              {points.map((p, i) => (
                <g key={i} className="group">
                  <circle cx={p.x} cy={p.y} r="8" fill="transparent" className="cursor-pointer" />
                  <circle cx={p.x} cy={p.y} r="3.5" fill={COLORS[key]} stroke="var(--bg)" strokeWidth="2" style={{ animation: `popIn 0.3s ease ${0.6 + i * 0.05}s both` }} />
                  <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fill="var(--text-primary)" className="opacity-0 group-hover:opacity-100 transition-opacity">{p.value}</text>
                </g>
              ))}
            </g>
          );
        })}

        {data.map((d, i) => {
          const step = Math.ceil(data.length / 8);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = padding + (i / (data.length - 1)) * (width - padding * 2);
          return (
            <text key={i} x={x} y={height + 22} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
              {getLabel(d[labelKey])}
            </text>
          );
        })}
      </svg>

      <style>{`
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes popIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

export default ActivityMultiChart;