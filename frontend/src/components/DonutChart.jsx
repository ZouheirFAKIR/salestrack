function DonutChart({ data, size = 140, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {data.map((d, i) => {
        const fraction = d.value / total;
        const dash = fraction * c;
        const seg = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            style={{ transition: 'stroke-dasharray 0.7s ease' }}
          />
        );
        offset += dash;
        return seg;
      })}
    </svg>
  );
}

export default DonutChart;