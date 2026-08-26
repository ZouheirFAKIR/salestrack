import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import PageLoader from '../../components/PageLoader';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiFetch(`${API_URL}/api/admin/notifications/redemptions/all`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    apiFetch(`${API_URL}/api/admin/notifications/redemptions/${id}/dismiss`, { method: 'PATCH' }).catch(() => {});
  };

  if (loading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Notifications</h1>
            <p className="text-white/40 text-xs">Historique des échanges de récompenses</p>
          </div>
          <Link to="/admin" className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
            Retour au dashboard
          </Link>
        </div>

        {notifications.length === 0 ? (
          <p className="text-white/30 text-sm text-center mt-10">Aucune notification pour l'instant</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 group">
                {n.image_url ? (
                  <img src={n.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-black/40 flex items-center justify-center text-lg shrink-0">🎁</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">
                    <span className="font-medium text-white">{n.commercial_nom}</span> a échangé {n.quantity > 1 ? `${n.quantity} × ` : ''}{n.title}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {new Date(n.redeemed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}−{n.cost_at_redemption} points
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(n.id)}
                  className="text-white/30 hover:text-white/70 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-2 text-lg"
                  aria-label="Masquer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminNotifications;