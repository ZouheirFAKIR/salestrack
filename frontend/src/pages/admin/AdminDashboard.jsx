import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';
import LineChart from '../../components/LineChart';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CommercialDetail({ commercial, onClose, onQuotaUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newQuota, setNewQuota] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/commercials/${commercial.id}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setNewQuota(data.daily_target);
        setLoading(false);
      });
  }, [commercial.id]);

  const handleSaveQuota = async () => {
    setSaving(true);
    await apiFetch(`${API_URL}/api/admin/commercials/${commercial.id}/quota`, {
      method: 'PUT',
      body: JSON.stringify({ daily_target: Number(newQuota) }),
    });
    setSaving(false);
    onQuotaUpdated();
  };

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
              <p className="text-sm font-medium text-white mb-3">Objectif quotidien (quota)</p>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" value={newQuota}
                  onChange={(e) => setNewQuota(e.target.value)}
                  className="w-24 p-2 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60"
                />
                <button
                  onClick={handleSaveQuota}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2"
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving && <Spinner size={12} color="#fff" />}
                  Enregistrer
                </button>
              </div>
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
            <p className="text-white/40 text-xs">Activité, quotas et rapports</p>
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
          onQuotaUpdated={() => { loadCommercials(); setSelected(null); }}
        />
      )}
    </div>
  );
}

export default AdminDashboard;