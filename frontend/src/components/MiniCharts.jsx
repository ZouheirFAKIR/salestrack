// Petits graphiques variés pour les répartitions (à la place des camemberts)

const boxStyle = { backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' };

function pct(v, total) {
  return total > 0 ? Math.round((v / total) * 100) : 0;
}

function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('fr-FR');
}

function Box({ title, subtitle, children }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 h-full min-w-0" style={boxStyle}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Legend({ parts, total }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {parts.map((p) => (
        <li key={p.label} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
          <span className="flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
          <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(p.value)}</b>
          <span className="w-10 text-right" style={{ color: 'var(--text-muted)' }}>{pct(p.value, total)}%</span>
        </li>
      ))}
    </ul>
  );
}

// 1. Barre empilée : un grand pourcentage + une barre horizontale partagée
export function SplitBarCard({ title, subtitle, parts, unit, footer }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const main = parts[0];
  return (
    <Box title={title} subtitle={subtitle}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>
        {total > 0 && (
          <span className="ml-auto text-sm font-semibold" style={{ color: main.color }}>
            {pct(main.value, total)}% {main.label.toLowerCase()}
          </span>
        )}
      </div>
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => (
          <span
            key={p.label}
            className="h-full transition-[flex-grow] duration-700"
            style={{ flex: `${p.value} 1 0`, backgroundColor: p.color, minWidth: 4 }}
          />
        ))}
      </div>
      <Legend parts={parts} total={total} />
      {footer}
    </Box>
  );
}

// 2. Jauge en demi-cercle : un taux (ex. taux de réponse)
export function GaugeCard({ title, subtitle, parts, rateLabel }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const main = parts[0];
  const rate = pct(main.value, total);
  const r = 70;
  const cx = 90;
  const cy = 86;
  const arc = Math.PI * r;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const restColor = parts[1]?.color || 'var(--border)';

  return (
    <Box title={title} subtitle={subtitle}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 180 96" className="w-40 shrink-0">
          <path d={path} fill="none" stroke={total > 0 ? restColor : 'var(--border)'} strokeWidth="14" strokeLinecap="round" opacity="0.85" />
          {total > 0 && (
            <path
              d={path}
              fill="none"
              stroke={main.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(rate / 100) * arc} ${arc}`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          )}
          <text x={cx} y={cy - 14} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text-primary)">{rate}%</text>
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{rateLabel}</text>
        </svg>
        <div className="flex-1 min-w-0">
          <Legend parts={parts} total={total} />
        </div>
      </div>
    </Box>
  );
}

// 3. Points : un point par élément (lisible pour de petits nombres, ex. RDV)
export function DotsCard({ title, subtitle, parts, unit }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const max = 60;
  const step = total > max ? Math.ceil(total / max) : 1;
  const dots = [];
  parts.forEach((p) => {
    const n = Math.round(p.value / step);
    for (let i = 0; i < n; i++) dots.push(p.color);
  });

  return (
    <Box title={title} subtitle={subtitle}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      {total === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun sur la période</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {dots.map((c, i) => (
            <span key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      )}
      {step > 1 && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>1 point = {step} {unit}</p>}
      <Legend parts={parts} total={total} />
    </Box>
  );
}

// 4. Barres horizontales : une barre par étape (ex. pipeline)
export function StageBarsCard({ title, subtitle, stages, extra, footer }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const total = stages.reduce((s, x) => s + x.value, 0);
  return (
    <Box title={title} subtitle={subtitle}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ouvertes</span>
        {extra && <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{extra}</span>}
      </div>
      {stages.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune opportunité ouverte</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stages.map((s) => (
            <li key={s.label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-xs">
              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <span className="h-2.5 rounded-r-full transition-[width] duration-700" style={{ width: `${Math.max((s.value / max) * 100, 3)}%`, backgroundColor: s.color }} />
              <b className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(s.value)}</b>
            </li>
          ))}
        </ul>
      )}
      {footer}
    </Box>
  );
}