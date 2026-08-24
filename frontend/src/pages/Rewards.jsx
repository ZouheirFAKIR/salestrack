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

function RewardCard({ reward, balance, onRedeemed }) {
  const { theme } = useTheme();
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
    <div className={`bg-white/5 border rounded-2xl overflow-hidden flex flex-col transition-all ${canAfford ? 'border-white/10 hover:border-orange-400/40 hover:-translate-y-0.5' : theme === 'dark' ? 'border-white/5 opacity-60' : 'border-white/5'}`}>
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
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
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

        <button
          onClick={handleRedeem}
          disabled={!canAfford || redeeming}
          className="mt-4 w-full text-xs px-3 py-2.5 rounded-xl text-white font-medium disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
          style={{ backgroundColor: canAfford ? ACCENT : 'rgba(255,255,255,0.08)' }}
        >
          {redeeming && <Spinner size={12} color="#fff" />}
          {canAfford ? 'Échanger' : 'Solde insuffisant'}
        </button>
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
              <RewardCard key={r.id} reward={r} balance={balance?.balance ?? 0} onRedeemed={handleRedeemed} />
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
                  <p className="text-sm text-white/70 flex-1 min-w-0 truncate">{h.title}</p>
                  <span className="text-xs text-white/40 flex items-center gap-1 shrink-0">
                    −{h.cost_at_redemption} <CoinIcon size={12} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <style>{`.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
    </div>
  );
}

export default Rewards;