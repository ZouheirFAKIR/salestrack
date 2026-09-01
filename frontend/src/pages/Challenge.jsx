import { useEffect, useState, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import RaceTrack from '../components/RaceTrack';
import CountdownClock from '../components/CountdownClock';
import Confetti from '../components/Confetti';
import { apiFetch } from '../utils/api';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Challenge() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const wasWinnerSeen = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const load = () => {
    apiFetch(`${API_URL}/api/activities/race`)
      .then((r) => r.json())
      .then((res) => {
        if (res.active && res.winnerId && !wasWinnerSeen.current) {
          wasWinnerSeen.current = true;
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
        }
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

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <Confetti show={showConfetti} />
      <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Défi</h1>
      <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>Le sprint collectif du moment, et le dernier gagnant</p>

      {data?.active && (
        <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{data.title}</p>
            {data.winnerId ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: `${ACCENT}17`, color: ACCENT }}>
                Gagné par {data.winnerNom} 🏆
              </span>
            ) : (
              <CountdownClock deadline={data.deadline} />
            )}
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Objectif : {data.target} activités</p>

          <RaceTrack runners={data.runners} target={data.target} />
        </div>
      )}

      {!data?.active && data?.last && (
        <div className="rounded-2xl p-5 sm:p-6 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Aucun défi en cours pour le moment</p>
          <p className="text-base font-semibold mt-3" style={{ color: 'var(--text-primary)' }}>{data.last.title}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Objectif : {data.last.target} activités</p>
          <p className="text-sm mt-3" style={{ color: ACCENT }}>
            {data.last.winnerNom ? `Gagné par ${data.last.winnerNom}` : 'Terminé sans gagnant'}
          </p>
        </div>
      )}

      {!data?.active && !data?.last && (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun défi n'a encore été lancé</p>
        </div>
      )}
    </div>
  );
}

export default Challenge;