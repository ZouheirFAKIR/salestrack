const PALETTE = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#0891b2', '#be185d', '#65a30d'];

function StackedBarChart({ data, keys, labelKey = 'jour', formatLabel, colors, labels }) {
  if (!data || data.length === 0) return null;

  const COLORS = colors || keys.reduce((acc, k, i) => ({ ...acc, [k]: PALETTE[i % PALETTE.length] }), {});
  const LABELS = labels || keys.reduce((acc, k) => ({ ...acc, [k]: k }), {});

  const width = 600;
  const height = 160;
  const padding = 30;
  const gap = 8;

  const totals = data.map((d) => keys.reduce((sum, k) => sum + Number(d[k] || 0), 0));
  const rawMax = Math.max(...totals, 1);
  const max = Math.ceil(rawMax / 5) * 5 || 5;

  const chartWidth = width - padding * 2;
  const barWidth = Math.max((chartWidth - gap * (data.length - 1)) / data.length, 4);

  const defaultFormat = (v) => new Date(v).toLocaleDateString('fr-FR', { weekday: 'short' });
  const getLabel = formatLabel || defaultFormat;
  const yTicks = [0, Math.round(max / 2), max];

  return (
    <div className="w-full" style={{ height: '240px' }}>
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

        {data.map((d, di) => {
          const x = padding + di * (barWidth + gap);
          let cumulative = 0;
          return (
            <g key={di}>
              {keys.map((k, ki) => {
                const val = Number(d[k] || 0);
                if (val === 0) return null;
                const barHeight = (val / max) * (height - padding * 2);
                const y = height - padding - cumulative - barHeight;
                cumulative += barHeight;
                return (
                  <rect
                    key={k}
                    x={x} y={y} width={barWidth} height={barHeight}
                    fill={COLORS[k]}
                    rx={2}
                    style={{ opacity: 0, animation: `barFadeIn 0.5s ease ${di * 0.04 + ki * 0.02}s forwards` }}
                  >
                    <title>{`${LABELS[k]}: ${val}`}</title>
                  </rect>
                );
              })}
              <text x={x + barWidth / 2} y={height + 22} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
                {getLabel(d[labelKey])}
              </text>
            </g>
          );
        })}
      </svg>

      <style>{`@keyframes barFadeIn { to { opacity: 1; } }`}</style>
    </div>
  );
}

export default StackedBarChart;