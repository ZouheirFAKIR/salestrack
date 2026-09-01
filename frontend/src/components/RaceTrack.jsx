const LANE_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f97316'];
const LILY_EMOJIS = ['🌿', '🍃', '🌾'];

function seededLilies(seed) {
  const rand = (n) => {
    const x = Math.sin(seed * 999 + n) * 10000;
    return x - Math.floor(x);
  };
  return [0, 1].map((n) => ({
    left: `${15 + rand(n) * 70}%`,
    emoji: LILY_EMOJIS[Math.floor(rand(n + 5) * LILY_EMOJIS.length)],
  }));
}

function RaceTrack({ runners, target }) {
  if (!runners || runners.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid var(--border)' }}>
      <div className="h-5" style={{ background: 'linear-gradient(180deg, #bee3f8, #90cdf4)' }} />

      <div className="relative" style={{ background: 'linear-gradient(180deg, #2b6cb0, #234876)' }}>
        <div className="absolute top-0 bottom-0 z-20 flex flex-col items-center" style={{ right: '3%' }}>
          <div className="w-0.5 h-full bg-white/25" />
          <span className="absolute -top-1 text-2xl">🏁</span>
        </div>

        {runners.map((r, i) => {
          const lilies = seededLilies(i + 1);
          const pos = Math.min(Math.max(r.progress, 3), 93);
          const reached = r.progress >= 100;
          return (
            <div
              key={r.id}
              className="relative h-14 sm:h-16 flex items-center"
              style={{ borderTop: i === 0 ? 'none' : '1px dashed rgba(255,255,255,0.12)' }}
            >
              {lilies.map((l, li) => (
                <span key={li} className="absolute text-base opacity-70 select-none" style={{ left: l.left, top: li % 2 === 0 ? '15%' : '60%' }}>
                  {l.emoji}
                </span>
              ))}

              <div
                className="absolute flex items-center gap-1.5 transition-all duration-1000 ease-out z-10"
                style={{ left: `${pos}%`, top: '50%', transform: 'translateY(-50%)' }}
              >
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/95 text-gray-800 shadow whitespace-nowrap">
                  {r.nom}{r.isWinner && ' 🏆'}
                </span>
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: reached ? '#ffd700' : LANE_COLORS[i % LANE_COLORS.length],
                    border: reached ? '2px solid #fff' : '2px solid rgba(255,255,255,0.8)',
                    boxShadow: reached ? '0 0 12px #ffd70099' : 'none',
                  }}
                >
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    r.nom?.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-6 flex items-center justify-center gap-1" style={{ background: 'linear-gradient(180deg, #68d391, #48bb78)' }}>
        <span className="text-[10px] text-white/80">🌱 🐢 🌱</span>
      </div>
    </div>
  );
}

export default RaceTrack;