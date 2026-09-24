import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function TeamOdooSummaryCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/odoo/team-today`)
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
  }, []);

  const formatMAD = (n) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Équipe — aujourd'hui (Odoo)</p>

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