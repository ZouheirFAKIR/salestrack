import { motion } from 'framer-motion';
import SwimmerAvatar from './SwimmerAvatar';

const LANE_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f97316'];

function RaceTrack({ runners }) {
  if (!runners || runners.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg select-none" style={{ border: '1px solid var(--border)' }}>
      <div className="relative h-10" style={{ background: 'linear-gradient(180deg, #a7d8ff, #cdeeff)' }}>
        <div className="absolute left-4 top-2 w-6 h-6 rounded-full" style={{ backgroundColor: '#ffe066', boxShadow: '0 0 16px #ffe06699' }} />
        <div className="absolute right-10 top-3 w-8 h-3 rounded-full bg-white/80" />
        <div className="absolute right-16 top-1 w-6 h-3 rounded-full bg-white/70" />
      </div>

      <div className="relative" style={{ background: 'linear-gradient(180deg, #3182ce, #1a4971)' }}>
        <div className="absolute top-0 bottom-0 z-20" style={{ right: '4%' }}>
          <div
            className="w-2 h-full opacity-90"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 6px, #1a202c 6px 12px)' }}
          />
          <span className="absolute -top-1 -left-2 text-2xl">🏁</span>
        </div>

        {runners.map((r, i) => {
          const pos = Math.min(Math.max(r.progress, 2), 92);
          const reached = r.progress >= 100;
          return (
            <div
              key={r.id}
              className="relative h-16 sm:h-20 flex items-center"
              style={{ borderTop: i === 0 ? 'none' : '1px dashed rgba(255,255,255,0.1)' }}
            >
              <motion.div
                className="absolute flex flex-col items-center gap-0.5 z-10"
                initial={{ left: '2%' }}
                animate={{ left: `${pos}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 14 }}
                style={{ transform: 'translateX(-50%)' }}
              >
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/95 text-gray-800 shadow whitespace-nowrap mb-0.5">
                  {r.nom}{reached && ' 🏆'}
                </span>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.6 + (i % 3) * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                >
                  <SwimmerAvatar
                    color={reached ? '#ffd700' : LANE_COLORS[i % LANE_COLORS.length]}
                    photoUrl={r.photo_url}
                    size={48}
                  />
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="h-6 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #68d391, #48bb78)' }}>
        <span className="text-[10px] text-white/80">🌱 🦆 🌱 🐢 🌱</span>
      </div>
    </div>
  );
}

export default RaceTrack;