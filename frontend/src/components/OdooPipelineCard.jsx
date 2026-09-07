import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';
import DonutChart from './DonutChart';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STAGE_COLORS = ['#f86635', '#3fb8e8', '#a78bfa', '#eab308', '#22c55e', '#ec4899', '#14b8a6'];

function OdooPipelineCard({ commercialId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!commercialId) return;
    apiFetch(`${API_URL}/api/odoo/pipeline/${commercialId}`)
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

  if (!data || !data.linked || data.total === 0) return null;

  const stageData = data.byStage.map((s, i) => ({
    label: s.name,
    value: s.count,
    percent: s.percent,
    color: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Pipeline d'opportunités (Odoo)</p>

      <div className="flex flex-col sm:flex-row items-center gap-6 mb-5">
        <div className="relative shrink-0">
          <DonutChart data={stageData} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.total}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>opportunités</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {stageData.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
              </div>
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>{s.value} ({s.percent}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-secondary)' }}>Suivi des opportunités</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>Avec activité — {data.withActivity} ({data.withActivityPercent}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#9ca3af' }} />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>Sans activité — {data.withoutActivity} ({data.withoutActivityPercent}%)</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden mt-2.5" style={{ backgroundColor: 'var(--surface-strong)' }}>
          <div className="h-full flex">
            <div style={{ width: `${data.withActivityPercent}%`, backgroundColor: '#22c55e' }} />
            <div style={{ width: `${data.withoutActivityPercent}%`, backgroundColor: '#9ca3af' }} />
          </div>
        </div>

        {data.withoutActivityList?.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowList((v) => !v)}
              className="text-xs underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {showList ? 'Masquer' : 'Voir'} la liste ({data.withoutActivityList.length})
            </button>
            {showList && (
              <div className="flex flex-col gap-1 mt-2 max-h-40 overflow-y-auto">
                {data.withoutActivityList.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5" style={{ backgroundColor: 'var(--surface-strong)' }}>
                    <span className="truncate" style={{ color: 'var(--text-primary)' }}>{o.name}</span>
                    <span className="shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{o.stage}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OdooPipelineCard;