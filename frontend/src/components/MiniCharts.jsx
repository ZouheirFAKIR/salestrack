// Petits graphiques variés pour les répartitions (à la place des camemberts)

const boxStyle = { backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' };
const SOFT = 'rgba(255,255,255,0.72)';
const FAINT = 'rgba(255,255,255,0.5)';

function pct(v, total) {
  return total > 0 ? Math.round((v / total) * 100) : 0;
}

function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('fr-FR');
}

function Box({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 h-full min-w-0" style={boxStyle}>
      <div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: FAINT }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Legend({ parts, total }) {
  return (
    <ul className="flex flex-col gap-2">
      {parts.map((p) => (
        <li key={p.label} className="flex items-center gap-2.5 text-sm">
          <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: p.color }} />
          <span className="flex-1 truncate" style={{ color: SOFT }}>{p.label}</span>
          <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(p.value)}</b>
          <span className="w-12 text-right" style={{ color: FAINT }}>{pct(p.value, total)}%</span>
        </li>
      ))}
    </ul>
  );
}

function BigNumber({ value, unit, right }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <span className="text-sm" style={{ color: FAINT }}>{unit}</span>
      {right}
    </div>
  );
}

// 1. Barre empilée : un grand pourcentage + une barre horizontale partagée
export function SplitBarCard({ title, subtitle, parts, unit, footer }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const main = parts[0];
  return (
    <Box title={title} subtitle={subtitle}>
      <BigNumber
        value={fmt(total)}
        unit={unit}
        right={total > 0 && (
          <span className="ml-auto text-base font-bold" style={{ color: main.color }}>
            {pct(main.value, total)}% {main.label.toLowerCase()}
          </span>
        )}
      />
      <div className="flex gap-1 h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => (
          <span
            key={p.label}
            className="h-full transition-[flex-grow] duration-700"
            style={{ flex: `${p.value} 1 0`, backgroundColor: p.color, minWidth: 5 }}
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
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 180 100" className="w-52 max-w-full">
          <path d={path} fill="none" stroke={total > 0 ? restColor : 'var(--border)'} strokeWidth="16" strokeLinecap="round" opacity="0.9" />
          {total > 0 && (
            <path
              d={path}
              fill="none"
              stroke={main.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${(rate / 100) * arc} ${arc}`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          )}
          <text x={cx} y={cy - 16} textAnchor="middle" fontSize="34" fontWeight="800" fill="var(--text-primary)">{rate}%</text>
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize="13" fill={SOFT}>{rateLabel}</text>
        </svg>
        <div className="w-full">
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
      <BigNumber value={fmt(total)} unit={unit} />
      {total === 0 ? (
        <p className="text-sm" style={{ color: FAINT }}>Aucun sur la période</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {dots.map((c, i) => (
            <span key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      )}
      {step > 1 && <p className="text-xs" style={{ color: FAINT }}>1 point = {step} {unit}</p>}
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
      <BigNumber
        value={fmt(total)}
        unit="ouvertes"
        right={extra && <span className="ml-auto text-sm" style={{ color: SOFT }}>{extra}</span>}
      />
      {stages.length === 0 ? (
        <p className="text-sm" style={{ color: FAINT }}>Aucune opportunité ouverte</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {stages.map((s) => (
            <li key={s.label} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate" style={{ color: SOFT }}>{s.label}</span>
              <span className="h-3 rounded-r-full transition-[width] duration-700" style={{ width: `${Math.max((s.value