import { useEffect, useState } from 'react';
import Badge from './Badge';
import Confetti from './Confetti';

const ACCENT = '#f86635';

function BadgeUnlockModal({ badge, onClose, onNext, remaining }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('spin'), 100);
    const t2 = setTimeout(() => setPhase('settled'), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [badge]);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <Confetti show={phase === 'settled'} />

      <div className="text-center">
        <p
          className="text-white/50 text-xs uppercase tracking-widest mb-6"
          style={{ opacity: phase === 'enter' ? 0 : 1, transition: 'opacity 0.3s' }}
        >
          Badge débloqué
        </p>

        <div
          style={{
            perspective: '800px',
            display: 'inline-block',
          }}
        >
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
            }}
          >
            <Badge category={badge.category} unlocked={true} label={null} size={120} />
          </div>
        </div>

        <p
          className="text-white text-xl font-semibold mt-6"
          style={{ opacity: phase === 'settled' ? 1 : 0, transform: phase === 'settled' ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.4s ease 0.1s' }}
        >
          {badge.label}
        </p>
        <p
          className="text-white/40 text-sm mt-1"
          style={{ opacity: phase === 'settled' ? 1 : 0, transition: 'opacity 0.4s ease 0.2s' }}
        >
          Nouveau palier atteint 🎉
        </p>

        {phase === 'settled' && (
          <div className="flex items-center justify-center gap-3 mt-8 animate-[fadeIn_0.3s_ease]">
            <button
              onClick={onClose}
              className="text-sm px-5 py-2.5 rounded-lg text-white/60 border border-white/15 hover:text-white transition-colors"
            >
              Fermer
            </button>
            {remaining > 0 && (
              <button
                onClick={onNext}
                className="text-sm px-5 py-2.5 rounded-lg text-white font-medium transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: ACCENT }}
              >
                Suivant ({remaining})
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default BadgeUnlockModal;