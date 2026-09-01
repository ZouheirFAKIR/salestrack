import { motion } from 'framer-motion';
import RunnerFigure from './RunnerFigure';

const LANE_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f97316'];
const SKIN_TONES = ['#f2c9a1', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR_COLORS = ['#2d1b0e', '#1a1a1a', '#4a2c17', '#6b3e26', '#3b2314'];

function RaceTrack({ runners }) {
  if (!runners || runners.length === 0) return null;

  return (
    <div className="rounded-3xl shadow-2xl relative overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.15)' }}>
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(180deg, #74c0f0 0%, #a9dcf7 8%, #2f9e44 8%, #1c7a34 12%, #b23a2e 12%, #7d2318 100%)' }}>
        <div className="absolute rounded-full" style={{ top: '1%', left: '4%', width: 30, height: 30, background: 'radial-gradient(circle, #fff6c9, #ffe066)', boxShadow: '0 0 22px #ffe06699' }} />
        {[['22%', '2%', 40, 14], ['46%', '0.5%', 30, 11], ['68%', '2.5%', 36, 12]].map(([l, t, w, h], i) => (
          <div key={i} className="absolute rounded-full bg-white/80" style={{ left: l, top: t, width: w, height: h }} />
        ))}

        <div className="absolute w-full flex justify-between px-[2%]" style={{ top: '0.5%' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-1 h-3" style={{ background: 'linear-gradient(180deg,#ddd,#888)' }} />
          ))}
        </div>

        <div className="absolute w-full flex" style={{ top: '8%', height: '4%' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="text-[8px] leading-none opacity-90" style={{ transform: `translateY(${(i % 3) * 2}px)` }}>
              {['🧑', '👩', '🧑‍🦱', '👨', '👩‍🦰'][i % 5]}
            </span>
          ))}
        </div>

        <div
          className="absolute inset-x-0"
          style={{ top: '12%', bottom: 0, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 40px, transparent 40px 80px)' }}
        />
        <div
          className="absolute inset-x-0"
          style={{ top: '12%', bottom: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.28) 100%)' }}
        />

        {['9%', '27%', '45%', '63%', '81%', '96%'].map((l, i) => (
          <span key={i} className="absolute text-base" style={{ top: '9%', left: l }}>🌳</span>
        ))}

        <motion.div
          className="absolute z-10 origin-left"
          style={{ top: '11.5%', right: '3.4%', width: 22, height: 15, background: 'repeating-linear-gradient(45deg, #f86635 0 5px, #fff 5px 10px)' }}
          animate={{ scaleX: [1, 0.85, 1], skewY: [0, 3, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute z-10" style={{ top: '12%', bottom: 0, right: '3%', width: '10px', backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 8px, #111 8px 16px)', boxShadow: '0 0 12px rgba(0,0,0,0.5)' }} />
      </div>

      <div className="relative z-10 px-2 sm:px-3 pt-[13%] pb-2">
        {runners.map((r, i) => {
          const pos = Math.min(Math.max(r.progress, 0), 100);
          const leftPercent = 6 + (pos / 100) * 78;
          const reached = r.progress >= 100;
          const color = LANE_COLORS[i % LANE_COLORS.length];
          return (
            <div
              key={r.id}
              className="relative h-16 sm:h-[76px] flex items-center"
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
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap mb-1"
                  style={{ backgroundColor: '#fff', color: '#1a202c', border: `2px solid ${reached ? '#ffd700' : color}` }}
                >
                  {r.nom}{reached && ' 🏆'}
                </span>
                <RunnerFigure
                  color={reached ? '#ffd700' : color}
                  size={44}
                  victory={reached}
                  delay={i * 0.08}
                  skinTone={SKIN_TONES[i % SKIN_TONES.length]}
                  hairColor={HAIR_COLORS[i % HAIR_COLORS.length]}
                />
              </motion.div>
            </div>
          );
        })}
      </div>

      <style>{`
        .runner-cycle .bob        { animation: bob 0.5s ease-in-out infinite; }
        .runner-cycle .leg-back   { animation: swingBack 0.5s ease-in-out infinite; }
        .runner-cycle .leg-front  { animation: swingFront 0.5s ease-in-out infinite; }
        .runner-cycle .shoe-back  { animation: swingBack 0.5s ease-in-out infinite; }
        .runner-cycle .shoe-front { animation: swingFront 0.5s ease-in-out infinite; }
        .runner-cycle .arm-back   { animation: swingFront 0.5s ease-in-out infinite; }
        .runner-cycle .arm-front  { animation: swingBack 0.5s ease-in-out infinite; }
        .runner-cycle .dust       { animation: dustFade 0.5s ease-in-out infinite; }
        @keyframes bob        { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
        @keyframes swingFront { 0%,100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
        @keyframes swingBack  { 0%,100% { transform: rotate(-24deg); } 50% { transform: rotate(24deg); } }
        @keyframes dustFade   { 0% { opacity: 0.5; transform: translateX(0) scale(1); } 100% { opacity: 0; transform: translateX(-6px) scale(0.6); } }
      `}</style>
    </div>
  );
}

export default RaceTrack;