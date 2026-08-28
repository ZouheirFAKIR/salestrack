import { useEffect, useState } from 'react';
import Badge from './Badge';
import Confetti from './Confetti';

const ACCENT = '#f86635';

function Sparkles() {
  const positions = [
    { top: '10%', left: '15%', delay: '0s', size: 14 },
    { top: '15%', left: '80%', delay: '0.15s', size: 10 },
    { top: '75%', left: '10%', delay: '0.3s', size: 12 },
    { top: '80%', left: '85%', delay: '0.45s', size: 16 },
    { top: '5%', left: '48%', delay: '0.6s', size: 10 },
    { top: '90%', left: '50%', delay: '0.75s', size: 12 },
  ];
  return (
    <>
      {positions.map((p, i) => (
        <span
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: p.top,
            left: p.left,
            fontSize: p.size,
            animation: `sparkle 1.6s ease ${p.delay} infinite`,
          }}
        >
          ✨
        </span>
      ))}
    </>
  );
}

function BadgeUnlockModal({ badge, onClose, onNext, remaining }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    setPhase('enter');
    const t1 = setTimeout(() => setPhase('spin'), 100);
    const t2 = setTimeout(() => setPhase('settled'), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [badge]);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <Confetti show={phase === 'settled'} />

      <div className="text-center relative">
        <p
          className="text-xs uppercase tracking-widest mb-6"
          style={{ color: 'rgba(255,255,255,0.5)', opacity: phase === 'enter' ? 0 : 1, transition: 'opacity 0.3s' }}
        >
          Badge débloqué
        </p>

        <div className="relative inline-block" style={{ perspective: '800px' }}>
          {phase === 'settled' && (
            <>
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${ACCENT}55 0%, transparent 70%)`,
                  transform: 'scale(2.2)',
                  animation: 'pulseGlow 1.8s ease-in-out infinite',
                }}
              />
              <Sparkles />
            </>
          )}

          <div
            style={{
              transform: phase === 'enter'
                ? 'scale(0.3) rotateY(0deg)'
                : phase === 'spin'
                ? 'scale(1.15) rotateY(720deg)'
                : 'scale(1) rotateY(720deg)',
              transition: phase === 'spin'
                ? 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : phase === 'settled'
                ? 'transform 0.3s ease'
                : 'none',
              filter: phase === 'settled' ? `drop-shadow(0 0 24px ${ACCENT}80)` : 'none',
              position: 'relative',
            }}
          >
            <Badge category={badge.category} unlocked={true} value={badge.threshold} tier={badge.tier} label={null} size={120} />
          </div>
        </div>

        <p
          className="text-xl font-semibold mt-6"
          style={{
            color: '#fff',
            opacity: phase === 'settled' ? 1 : 0,
            transform: phase === 'settled' ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
          }}
        >
          {badge.label}
        </p>
        <p
          className="text-sm mt-1"
          style={{
            color: 'rgba(255,255,255,0.4)',
            opacity: phase === 'settled' ? 1 : 0,
            transform: phase === 'settled' ? 'translateY(0)' : 'translateY(6px)',
            transition: 'all 0.4s ease 0.25s',
          }}
        >
          Nouveau palier atteint 🎉
        </p>

        {phase === 'settled' && (
          <div className="flex items-center justify-center gap-3 mt-8 animate-[fadeIn_0.3s_ease_0.35s_both]">
            <button
              onClick={onClose}
              className="text-sm px-5 py-2.5 rounded-lg font-medium transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: ACCENT, color: '#fff' }}
            >
              Fermer
            </button>
            {remaining > 0 && (
              <button
                onClick={onNext}
                className="text-sm px-5 py-2.5 rounded-lg font-medium transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: ACCENT, color: '#fff' }}
              >
                Suivant ({remaining})
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; transform: scale(2); }
          50% { opacity: 0.9; transform: scale(2.5); }
        }
        @keyframes sparkle {
          0% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.1) rotate(15deg); }
          100% { opacity: 0; transform: scale(0.3) rotate(-15deg); }
        }
      `}</style>
    </div>
  );
}

export default BadgeUnlockModal;