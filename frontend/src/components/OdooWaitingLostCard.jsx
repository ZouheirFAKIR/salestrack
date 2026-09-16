import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StatBox({ value, label, color }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--surface-alt, rgba(248,102,53,0.08))' }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function OdooWaitingLostCard({ commercialId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commercialId) return;
    apiFetch(`${API_URL}/api/odoo/waiting-lost/${commercialId}`)
      .then((r) => r.json())
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [commercialId]);

  if (loading) {
    return (
      <div className="rounded-xl p-4 sm:p-5 flex justify-center py-10" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Spinner size={20} color={ACCENT} />
      </div>
    );
  }

  if (!data || !data.linked) return null;

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Liste d'attente & Pipeline (Odoo)</p>

      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Liste d'attente</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBox value={data.waitingActive} label="En attente" color={ACCENT} />
        <StatBox value={data.waitingLost} label="Perdues" color="#e05c5c" />
      </div>

      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Pipeline</p>
      <div className="grid grid-cols-2 gap-3">
        <StatBox value={data.pipelineActive} label="Actives" color={ACCENT} />
        <StatBox value={data.pipelineLost} label="Perdues" color="#e05c5c" />
      </div>
    </div>
  );
}

export default OdooWaitingLostCard;