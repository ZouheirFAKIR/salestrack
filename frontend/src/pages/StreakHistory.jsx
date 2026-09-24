import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from '../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function StreakHistory() {
  const [refDate, setRefDate] = useState(() => new Date());
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/activities/streak-history`)
      .then((r) => r.json())
      .then((res) => {
        setHistory(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeDates = new Set(history.map((h) => h.date));
  const streakByDate = {};
  history.forEach((h) => { streakByDate[h.date] = h.streak_value; });

  const todayISO = toISO(new Date());
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= lastOfMonth.getDate(); day++) cells.push(new Date(year, month, day));

  const shiftMonth = (dir) => setRefDate(new Date(year, month + dir, 1));
  const monthLabel = refDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const currentStreakValue = history.length > 0 ? history[history.length - 1].streak_value : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🔥</span>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Historique de série</h1>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Les weekends ne comptent pas et ne cassent pas ta série.</p>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-bold" style={{ color: ACCENT }}>{currentStreakValue}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Série actuelle</p>
        </div>
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{history.length}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Jours actifs</p>
        </div>
      </div>

      <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <button onClick={() => shiftMonth(-1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>‹</button>
          <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{monthLabel}</p>
          <button onClick={() => shiftMonth(1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>›</button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Spinner size={20} color={ACCENT} /></div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {WEEKDAY_LABELS.map((l, i) => (
                <p key={i} className="text-center text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{l}</p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const iso = toISO(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isFuture = iso > todayISO;
                const isActive = activeDates.has(iso);
                const isToday = iso === todayISO;

                let bg = 'var(--surface-strong)';
                let color = 'var(--text-muted)';
                if (isWeekend) { bg = 'transparent'; }
                else if (isFuture) { bg = 'var(--surface-strong)'; }
                else if (isActive) { bg = ACCENT; color = '#fff'; }
                else { bg = 'rgba(239, 68, 68, 0.12)'; color = '#ef4444'; }

                return (
                  <div
                    key={i}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center"
                    style={{ backgroundColor: bg, color, border: isToday ? `2px solid ${ACCENT}` : '1px solid transparent' }}
                    title={isWeekend ? 'Weekend (ignoré)' : isActive ? `Actif — série ${streakByDate[iso]}` : isFuture ? '' : 'Manqué'}
                  >
                    <span className="text-xs font-semibold">{date.getDate()}</span>
                    {isActive && <span className="text-[9px]">🔥</span>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md" style={{ backgroundColor: ACCENT }} />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Actif</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Manqué</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md" style={{ border: '1px solid var(--border)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Weekend</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StreakHistory;