import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Icon } from '../../data/icons';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';
import LineChart from '../../components/LineChart';
import CoinIcon from '../../components/CoinIcon';
import OdooRangeCard from '../../components/OdooRangeCard';
import OdooActivitiesCard from '../../components/OdooActivitiesCard';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TYPE_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

const NAV_LINKS = [
  { to: '/admin/courses', label: 'Cours' },
  { to: '/admin/rewards', label: 'Récompenses' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/odoo', label: 'Liaison Odoo' },
  { to: '/admin/challenge', label: 'Défi' },
];

const progressColor = (percent) =>
  percent >= 100 ? '#22c55e' :
  percent >= 75 ? '#86efac' :
  percent >= 25 ? '#f97316' :
  '#ef4444';

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

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
          <div key={type} className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${ACCENT}15` }}>
              <Icon name={type} size={15} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{TYPE_LABELS[type]} / jour</p>
              <input
                type="number" min="0" value={quotas[type]}
                onChange={(e) => handleChange(type, e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none border-b mt-1"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
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
        className="rounded-2xl p-4 sm:p-8 max-w-5xl w-full max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
              {commercial.nom?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{commercial.nom}</p>
              <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{commercial.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl shrink-0 leading-none transition-colors" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size={24} color={ACCENT} />
          </div>
        )}

        {!loading && detail && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['appel', 'rdv', 'devis', 'commande'].map((type) => {
                const stat = detail.stats.find((s) => s.type === type);
                return (
                  <div key={type} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                    <Icon name={type} size={22} className="mx-auto" style={{ color: ACCENT }} />
                    <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>{stat?.total || 0}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{labels[type]}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Activités (7 derniers jours)</p>
              <LineChart data={detail.daily} />
            </div>

            <OdooActivitiesCard commercialId={commercial.id} />

            <OdooRangeCard commercialId={commercial.id} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Solde de points</p>
                  <span className="flex items-center gap-1.5 text-lg font-semibold" style={{ color: ACCENT }}>
                    <CoinIcon size={16} />
                    {detail.points_balance ?? 0}
                  </span>
                </div>

                {detail.redemptions?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Récompenses échangées</p>
                    {detail.redemptions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg p-2" style={{ backgroundColor: 'var(--surface)' }}>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {r.quantity > 1 ? `${r.quantity} × ` : ''}{r.title}
                        </p>
                        <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {new Date(r.redeemed_at).toLocaleDateString('fr-FR')} · −{r.cost_at_redemption}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Objectifs quotidiens par type</p>
                <TypeQuotasForm commercialId={commercial.id} onSaved={onQuotaUpdated} />
              </div>
            </div>
          </div>
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
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Données Odoo — CRM &amp; Ventes</p>
        {!loading && !error && (
          <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            En direct
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs py-4" style={{ color: 'var(--text-muted)' }}>
          <Spinner size={14} color={ACCENT} />
          Connexion à Odoo...
        </div>
      )}

      {!loading && error && (
        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          Impossible de récupérer les données Odoo pour l'instant. Vérifie que le serveur Odoo est bien accessible.
        </p>
      )}

      {!loading && !error && stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 sm:p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <p className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.devis}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Devis</p>
          </div>
          <div className="rounded-xl p-3 sm:p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <p className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.commandes}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Commandes</p>
          </div>
          <div className="rounded-xl p-3 sm:p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <p className="text-xl sm:text-2xl font-semibold break-words" style={{ color: ACCENT }}>{formatMAD(stats.chiffreAffaires)}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Chiffre d'affaires</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CommercialRow({ c, onSelect, index }) {
  return (
    <button
      onClick={() => onSelect(c)}
      className="rounded-2xl p-4 transition-all text-left flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: `riseIn 0.3s ease ${index * 0.04}s both` }}
    >
      <div className="flex items-center gap-3 sm:w-44 shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
          {c.nom?.charAt(0).toUpperCase()}
        </div>
        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.nom}</p>
      </div>

      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['appel', 'rdv', 'devis', 'commande'].map((type) => {
          const current = Number(c[`today_${type}`] || 0);
          const target = Number(c[`target_${type}`] || 1);
          const percent = Math.min(Math.round((current / target) * 100), 100);
          return (
            <div key={type}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon name={type} size={11} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{current}/{target}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-strong)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(percent, current > 0 ? 6 : 0)}%`, backgroundColor: progressColor(percent) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </button>
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
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}18, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`, filter: 'blur(6px)' }}
      />

      <div className="max-w-6xl mx-auto flex flex-col gap-5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Administration — Commerciaux</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Activité, objectifs et rapports</p>
          </div>

          {/* Toolbar visible à partir de sm */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <button
              onClick={handleDownloadReport}
              className="text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all hover:brightness-110"
              style={{ backgroundColor: ACCENT, color: '#fff', boxShadow: `0 2px 10px ${ACCENT}40` }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Rapport
            </button>
          </div>

          {/* Hamburger sur mobile */}
          <div className="relative sm:hidden shrink-0">
            <button
              onClick={() => setAdminMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              aria-label="Menu admin"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {adminMenuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
              </svg>
            </button>

            {adminMenuOpen && (
              <div
                className="absolute right-0 top-11 w-56 rounded-xl shadow-xl z-40 p-2 flex flex-col gap-1"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setAdminMenuOpen(false)}
                    className="text-xs px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={handleDownloadReport}
                  className="text-xs px-3 py-2.5 rounded-lg font-medium flex items-center gap-1.5 mt-1"
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
            <p className="text-sm text-center mt-10" style={{ color: 'var(--text-muted)' }}>Aucun commercial pour l'instant</p>
          )}
          {commercials.map((c, i) => (
            <CommercialRow key={c.id} c={c} index={i} onSelect={setSelected} />
          ))}
        </div>
      </div>

      {selected && (
        <CommercialDetail
          commercial={selected}
          onClose={() => setSelected(null)}
          onQuotaUpdated={loadCommercials}
        />
      )}

      <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default AdminDashboard;