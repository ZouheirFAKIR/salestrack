import { useEffect, useState } from 'react';
import Confetti from './Confetti';

const ACCENT = '#f86635';

function SuccessModal({ onClose, title, message }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <Confetti show={true} />
      <div
        className="rounded-2xl p-8 max-w-sm w-full text-center transition-all duration-300"
        style={{
          backgroundColor: 'var(--surface-strong)',
          border: '1px solid var(--border)',
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)`, boxShadow: `0 0 24px ${ACCENT}55` }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M17 5a3 3 0 0 0 3 3" />
            <path d="M7 5a3 3 0 0 1-3 3" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title || 'Objectif atteint'}</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message || 'Tu as complété ton objectif du jour. Excellent travail, continue sur cette lancée.'}
        </p>
        <button
          onClick={handleClose}
          className="w-full p-3 rounded-xl font-medium transition-transform active:scale-95 hover:scale-[1.02]"
          style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}40`, color: '#fff' }}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

export default SuccessModal;