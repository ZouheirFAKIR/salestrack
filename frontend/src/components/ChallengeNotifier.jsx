import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GAME_LABELS = {
  race: { emoji: '🏎️', label: 'Course' },
  mountain: { emoji: '⛰️', label: 'Montagne' },
  rocket: { emoji: '🚀', label: 'Fusée' },
  ocean: { emoji: '🤿', label: 'Océan' },
};

function ChallengeNotifier() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });

    socket.on('new_challenge', (challenge) => {
      setToast(challenge);
    });

    return () => socket.disconnect();
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const info = GAME_LABELS[toast.gameType] || GAME_LABELS.race;

  return (
    <div
      onClick={() => { navigate('/challenge'); setToast(null); }}
      className="fixed top-4 right-4 z-[60] cursor-pointer overflow-hidden"
      style={{
        width: 320,
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        animation: 'challengeToastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${ACCENT}18` }}
        >
          🏆
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-medium mb-0.5" style={{ color: ACCENT }}>Nouveau défi lancé</p>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {info.emoji} {toast.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{info.label} — clique pour participer</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setToast(null); }}
          className="shrink-0 text-lg leading-none -mt-1"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
      <div className="h-[3px] w-full" style={{ backgroundColor: 'var(--surface-strong)' }}>
        <div className="h-full" style={{ backgroundColor: ACCENT, animation: 'challengeToastProgress 6s linear forwards' }} />
      </div>
      <style>{`
        @keyframes challengeToastIn { from { opacity: 0; transform: translateX(40px) scale(0.9); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes challengeToastProgress { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </div>
  );
}

export default ChallengeNotifier;