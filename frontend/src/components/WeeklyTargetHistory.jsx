import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

const ACCENT = '#f86635';

function WeeklyTargetHistory() {
  const [data, setData] = useState([]);

  useEffect(() => {
    apiFetch('${API_URL}/api/activities/weekly-target')
      .then((r) => r.json())
      .then(setData);
  }, []);

  const jourFr = (dateStr) => new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long' });
  const isToday = (dateStr) => dateStr === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-sm text-white/50 mb-4">Historique des objectifs</p>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div
            key={d.jour}
            className="flex items-center justify-between py-2 px-3 rounded-lg"
            style={{
              backgroundColor: isToday(d.jour) ? 'rgba(248,102,53,0.08)' : 'transparent',
              animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
            }}
          >
            <span className="text-sm text-white/70 capitalize">
              {isToday(d.jour) ? "Aujourd'hui" : jourFr(d.jour)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: d.atteint ? ACCENT : 'rgba(255,255,255,0.5)' }}>
                {d.total}/{d.target}
              </span>
              {d.atteint && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}

export default WeeklyTargetHistory;