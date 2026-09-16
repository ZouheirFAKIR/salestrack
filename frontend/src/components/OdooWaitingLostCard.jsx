import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StatItem({ value, label }) {
  return (
    <div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
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
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Liste d'attente & Pipeline (Odoo)</p>

      <div className="grid grid-cols-4 gap-4">
        <StatItem value={data.waitingActive} label="En attente" />
        <StatItem value={data.waitingLost} label="Perdues" />
        <StatItem value={data.pipelineActive} label="Pipeline actives" />
        <StatItem value={data.pipelineLost} label="Pipeline perdues" />
      </div>
    </div>
  );
}

export default OdooWaitingLostCard;