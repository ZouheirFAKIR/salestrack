import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StatsPopup({ commercialId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/odoo/stats/${commercialId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [commercialId]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="rounded-2xl p-6 max-w-xs w-full text-center"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && <Spinner size={20} color={ACCENT} />}
        {!loading && data && !data.linked && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pas encore lié à Odoo</p>
        )}
        {!loading && data && data.linked && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aujourd'hui</p>
            <div className="flex justify-around">
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.devis}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Devis</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.commandes}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Commandes</p>
              </div>
            </div>
          </div>
        )}
        <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg mt-4 font-medium" style={{ backgroundColor: ACCENT, color: '#fff' }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

function AdminOdooMapping() {
  const [commercials, setCommercials] = useState([]);
  const [odooUsers, setOdooUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [statsFor, setStatsFor] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/odoo/commercials`).then((r) => r.json()),
      apiFetch(`${API_URL}/api/odoo/users`).then((r) => r.json()),
    ])
      .then(([commercialsData, odooData]) => {
        if (odooData.error) {
          setError(odooData.error);
        } else {
          setCommercials(commercialsData);
          setOdooUsers(odooData);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de contacter le serveur');
        setLoading(false);
      });
  }, []);

  const handleChange = async (commercialId, odooUserId) => {
    setSavingId(commercialId);
    try {
      await apiFetch(`${API_URL}/api/odoo/mapping`, {
        method: 'POST',
        body: JSON.stringify({ commercialId, odooUserId: odooUserId || null }),
      });
      setCommercials((prev) =>
        prev.map((c) => (c.id === commercialId ? { ...c, odoo_user_id: odooUserId ? Number(odooUserId) : null } : c))
      );
    } catch (err) {
      console.error(err);
    }
    setSavingId(null);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Liaison Odoo</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Associe chaque commercial SalesTrack à son compte vendeur Odoo pour afficher ses devis, commandes et chiffre d'affaires.
          </p>
        </div>

        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#f4363622', color: '#f43636', border: '1px solid #f4363644' }}>
            {error}
          </div>
        )}

        {!error && (
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-4">
              {commercials.map((c) => (
                <div key={c.id} className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.nom}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.odoo_user_id && (
                      <button
                        onClick={() => setStatsFor(c.id)}
                        className="text-xs px-3 py-2 rounded-lg font-medium"
                        style={{ backgroundColor: ACCENT, color: '#fff' }}
                      >
                        Voir
                      </button>
                    )}
                    {savingId === c.id && <Spinner size={14} color={ACCENT} />}
                    <select
                      value={c.odoo_user_id || ''}
                      onChange={(e) => handleChange(c.id, e.target.value)}
                      className="text-sm px-3 py-2 rounded-lg outline-none"
                      style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Non lié</option>
                      {odooUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {statsFor && <StatsPopup commercialId={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}

export default AdminOdooMapping;