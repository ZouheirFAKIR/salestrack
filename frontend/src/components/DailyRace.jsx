import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function DailyRace({ currentUserId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiFetch(`${API_URL}/api/activities/race`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl p-4 sm:p-5 flex justify-center py-10" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Spinner size={20} color={ACCENT} />
      </div>
    );
  }

  if (!data || !data.active) return null;

  const deadlineStr = new Date(data.deadline).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{data.title}</p>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: `${ACCENT}17`, color: ACCENT }}>
          {data.winnerId ? `Gagné par ${data.winnerNom} 🏆` : `Fin : ${deadlineStr}`}
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Objectif : {data.target} activités</p>

      <div className="flex flex-col gap-4">
        {data.runners.map((r) => {
          const isMe = r.id === currentUserId;
          return (
            <div key={r.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: isMe ? ACCENT : 'var(--text-primary)' }}>
                  {r.nom}{isMe && ' (toi)'}{r.isWinner && ' 🏆'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.total}/{data.target}</span>
              </div>
              <div className="relative w-full rounded-full h-3" style={{ backgroundColor: 'var(--surface-strong)' }}>
                <div
                  className="h-3 rounded-full transition-all duration-700 ease-out relative"
                  style={{
                    width: `${Math.max(r.progress, 4)}%`,
                    background: r.isWinner ? 'linear-gradient(90deg, #ffd700, #f86635)' : ACCENT,
                  }}
                >
                  <div
                    className="absolute -right-3 -top-2.5 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-md overflow-hidden"
                    style={{ backgroundColor: r.isWinner ? '#ffd700' : ACCENT, border: '2px solid var(--surface)' }}
                  >
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      r.nom?.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DailyRace;