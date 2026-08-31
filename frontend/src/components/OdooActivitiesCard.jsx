import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CATEGORY_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#22c55e', '#eab308', '#ef4444'];

function OdooActivitiesCard({ commercialId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commercialId) return;
    apiFetch(`${API_URL}/api/odoo/activities/${commercialId}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [commercialId]);

  if (loading) {
    return (
      <div className="rounded-xl p-4 sm:p-5 flex justify-center py-10" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Spinner size={20} color={ACCENT} />
      </div>
    );
  }

  if (!data || !data.linked || data.total === 0) return null;

  const maxCount = Math.max(...data.byCategory.map((c) => c.planned + c.overdue + c.done), 1);

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Activités Odoo (appels &amp; tâches)</p>
      <p className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {data.total} activités
      </p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{data.planned}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Prévues</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <p className="text-lg font-semibold" style={{ color: '#22c55e' }}>{data.done}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Terminées</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: `1px solid ${data.overdue > 0 ? '#ef444455' : 'var(--border)'}` }}>
          <p className="text-lg font-semibold" style={{ color: data.overdue > 0 ? '#ef4444' : 'var(--text-primary)' }}>{data.overdue}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>En retard</p>
        </div>
      </div>

      <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Par catégorie</p>
      <div className="flex flex-col gap-2.5">
        {data.byCategory.map((cat, i) => {
          const total = cat.planned + cat.overdue + cat.done;
          const percent = Math.round((total / maxCount) * 100);
          return (
            <div key={cat.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{cat.type}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{total}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--surface-strong)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OdooActivitiesCard;