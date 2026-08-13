import { useEffect, useState } from 'react';

const ACCENT = '#f86635';

function TargetModal({ onClose, target, current = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const remaining = Math.max(target - current, 0);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center transition-all duration-300"
        style={{ transform: visible ? 'scale(1)' : 'scale(0.85)', opacity: visible ? 1 : 0 }}
      >
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#fff0e8' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" fill={ACCENT} />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-black mb-2">Objectif du jour</h2>
        <p className="text-black/50 text-sm mb-6">
          Il te reste <span style={{ color: ACCENT, fontWeight: 600 }}>{remaining} activité{remaining > 1 ? 's' : ''}</span> à enregistrer pour atteindre ton objectif de {target}.
        </p>
        <button
          onClick={handleClose}
          className="w-full text-white p-3 rounded-xl font-medium transition-transform active:scale-95 hover:scale-[1.02]"
          style={{ backgroundColor: ACCENT }}
        >
          Commencer
        </button>
      </div>
    </div>
  );
}

export default TargetModal;