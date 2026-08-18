import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';
import LineChart from '../../components/LineChart';

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
        className="w-full text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: saved ? '#22c55e' : ACCENT }}
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

  const icons = { appel: '📞', rdv: '📅', devis: '📄', commande: '🛒' };
  const labels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white font-semibold">{commercial.nom}</p>
            <p className="text-white/40 text-xs">{commercial.email}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        {loading && <Spinner size={24} color={ACCENT} />}

        {!loading && detail && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {['appel', 'rdv', 'devis', 'commande'].map((type) => {
                const stat = detail.stats.find((s) => s.type === type);
                return (
                  <div key={type} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xl">{icons[type]}</p>
                    <p className="text-xl font-semibold text-white mt-1">{stat?.total || 0}</p>
                    <p className="text-[11px] text-white/40">{labels[type]}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
              <p className="text-sm text-white/50 mb-3">Activités (7 derniers jours)</p>
              <LineChart data={detail.daily} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">Objectifs quotidiens par type</p>
              <TypeQuotasForm commercialId={commercial.id} onSaved={onQuotaUpdated} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [commercials, setCommercials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

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
      });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Administration — Commerciaux</h1>
            <p className="text-white/40 text-xs">Activité, objectifs et rapports</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/courses" className="text-xs px-3 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
              Gérer les cours
            </Link>
            <button
              onClick={handleDownloadReport}
              className="text-xs px-3 py-2 rounded-lg text-white font-medium flex items-center gap-1.5"
              style={{ backgroundColor: ACCENT }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Télécharger le rapport
            </button>
          </div>
        </div>

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
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-orange-400/50 transition-all text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: ACCENT }}>
                  {c.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{c.nom}</p>
                  <p className="text-white/40 text-xs">{c.total_activities} activités au total</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: ACCENT }}>{c.today_activities}/{c.daily_target}</p>
                  <div className="w-20 bg-white/10 rounded-full h-1.5 mt-1">
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