const DEVIS_COLOR = '#f86635';
const COMMANDE_COLOR = '#3fb8e8';

function UserBarChart({ byUser }) {
  if (!byUser || byUser.length === 0) return null;

  const width = 600;
  const height = 180;
  const padding = 30;
  const groupGap = 24;
  const barGap = 4;

  const maxVal = Math.max(...byUser.flatMap((u) => [u.devis, u.commande]), 1);
  const max = Math.ceil(maxVal / 5) * 5 || 5;

  const chartWidth = width - padding * 2;
  const groupWidth = Math.max((chartWidth - groupGap * (byUser.length - 1)) / byUser.length, 30);
  const barWidth = (groupWidth - barGap) / 2;

  const yTicks = [0, Math.round(max / 2), max];

  return (
    <div className="w-full" style={{ height: '240px' }}>
      <div className="flex items-center gap-3 mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEVIS_COLOR }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Devis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMMANDE_COLOR }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Commandes</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height + 34}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t, i) => {
          const y = height - padding - (t / max) * (height - padding * 2);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{t}</text>
            </g>
          );
        })}

        {byUser.map((u, i) => {
          const gx = padding + i * (groupWidth + groupGap);
          const devisH = (u.devis / max) * (height - padding * 2);
          const commandeH = (u.commande / max) * (height - padding * 2);
          return (
            <g key={u.nom}>
              <rect
                x={gx - 6} y={padding} width={groupWidth + 12} height={height - padding * 2}
                fill="none"
                stroke="var(--border)" strokeWidth="1.5" rx={8}
              />
              <rect x={gx} y={height - padding - devisH} width={barWidth} height={devisH} fill={DEVIS_COLOR} rx={2} style={{ opacity: 0, animation: `barFadeIn 0.5s ease ${i * 0.05}s forwards` }} />
              {u.devis > 0 && (
                <text x={gx + barWidth / 2} y={height - padding - devisH - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill={DEVIS_COLOR}>{u.devis}</text>
              )}
              <rect x={gx + barWidth + barGap} y={height - padding - commandeH} width={barWidth} height={commandeH} fill={COMMANDE_COLOR} rx={2} style={{ opacity: 0, animation: `barFadeIn 0.5s ease ${i * 0.05 + 0.02}s forwards` }} />
              {u.commande > 0 && (
                <text x={gx + barWidth + barGap + barWidth / 2} y={height - padding - commandeH - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill={COMMANDE_COLOR}>{u.commande}</text>
              )}
              <text x={gx + groupWidth / 2} y={height + 20} textAnchor="middle" fontSize="10" fill="var(--text-primary)">
                {u.nom.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>

      <style>{`@keyframes barFadeIn { to { opacity: 1; } }`}</style>
    </div>
  );
}

export default UserBarChart;