const PALETTE = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899'];

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, endAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    'M', outerStart.x, outerStart.y,
    'A', rOuter, rOuter, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    'L', innerEnd.x, innerEnd.y,
    'A', rInner, rInner, 0, largeArc, 1, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

function SimplePieChart({ slices }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Aucune donnée sur cette période</p>;
  }

  const cx = 100;
  const cy = 100;
  const rOuter = 90;
  const rInner = 55;

  let cursor = 0;
  const arcs = slices
    .map((s, i) => ({ ...s, color: s.color || PALETTE[i % PALETTE.length] }))
    .filter((s) => s.value > 0)
    .map((s) => {
      const angle = (s.value / total) * 360;
      const start = cursor;
      const end = cursor + angle;
      cursor = end;
      return { ...s, path: describeArc(cx, cy, rOuter, rInner, start, end) };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
        <svg viewBox="0 0 200 200" width="180" height="180">
          {arcs.map((a, i) => (
            <path key={a.key || i} d={a.path} fill={a.color} style={{ opacity: 0, animation: `sliceFadeIn 0.4s ease ${i * 0.06}s forwards` }} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{total}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>total</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {slices.map((s, i) => {
          const color = s.color || PALETTE[i % PALETTE.length];
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.key || i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes sliceFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default SimplePieChart;