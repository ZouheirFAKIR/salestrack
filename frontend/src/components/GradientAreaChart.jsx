const DEVIS_COLOR = '#f86635';
const COMMANDE_COLOR = '#3fb8e8';

function roundedTopRectPath(x, y, width, height, radius) {
  if (height <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return `M ${x} ${y + height}
          L ${x} ${y + r}
          Q ${x} ${y} ${x + r} ${y}
          L ${x + width - r} ${y}
          Q ${x + width} ${y} ${x + width} ${y + r}
          L ${x + width} ${y + height}
          Z`;
}

function GradientAreaChart({ data, labelKey = 'periode', formatLabel }) {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 200;
  const padding = { top: 24, right: 16, bottom: 28, left: 16 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.devis || 0, d.commande || 0]), 1);
  const max = Math.ceil(maxVal / 5) * 5 || 5;

  const groupGap = 20;
  const groupWidth = Math.max((chartWidth - groupGap * (data.length - 1)) / data.length, 20);
  const barGap = 4;
  const barWidth = Math.min((groupWidth - barGap) / 2, 20);
  const groupContentWidth = barWidth * 2 + barGap;
  const groupOffset = (groupWidth - groupContentWidth) / 2;

  const lastIndex = data.length - 1;
  const baseY = padding.top + chartHeight;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DEVIS_COLOR }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Devis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COMMANDE_COLOR }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Commandes</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '220px' }} preserveAspectRatio="xMidYMid meet">
        <line x1={padding.left} y1={baseY} x2={width - padding.right} y2={baseY} stroke="var(--border)" strokeWidth="1" />

        {data.map((d, i) => {
          const gx = padding.left + i * (groupWidth + groupGap) + groupOffset;
          const devisVal = d.devis || 0;
          const commandeVal = d.commande || 0;
          const devisH = (devisVal / max) * chartHeight;
          const commandeH = (commandeVal / max) * chartHeight;
          const isToday = i === lastIndex;

          return (
            <g key={i} style={{ opacity: 0, animation: `barRise 0.4s ease ${i * 0.04}s forwards` }}>
              {devisVal > 0 ? (
                <>
                  <path d={roundedTopRectPath(gx, baseY - devisH, barWidth, devisH, 4)} fill={DEVIS_COLOR} />
                  <text x={gx + barWidth / 2} y={baseY - devisH - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill={DEVIS_COLOR}>{devisVal}</text>
                </>
              ) : (
                <line x1={gx} y1={baseY} x2={gx + barWidth} y2={baseY} stroke="var(--border)" strokeWidth="2" />
              )}

              {commandeVal > 0 ? (
                <>
                  <path d={roundedTopRectPath(gx + barWidth + barGap, baseY - commandeH, barWidth, commandeH, 4)} fill={COMMANDE_COLOR} />
                  <text x={gx + barWidth + barGap + barWidth / 2} y={baseY - commandeH - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill={COMMANDE_COLOR}>{commandeVal}</text>
                </>
              ) : (
                <line x1={gx + barWidth + barGap} y1={baseY} x2={gx + barWidth + barGap + barWidth} y2={baseY} stroke="var(--border)" strokeWidth="2" />
              )}

              <text x={gx + groupContentWidth / 2} y={height - 8} textAnchor="middle" fontSize="10" fontWeight={isToday ? '700' : '400'} fill={isToday ? 'var(--text-primary)' : 'var(--text-secondary)'}>
                {formatLabel ? formatLabel(d[labelKey]) : d[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes barRise {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default GradientAreaChart;