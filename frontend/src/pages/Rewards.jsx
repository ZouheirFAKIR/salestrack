import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Confetti from '../components/Confetti';
import CoinIcon from '../components/CoinIcon';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function RewardCard({ reward, balance, onRedeemed }) {
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');
  const canAfford = balance >= reward.cost;

  const handleRedeem = async () => {
    if (!canAfford || redeeming) return;
    if (!confirm(`Échanger "${reward.title}" contre ${reward.cost} points ?`)) return;
    setError('');
    setRedeeming(true);
    try {
      const res = await apiFetch(`${API_URL}/api/rewards/${reward.id}/redeem`, { method: 'POST' });
      if (res.ok) {
        onRedeemed();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setRedeeming(false);
  };

  return (
    <div className={`bg-white/5 border rounded-2xl overflow-hidden transition-all ${canAfford ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
      {reward.image_url ? (
        <img src={reward.image_url} alt="" className="w-full h-32 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div className="w-full h-32 flex items-center justify-center text-3xl bg-black/40">🎁</div>
      )}
      <div className="p-4">
        <p className="text-white font-medium">{reward.title}</p>
        {reward.description && <p className="text-white/40 text-xs mt-1">{reward.description}</p>}
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: ACCENT }}>
            <CoinIcon size={16} />
            {reward.cost}
          </span>
          <button
            onClick={handleRedeem}
            disabled={!canAfford || redeeming}
            className="text-xs px-3 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{ backgroundColor: canAfford ? ACCENT : 'rgba(255,255,255,0.1)' }}
          >
            {redeeming && <Spinner size={12} color="#fff" />}
            {canAfford ? 'Échanger' : 'Solde insuffisant'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
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
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        <div>
          <h1 className="text-lg font-semibold text-white">Récompenses</h1>
          <p className="text-white/40 text-xs">Échange tes points contre des récompenses</p>
        </div>

        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}>
          <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Solde disponible</p>
          <div className="flex items-center justify-center gap-2">
            <CoinIcon size={32} />
            <p className="text-white text-4xl font-semibold">{balance?.balance ?? 0}</p>
          </div>
          <p className="text-white/70 text-xs mt-2">{balance?.earned ?? 0} gagnés — {balance?.spent ?? 0} dépensés</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rewards.length === 0 && (
            <div className="sm:col-span-2">
              <EmptyState
                icon="🎁"
                title="Aucune récompense pour l'instant"
                subtitle="Les récompenses ajoutées par l'admin apparaîtront ici."
              />
            </div>
          )}
          {rewards.map((r) => (
            <RewardCard key={r.id} reward={r} balance={balance?.balance ?? 0} onRedeemed={handleRedeemed} />
          ))}
        </div>

        {history.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-white/50 uppercase tracking-wide mb-3">Historique</p>
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-white/70">{h.title}</p>
                                    <span className="text-xs text-white/40 flex items-center gap-1">
                    −{h.cost_at_redemption} <CoinIcon size={12} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Rewards;