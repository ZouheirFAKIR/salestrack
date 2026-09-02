import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';
import ActivityMultiChart from './ActivityMultiChart';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function OdooActivitiesChartCard({ commercialId }) {
  const [endDate, setEndDate] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commercialId) return;
    setLoading(true);
    const endStr = toISO(endDate);
    apiFetch(`${API_URL}/api/odoo/activities-daily/${commercialId}?days=7&end=${endStr}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [commercialId, endDate]);

  const shift = (dir) => {
    const d = new Date(endDate);
    d.setDate(d.getDate() + dir * 7);
    setEndDate(d);
  };

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  const periodLabel = `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} — ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (!commercialId) return null;

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Activités Odoo par catégorie</p>

      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        <button onClick={() => shift(-1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>‹</button>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{periodLabel}</p>
        <button onClick={() => shift(1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>›</button>
        <input
          type="date"
          value={toISO(endDate)}
          onChange={(e) => e.target.value && setEndDate(new Date(`${e.target.value}T00:00:00`))}
          className="text-xs px-2 py-1 rounded-lg ml-2"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-strong)', color: 'var(--text-primary)' }}
        />
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size={20} color={ACCENT} /></div>
      ) : !data || !data.linked || data.daily.length === 0 || data.categories.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aucune activité Odoo sur cette période</p>
      ) : (
        <ActivityMultiChart
          data={data.daily}
          keys={data.categories.map((c) => c.key)}
          labels={data.categories.reduce((acc, c) => ({ ...acc, [c.key]: c.label }), {})}
          labelKey="jour"
          formatLabel={(d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })}
        />
      )}
    </div>
  );
}

export default OdooActivitiesChartCard;
