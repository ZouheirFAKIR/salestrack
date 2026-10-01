const R = 42;
const C = 2 * Math.PI * R;

function PieChart({ title, subtitle, data, centerLabel = 'total' }) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  let offset = 0;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth="14" />
            {total > 0 && items.map((d) => {
              const len = (d.value / total) * C;
              const gap = items.length > 1 ? 1.5 : 0;
              const slice = (
                <circle
                  key={d.label}
                  cx="50" cy="50" r={R} fill="none" stroke={d.color} strokeWidth="14"
                  strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
                  strokeDashoffset={-offset}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                >
                  <title>{`${d.label} : ${d.value} (${Math.round((d.value / total) * 100)}%)`}</title>
                </circle>
              );
              offset += len;
              return slice;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{total}</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{centerLabel}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
              <span className="w-9 text-right" style={{ color: 'var(--text-muted)' }}>
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PieChart;