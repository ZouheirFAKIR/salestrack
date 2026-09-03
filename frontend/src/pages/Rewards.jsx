import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Confetti from '../components/Confetti';
import CoinIcon from '../components/CoinIcon';
import { useTheme } from '../contexts/ThemeContext';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function RewardDetailModal({ reward, balance, onClose, onRedeemed }) {
  const [quantity, setQuantity] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');

  const totalCost = reward.cost * quantity;
  const canAfford = balance >= totalCost;

  const handleCheckoutClick = () => {
    setError('');
    if (!canAfford) {
      setError('Solde insuffisant pour cette quantité.');
      return;
    }
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setRedeeming(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}/api/rewards/${reward.id}/redeem`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        onRedeemed();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'échange');
        setConfirming(false);
      }
    } catch (err) {
      setError('Erreur réseau');
      setConfirming(false);
    }
    setRedeeming(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2"
        style={{ minHeight: '460px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative min-h-[280px] md:min-h-full" style={{ backgroundColor: 'var(--surface-strong)' }}>
          {reward.image_url ? (
            <img src={reward.image_url} alt="" className="w-full h-full object-cover absolute inset-0" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl absolute inset-0" style={{ color: 'var(--text-muted)' }}>🎁</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors z-10 md:hidden"
          >
            ×
          </button>
        </div>

        <div className="p-8 sm:p-10 flex flex-col relative">
          <button
            onClick={onClose}
            className="hidden md:flex absolute top-6 right-6 w-9 h-9 rounded-full items-center justify-center transition-colors hover:bg-[var(--surface-strong)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>

          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Récompense</span>
          <p className="text-2xl sm:text-3xl font-bold pr-10 mt-1.5 leading-tight" style={{ color: 'var(--text-primary)' }}>{reward.title}</p>
          {reward.description && <p className="text-sm sm:text-base mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{reward.description}</p>}

          <div className="flex items-center gap-1.5 mt-5">
            <CoinIcon size={18} />
            <span className="text-base font-medium" style={{ color: ACCENT }}>{reward.cost} points l'unité</span>
          </div>

          <div className="flex-1" />

          {!confirming ? (
            <>
              <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Quantité</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-strong)]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    −
                  </button>
                  <span className="text-lg font-medium w-8 text-center" style={{ color: 'var(--text-primary)' }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    className="w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-strong)]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</p>
                <span className="flex items-center gap-1.5 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <CoinIcon size={18} />
                  {totalCost}
                </span>
              </div>

              {error && <p className="text-red-500 text-xs mt-4">{error}</p>}

              <button
                onClick={handleCheckoutClick}
                className="w-full text-white text-sm font-medium py-3.5 rounded-xl mt-6 transition-all hover:brightness-110"
                style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}40` }}
              >
                Échanger
              </button>
            </>
          ) : (
            <div className="mt-8">
              <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Confirmer l'échange de <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{quantity} × {reward.title}</span> contre <span className="font-semibold" style={{ color: ACCENT }}>{totalCost} points</span> ?
                </p>
              </div>
              {error && <p className="text-red-500 text-xs mt-3 text-center">{error}</p>}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={redeeming}
                  className="flex-1 text-sm py-3.5 rounded-xl transition-colors disabled:opacity-50 hover:bg-[var(--surface-strong)]"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={redeeming}
                  className="flex-1 text-white text-sm font-medium py-3.5 rounded-xl transition-all hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}
                >
                  {redeeming && <Spinner size={13} color="#fff" />}
                  Confirmer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RewardCard({ reward, onSelect }) {
  return (
    <button
      onClick={() => onSelect(reward)}
      className="text-left rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--surface-strong)' }}>
        {reward.image_url ? (
          <img src={reward.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: 'var(--text-muted)' }}>🎁</div>
        )}
        <span
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm"
          style={{ backgroundColor: `${ACCENT}dd`, color: '#fff' }}
        >
          <CoinIcon size={13} />
          {reward.cost}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{reward.title}</p>
        {reward.description && <p className="text-sm mt-1 line-clamp-2 flex-1" style={{ color: 'var(--text-secondary)' }}>{reward.description}</p>}
      </div>
    </button>
  );
}

function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const token = localStorage.getItem('token');

  const loadAll = () => {
    Promise.all([
      apiFetch(`${API_URL}/api/rewards`).then((r) => r.json()),
      apiFetch(`${API_URL}/api/rewards/balance`).then((r) => r.json()),
      apiFetch(`${API_URL}/api/rewards/history`).then((r) => r.json()),
    ]).then(([rewardsData, balanceData, historyData]) => {
      setRewards(rewardsData);
      setBalance(balanceData);
      setHistory(historyData);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    loadAll();
  }, [token]);

  const handleRedeemed = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1300);
    loadAll();
  };

  if (loading) return <PageLoader />;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <span className="text-4xl mb-4">🎁</span>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connecte-toi pour voir les récompenses</h1>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium mt-2" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}20, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}16, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <svg className="absolute top-28 right-10 pointer-events-none hidden xl:block" width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" stroke={ACCENT} strokeOpacity="0.16" strokeWidth="2" fill="none" />
        <circle cx="60" cy="60" r="30" stroke={ACCENT} strokeOpacity="0.12" strokeWidth="2" fill="none" />
      </svg>

      <Confetti show={showConfetti} />
      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Récompenses</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Échange tes points contre des récompenses</p>
          </div>

          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-3 shrink-0"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Solde disponible</p>
              <p className="text-xl font-semibold flex items-center gap-1.5" style={{ color: ACCENT }}>
                <CoinIcon size={18} />
                {balance?.balance ?? 0}
              </p>
            </div>
            <div className="w-px h-9" style={{ backgroundColor: 'var(--border)' }} />
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Gagnés</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{balance?.earned ?? 0}</p>
            </div>
            <div className="w-px h-9" style={{ backgroundColor: 'var(--border)' }} />
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Dépensés</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-muted)' }}>{balance?.spent ?? 0}</p>
            </div>
          </div>
        </div>

        {rewards.length === 0 ? (
          <EmptyState
            icon="🎁"
            title="Aucune récompense pour l'instant"
            subtitle="Les récompenses ajoutées par l'admin apparaîtront ici."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {rewards.map((r) => (
              <RewardCard key={r.id} reward={r} onSelect={setSelectedReward} />
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>Historique</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  {h.image_url ? (
                    <img src={h.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: 'var(--surface-strong)' }}>🎁</div>
                  )}
                  <p className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {h.quantity > 1 ? `${h.quantity} × ` : ''}{h.title}
                  </p>
                  <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    −{h.cost_at_redemption} <CoinIcon size={12} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {selectedReward && (
        <RewardDetailModal
          reward={selectedReward}
          balance={balance?.balance ?? 0}
          onClose={() => setSelectedReward(null)}
          onRedeemed={handleRedeemed}
        />
      )}

      <style>{`.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
    </div>
  );
}

export default Rewards;