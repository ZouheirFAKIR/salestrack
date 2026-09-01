import { useEffect, useState, useRef } from 'react';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import PhaserRaceGame from '../components/PhaserRaceGame';
import CountdownClock from '../components/CountdownClock';
import Confetti from '../components/Confetti';
import { Icon } from '../data/icons';
import { apiFetch } from '../utils/api';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TYPE_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

function WinnerModal({ winnerNom, title, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="rounded-3xl p-8 max-w-sm w-full text-center"
        style={{ backgroundColor: 'var(--surface)', border: '2px solid #ffd700', boxShadow: '0 0 40px #ffd70055' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-5xl mb-3">🏆</p>
        <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Défi remporté !</p>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        <p className="text-xl font-semibold mb-6" style={{ color: '#ffd700' }}>{winnerNom} 🎉</p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function Challenge() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [winnerModal, setWinnerModal] = useState(null);
  const prevActiveRef = useRef(null);

  const loadHistory = () => {
    apiFetch(`${API_URL}/api/activities/challenges-history`)
      .then((r) => r.json())
      .then((res) => setHistory(res.history || []))
      .catch(() => {});
  };

  const load = () => {
    apiFetch(`${API_URL}/api/activities/race`)
      .then((r) => r.json())
      .then((res) => {
        const newlyWonKey = !res.active && res.last?.winnerId ? `${res.last.title}-${res.last.winnerId}-${res.last.createdAt}` : null;
        if (newlyWonKey) {
          const lastCelebrated = localStorage.getItem('lastCelebratedChallenge');
          if (newlyWonKey !== lastCelebrated) {
            localStorage.setItem('lastCelebratedChallenge', newlyWonKey);
            setShowConfetti(true);
            setWinnerModal({ title: res.last.title, winnerNom: res.last.winnerNom });
            setTimeout(() => setShowConfetti(false), 3000);
          }
        }
        if (prevActiveRef.current === true && res.active === false) {
          loadHistory();
        }
        prevActiveRef.current = res.active;
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadHistory();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      <Confetti show={showConfetti} />
      {winnerModal && (
        <WinnerModal
          title={winnerModal.title}
          winnerNom={winnerModal.winnerNom}
          onClose={() => setWinnerModal(null)}
        />
      )}
      <div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Défi</h1>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Le sprint collectif du moment</p>
      </div>

      {data?.active ? (
        <div className="rounded-2xl p-4 sm:p-5 flex flex-col" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', height: '70vh', minHeight: 480 }}>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2 shrink-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{data.title}</p>
            <CountdownClock deadline={data.deadline} />
          </div>

          <div className="flex flex-wrap gap-2 mb-4 shrink-0">
            {['appel', 'rdv', 'devis', 'commande'].map((type) => {
              const target = data.targets?.[type] || 0;
              if (target <= 0) return null;
              return (
                <span
                  key={type}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <Icon name={type} size={13} style={{ color: ACCENT }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{target}</span>
                  {TYPE_LABELS[type]}
                </span>
              );
            })}
          </div>

          <div className="flex-1 min-h-0">
            <PhaserRaceGame runners={data.runners} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun défi pour le moment</p>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Historique des défis</p>
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{h.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(h.ended_at || h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs font-medium shrink-0" style={{ color: h.winner_nom ? ACCENT : 'var(--text-muted)' }}>
                  {h.winner_nom ? `🏆 ${h.winner_nom}` : 'Sans gagnant'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Challenge;