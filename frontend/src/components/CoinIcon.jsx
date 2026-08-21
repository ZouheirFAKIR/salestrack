function CoinIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="#f86635" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.3" />
    </svg>
  );
}

export default CoinIcon;