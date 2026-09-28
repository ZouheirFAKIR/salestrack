import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function TeamOdooSummaryCard() {
  const [refDate, setRefDate] = useState(() => new Date());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiFetch(`${API_URL}/api/odoo/team-today?date=${toISO(refDate)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Odoo indisponible');
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [refDate]);

  const shift = (dir) => {
    const d = new Date(refDate);
    d.setDate(d.getDate() + dir);
    setRefDate(d);
  };

  const isToday = toISO(refDate) === toISO(new Date());
  const periodLabel = isToday
    ? "Aujourd'hui"
    : refDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

  const formatMAD = (n) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Équipe — devis, commandes &amp; CA (Odoo)</p>

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

      {loading && (
        <div className="flex items-center gap-2 text-xs py-4" style={{ color: 'var(--text-muted)' }}>
          <Spinner size={14} color={ACCENT} />
          Connexion à Odoo...
        </div>
      )}

      {!loading && error && (
        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          Impossible de récupérer les données Odoo pour l'instant.
        </p>
      )}

      {!loading && !error && stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 sm:p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <p className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.devis}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Devis</p>
          </div>
          <div className="rounded-xl p-3 sm:p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <p className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.commandes}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Commandes</p>
          </div>
          <div className="rounded-xl p-3 sm:p-4 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <p className="text-xl sm:text-2xl font-semibold break-words" style={{ color: ACCENT }}>{formatMAD(stats.chiffreAffaires)}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Chiffre d'affaires</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamOdooSummaryCard;