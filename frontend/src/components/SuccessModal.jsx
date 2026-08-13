import { useEffect, useState } from 'react';
import Confetti from './Confetti';

const ACCENT = '#f86635';

function SuccessModal({ onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <Confetti show={true} />
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center transition-all duration-300"
        style={{ transform: visible ? 'scale(1)' : 'scale(0.85)', opacity: visible ? 1 : 0 }}
      >
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#fff0e8' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M17 5a3 3 0 0 0 3 3" />
            <path d="M7 5a3 3 0 0 1-3 3" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-black mb-2">Objectif atteint</h2>
        <p className="text-black/50 text-sm mb-6">
          Tu as complété ton objectif du jour. Excellent travail, continue sur cette lancée.
        </p>
        <button
          onClick={handleClose}
          className="w-full text-white p-3 rounded-xl font-medium transition-transform active:scale-95 hover:scale-[1.02]"
          style={{ backgroundColor: ACCENT }}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

export default SuccessModal;