import { motion } from 'framer-motion';
import RunnerFigure from './RunnerFigure';

const LANE_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f97316'];

function RaceTrack({ runners }) {
  if (!runners || runners.length === 0) return null;

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl" style={{ border: '1px solid var(--border)' }}>
      <div className="relative" style={{ background: 'linear-gradient(180deg, #16a34a 0%, #16a34a 6%, #c0392b 6%, #96281b 100%)' }}>
        <div
          className="absolute z-20"
          style={{ top: '6%', bottom: 0, right: '3%', width: '10px', backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 8px, #111 8px 16px)' }}
        />
        <span className="absolute z-20 text-2xl" style={{ top: '1%', right: '2%' }}>🏁</span>

        {runners.map((r, i) => {
          const pos = Math.min(Math.max(r.progress, 0), 96);
          const reached = r.progress >= 100;
          const color = LANE_COLORS[i % LANE_COLORS.length];
          return (
            <div
              key={r.id}
              className="relative h-16 sm:h-[72px] flex items-center"
              style={{
                borderTop: i === 0 ? 'none' : '1px dashed rgba(255,255,255,0.5)',
                backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent',
              }}
            >
              <motion.div
                className="absolute flex flex-col items-center z-10"
                initial={{ left: '1%' }}
                animate={{ left: `${pos}%` }}
                transition={{ type: 'spring', stiffness: 45, damping: 15 }}
                style={{ transform: 'translateX(-30%)' }}
              >
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/95 text-gray-800 shadow whitespace-nowrap mb-0.5">
                  {r.nom}{reached && ' 🏆'}
                </span>
                <RunnerFigure color={reached ? '#ffd700' : color} size={40} victory={reached} delay={i * 0.08} />
              </motion.div>
            </div>
          );
        })}
      </div>

      <style>{`
        .runner-cycle .leg-back   { animation: swingBack 0.55s ease-in-out infinite; }
        .runner-cycle .leg-front  { animation: swingFront 0.55s ease-in-out infinite; }
        .runner-cycle .arm-back   { animation: swingFront 0.55s ease-in-out infinite; }
        .runner-cycle .arm-front  { animation: swingBack 0.55s ease-in-out infinite; }
        @keyframes swingFront { 0%,100% { transform: rotate(28deg); } 50% { transform: rotate(-28deg); } }
        @keyframes swingBack  { 0%,100% { transform: rotate(-28deg); } 50% { transform: rotate(28deg); } }
      `}</style>
    </div>
  );
}

export default RaceTrack;