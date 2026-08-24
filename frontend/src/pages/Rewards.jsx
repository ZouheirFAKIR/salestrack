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
        className="bg-[#0d0d0d] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-black/40 min-h-[240px] md:min-h-full">
          {reward.image_url ? (
            <img src={reward.image_url} alt="" className="w-full h-full object-cover absolute inset-0" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-white/15 absolute inset-0">🎁</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors z-10 md:hidden"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col relative">
          <button
            onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white items-center justify-center transition-colors"
          >
            ×
          </button>

          <p className="text-white text-lg sm:text-xl font-semibold pr-8">{reward.title}</p>
          {reward.description && <p className="text-white/50 text-sm mt-2 leading-relaxed">{reward.description}</p>}

          <div className="flex items-center gap-1.5 mt-4">
            <CoinIcon size={16} />
            <span className="text-sm font-medium" style={{ color: ACCENT }}>{reward.cost} points l'unité</span>
          </div>

          <div className="flex-1" />

          {!confirming ? (
            <>
              <div className="flex items-center justify-between mt-5">
                <p className="text-sm text-white/60">Quantité</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg border border-white/15 text-white flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white font-medium w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    className="w-8 h-8 rounded-lg border border-white/15 text-white flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-white/60">Total</p>
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <CoinIcon size={16} />
                  {totalCost}
                </span>
              </div>

              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

              <button
                onClick={handleCheckoutClick}
                className="w-full text-white text-sm font-medium py-3 rounded-xl mt-5 transition-all hover:brightness-110"
                style={{ backgroundColor: ACCENT }}
              >
                Échanger
              </button>
            </>
          ) : (
            <div className="mt-5">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-sm text-white/80">
                  Confirmer l'échange de <span className="font-semibold text-white">{quantity} × {reward.title}</span> contre <span className="font-semibold" style={{ color: ACCENT }}>{totalCost} points</span> ?
                </p>
              </div>
              {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={redeeming}
                  className="flex-1 text-white/60 text-sm py-3 rounded-xl border border-white/15 hover:text-white transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={redeeming}
                  className="flex-1 text-white text-sm font-medium py-3 rounded-xl transition-all hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60"
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
      className="text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-all hover:border-orange-400/40 hover:-translate-y-0.5"
    >
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {reward.image_url ? (
          <img src={reward.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-white/15">🎁</div>
        )}
        <span
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white backdrop-blur-sm"
          style={{ backgroundColor: `${ACCENT}dd` }}
        >
          <CoinIcon size={13} />
          {reward.cost}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-white font-medium leading-snug">{reward.title}</p>
        {reward.description && <p className="text-white/40 text-sm mt-1 line-clamp-2 flex-1">{reward.description}</p>}
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
      <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-4">🎁</span>
        <h1 className="text-xl font-semibold text-white mb-2">Connecte-toi pour voir les récompenses</h1>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium mt-2" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <Confetti show={showConfetti} />
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">Récompenses</h1>
            <p className="text-white/40 text-sm mt-1">Échange tes points contre des récompenses</p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 shrink-0">
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wide">Solde disponible</p>
              <p className="text-xl font-semibold flex items-center gap-1.5" style={{ color: ACCENT }}>
                <CoinIcon size={18} />
                {balance?.balance ?? 0}
              </p>
            </div>
            <div className="w-px h-9 bg-white/10" />
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wide">Gagnés</p>
              <p className="text-xl font-semibold text-white">{balance?.earned ?? 0}</p>
            </div>
            <div className="w-px h-9 bg-white/10" />
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wide">Dépensés</p>
              <p className="text-xl font-semibold text-white/50">{balance?.spent ?? 0}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rewards.map((r) => (
              <RewardCard key={r.id} reward={r} onSelect={setSelectedReward} />
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Historique</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {history.map((h) => (
                <div key={h.id} className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                  {h.image_url ? (
                    <img src={h.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-lg shrink-0">🎁</div>
                  )}
                  <p className="text-sm text-white/70 flex-1 min-w-0 truncate">
                    {h.quantity > 1 ? `${h.quantity} × ` : ''}{h.title}
                  </p>
                  <span className="text-xs text-white/40 flex items-center gap-1 shrink-0">
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