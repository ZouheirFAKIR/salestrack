import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';
import UserBarChart from './UserBarChart';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function TeamOdooTrendCard() {
  const [refDate, setRefDate] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`${API_URL}/api/odoo/team-day?date=${toISO(refDate)}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refDate]);

  const shift = (dir) => {
    const d = new Date(refDate);
    d.setDate(d.getDate() + dir);
    setRefDate(d);
  };

  const periodLabel = refDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Équipe — devis &amp; commandes par commercial (Odoo)</p>

      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        <button onClick={() => shift(-1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>‹</button>
        <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{periodLabel}</p>
        <button onClick={() => shift(1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>›</button>
        <input
          type="date"
          value={toISO(refDate)}
          onChange={(e) => e.target.value && setRefDate(new Date(`${e.target.value}T00:00:00`))}
          className="text-xs px-2 py-1 rounded-lg ml-2"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-strong)', color: 'var(--text-primary)' }}
        />
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size={20} color={ACCENT} /></div>
      ) : !data || !data.linked || data.byUser.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aucun commercial lié à Odoo</p>
      ) : (
        <UserBarChart byUser={data.byUser} />
      )}
    </div>
  );
}

export default TeamOdooTrendCard;