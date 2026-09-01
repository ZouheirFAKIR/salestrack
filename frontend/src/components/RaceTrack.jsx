import { motion } from 'framer-motion';
import RunnerFigure from './RunnerFigure';

const LANE_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f97316'];
const HEADER_HEIGHT = 70;

function RaceTrack({ runners, height = 500 }) {
  if (!runners || runners.length === 0) return null;

  return (
    <div
      className="rounded-3xl shadow-2xl relative overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.15)', height }}
    >
      <div
        className="absolute inset-x-0 top-0 z-0"
        style={{ height: HEADER_HEIGHT, background: 'linear-gradient(180deg, #74c0f0 0%, #a9dcf7 70%, #2f9e44 70%, #1c7a34 100%)' }}
      >
        <div className="absolute rounded-full" style={{ top: 8, left: '4%', width: 24, height: 24, background: 'radial-gradient(circle, #fff6c9, #ffe066)', boxShadow: '0 0 16px #ffe06699' }} />
        {[['22%', 8, 32, 11], ['46%', 5, 26, 9], ['68%', 10, 28, 10]].map(([l, t, w, h], i) => (
          <div key={i} className="absolute rounded-full bg-white/80" style={{ left: l, top: t, width: w, height: h }} />
        ))}
        {['9%', '27%', '45%', '63%', '81%', '96%'].map((l, i) => (
          <span key={i} className="absolute text-sm" style={{ bottom: 2, left: l }}>🌳</span>
        ))}
      </div>

      <div
        className="absolute inset-x-0 z-0"
        style={{ top: HEADER_HEIGHT, bottom: 0, background: 'linear-gradient(180deg, #b23a2e, #7d2318)' }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 40px, transparent 40px 80px)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.28) 100%)' }} />
        <motion.div
          className="absolute z-10 origin-left"
          style={{ top: 8, right: '3.4%', width: 20, height: 14, background: 'repeating-linear-gradient(45deg, #f86635 0 5px, #fff 5px 10px)' }}
          animate={{ scaleX: [1, 0.85, 1], skewY: [0, 3, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute z-10" style={{ top: 0, bottom: 0, right: '3%', width: 10, backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 8px, #111 8px 16px)', boxShadow: '0 0 12px rgba(0,0,0,0.5)' }} />
      </div>

      <div
        className="relative z-10 h-full flex flex-col px-2 sm:px-4"
        style={{ paddingTop: HEADER_HEIGHT + 8, paddingBottom: 8 }}
      >
        {runners.map((r, i) => {
          const pos = Math.min(Math.max(r.progress, 0), 100);
          const leftPercent = 6 + (pos / 100) * 78;
          const reached = r.progress >= 100;
          const color = LANE_COLORS[i % LANE_COLORS.length];
          return (
            <div
              key={r.id}
              className="relative flex-1 flex items-center min-h-0"
              style={{ borderTop: i === 0 ? 'none' : '1px dashed rgba(255,255,255,0.35)' }}
            >
              <motion.div
                className="absolute flex flex-col items-center z-10"
                initial={{ left: '6%' }}
                animate={{ left: `${leftPercent}%` }}
                transition={{ type: 'spring', stiffness: 45, damping: 15 }}
                style={{ transform: 'translateX(-50%)' }}
              >
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full shadow-md whitespace-nowrap relative z-10 mb-1"
                  style={{ backgroundColor: '#fff', color: '#1a202c', border: `2px solid ${reached ? '#ffd700' : color}` }}
                >
                  {r.nom}{reached && ' 🏆'}
                </span>
                <RunnerFigure index={i} size={64} victory={reached} />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RaceTrack;