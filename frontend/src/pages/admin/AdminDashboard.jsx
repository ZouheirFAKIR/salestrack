import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Icon } from '../../data/icons';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';
import LineChart from '../../components/LineChart';
import CoinIcon from '../../components/CoinIcon';
const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TYPE_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };
const TYPE_ICONS = { appel: '📞', rdv: '📅', devis: '📄', commande: '🛒' };

function TypeQuotasForm({ commercialId, onSaved }) {
  const [quotas, setQuotas] = useState({ appel: 5, rdv: 2, devis: 1, commande: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/commercials/${commercialId}/type-quotas`)
      .then((r) => r.json())
      .then((data) => { setQuotas(data); setLoading(false); });
  }, [commercialId]);

  const handleChange = (type, value) => {
    setQuotas((prev) => ({ ...prev, [type]: value }));
    setSaved(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await Promise.all(
      Object.keys(TYPE_LABELS).map((type) =>
        apiFetch(`${API_URL}/api/admin/commercials/${commercialId}/type-quotas`, {
          method: 'PUT',
          body: JSON.stringify({ type, daily_target: Number(quotas[type]) }),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <Spinner size={18} color={ACCENT} />;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Object.keys(TYPE_LABELS).map((type) => (
          <div key={type} className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center gap-2">
            <span className="text-lg shrink-0">{TYPE_ICONS[type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50">{TYPE_LABELS[type]} / jour</p>
              <input
                type="number" min="0" value={quotas[type]}
                onChange={(e) => handleChange(type, e.target.value)}
                className="w-full bg-transparent text-white text-sm font-semibold outline-none border-b border-white/10 focus:border-orange-500/60 mt-1"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="w-full text-sm font-medium py-2.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ color: '#fff', backgroundColor: ACCENT }}
      >
        {saving && <Spinner size={13} color="#fff" />}
        {saving ? 'Enregistrement...' : saved ? '✓ Objectifs enregistrés' : 'Enregistrer les objectifs'}
      </button>
    </div>
  );
}

function CommercialDetail({ commercial, onClose, onQuotaUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/commercials/${commercial.id}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setLoading(false);
      });
  }, [commercial.id]);

  const labels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50" onClick={onClose}>
      <div
        className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{commercial.nom}</p>
            <p className="text-white/40 text-xs truncate">{commercial.email}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl shrink-0">×</button>
        </div>

        {loading && <Spinner size={24} color={ACCENT} />}

        {!loading && detail && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {['appel', 'rdv', 'devis', 'commande'].map((type) => {
                const stat = detail.stats.find((s) => s.type === type);
                return (
                  <div key={type} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <Icon name={type} size={20} className="mx-auto" style={{ color: ACCENT }} />
                    <p className="text-xl font-semibold text-white mt-1">{stat?.total || 0}</p>
                    <p className="text-[11px] text-white/40">{labels[type]}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 mb-5">
              <p className="text-sm text-white/50 mb-3">Activités (7 derniers jours)</p>
              <LineChart data={detail.daily} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 mb-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Solde de points</p>
                <span className="flex items-center gap-1.5 text-lg font-semibold" style={{ color: ACCENT }}>
                  <CoinIcon size={16} />
                  {detail.points_balance ?? 0}
                </span>
              </div>

              {detail.redemptions?.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Récompenses échangées</p>
                  {detail.redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 bg-black/30 rounded-lg p-2">
                      <p className="text-xs text-white/70 truncate">
                        {r.quantity > 1 ? `${r.quantity} × ` : ''}{r.title}
                      </p>
                      <span className="text-[11px] text-white/40 shrink-0">
                        {new Date(r.redeemed_at).toLocaleDateString('fr-FR')} · −{r.cost_at_redemption}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
              <p className="text-sm font-medium text-white mb-3">Objectifs quotidiens par type</p>
              <TypeQuotasForm commercialId={commercial.id} onSaved={onQuotaUpdated} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OdooStatsCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/odoo-stats`)
      .then((r) => {
        if (!r.ok) throw new Error('Odoo indisponible');
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const formatMAD = (n) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-xs text-white/50 uppercase tracking-wide">Données Odoo — CRM &amp; Ventes</p>
        {!loading && !error && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
            En direct
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/40 text-xs py-4">
          <Spinner size={14} color={ACCENT} />
          Connexion à Odoo...
        </div>
      )}

      {!loading && error && (
        <p className="text-white/30 text-xs py-2">
          Impossible de récupérer les données Odoo pour l'instant. Vérifie que le serveur Odoo est bien accessible.
        </p>
      )}

      {!loading && !error && stats && (
        <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-semibold text-white">{stats.nbDevis}</p>
            <p className="text-[11px] text-white/40 mt-0.5">Devis</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-semibold text-white">{stats.nbCommandes}</p>
            <p className="text-[11px] text-white/40 mt-0.5">Commandes</p>
          </div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-semibold break-words" style={{ color: ACCENT }}>{formatMAD(stats.chiffreAffaires)}</p>
            <p className="text-[11px] text-white/40 mt-0.5">Chiffre d'affaires</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const [commercials, setCommercials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const loadCommercials = () => {
    apiFetch(`${API_URL}/api/admin/commercials`)
      .then((r) => r.json())
      .then((data) => { setCommercials(data); setLoading(false); });
  };

  useEffect(() => { loadCommercials(); }, []);

  const handleDownloadReport = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/admin/report/quotas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rapport_quotas.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        setAdminMenuOpen(false);
      });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Administration — Commerciaux</h1>
            <p className="text-white/40 text-xs">Activité, objectifs et rapports</p>
          </div>

          {/* Liens visibles normalement à partir de sm */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <Link to="/admin/courses" className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
              Gérer les cours
            </Link>
            <Link to="/admin/rewards" className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
              Gérer les récompenses
            </Link>
            <Link to="/admin/notifications" className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
              Notifications
            </Link>
            <button
              onClick={handleDownloadReport}
              className="text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-1.5"
              style={{ backgroundColor: ACCENT, color: '#fff' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Télécharger le rapport
            </button>
          </div>

          {/* Hamburger visible uniquement sur mobile */}
          <div className="relative sm:hidden shrink-0">
            <button
              onClick={() => setAdminMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              aria-label="Menu admin"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {adminMenuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
              </svg>
            </button>

            {adminMenuOpen && (
              <div className="absolute right-0 top-11 w-56 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-xl z-40 p-2 flex flex-col gap-1">
                <Link
                  to="/admin/courses"
                  onClick={() => setAdminMenuOpen(false)}
                  className="text-xs px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Gérer les cours
                </Link>
                <Link
                  to="/admin/rewards"
                  onClick={() => setAdminMenuOpen(false)}
                  className="text-xs px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Gérer les récompenses
                </Link>
                <Link
                  to="/admin/notifications"
                  onClick={() => setAdminMenuOpen(false)}
                  className="text-xs px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Notifications
                </Link>
                <button
                  onClick={handleDownloadReport}
                  className="text-xs px-3 py-2.5 rounded-lg font-medium flex items-center gap-1.5"
                  style={{ backgroundColor: ACCENT, color: '#fff' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Télécharger le rapport
                </button>
              </div>
            )}
          </div>
        </div>

        <OdooStatsCard />

        <div className="flex flex-col gap-3">
          {commercials.length === 0 && (
            <p className="text-white/30 text-sm text-center mt-10">Aucun commercial pour l'instant</p>
          )}
          {commercials.map((c) => {
            const percent = Math.min(Math.round((c.today_activities / c.daily_target) * 100), 100);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 hover:border-orange-400/50 transition-all text-left flex items-center gap-3 sm:gap-4"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
                  {c.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm sm:text-base truncate">{c.nom}</p>
                  <p className="text-white/40 text-[11px] sm:text-xs truncate">{c.total_activities} activités au total</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs sm:text-sm font-semibold" style={{ color: ACCENT }}>{c.today_activities}/{c.daily_target}</p>
                  <div className="w-14 sm:w-20 bg-white/10 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: ACCENT }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <CommercialDetail
          commercial={selected}
          onClose={() => setSelected(null)}
          onQuotaUpdated={loadCommercials}
        />
      )}
    </div>
  );
}

export default AdminDashboard;