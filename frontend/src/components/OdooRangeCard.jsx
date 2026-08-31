import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from './Spinner';
import MultiLineChart from './MultiLineChart';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERIODS = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseLocalDate(dateStr) {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 2) return new Date(parts[0], parts[1] - 1, 1);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getRange(period, refDate) {
  const d = new Date(refDate);
  if (period === 'day') return { start: toISO(d), end: toISO(d), groupBy: 'day' };
  if (period === 'week') {
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toISO(monday), end: toISO(sunday), groupBy: 'day' };
  }
  if (period === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: toISO(first), end: toISO(last), groupBy: 'day' };
  }
  const first = new Date(d.getFullYear(), 0, 1);
  const last = new Date(d.getFullYear(), 11, 31);
  return { start: toISO(first), end: toISO(last), groupBy: 'month' };
}

function shiftDate(period, refDate, dir) {
  const d = new Date(refDate);
  if (period === 'day') d.setDate(d.getDate() + dir);
  else if (period === 'week') d.setDate(d.getDate() + dir * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

function formatPeriodLabel(period, refDate) {
  const d = new Date(refDate);
  if (period === 'day') return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (period === 'week') {
    const { start, end } = getRange('week', refDate);
    return `${parseLocalDate(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${parseLocalDate(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  }
  if (period === 'month') return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return String(d.getFullYear());
}

function OdooRangeCard({ commercialId }) {
  const [period, setPeriod] = useState('week');
  const [refDate, setRefDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [data, setData] = useState([]);
  const [linked, setLinked] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commercialId) return;
    setLoading(true);
    const { start, end, groupBy } = getRange(period, refDate);
    apiFetch(`${API_URL}/api/odoo/range/${commercialId}?start=${start}&end=${end}&groupBy=${groupBy}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.linked) setData(res.data);
        else setLinked(false);
        setLoading(false);
      })
      .catch(() => { setLinked(false); setLoading(false); });
  }, [commercialId, period, refDate]);

  if (!linked) return null;

  const totalDevis = data.reduce((s, d) => s + d.devis, 0);
  const totalCommande = data.reduce((s, d) => s + d.commande, 0);
  const totalCA = data.reduce((s, d) => s + d.chiffreAffaires, 0);
  const formatMAD = (n) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Devis &amp; commandes réels (Odoo)</p>

      <div className="flex items-center justify-center gap-3 mb-3">
        <button onClick={() => setRefDate(shiftDate(period, refDate, -1))} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>‹</button>
        <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{formatPeriodLabel(period, refDate)}</p>
        <button onClick={() => setRefDate(shiftDate(period, refDate, 1))} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>›</button>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size={20} color={ACCENT} /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{totalDevis}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Devis</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{totalCommande}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Commandes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold break-words" style={{ color: ACCENT }}>{formatMAD(totalCA)}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Chiffre d'affaires</p>
            </div>
          </div>

          {period !== 'day' && data.length > 0 && (
            <MultiLineChart
              data={data}
              labelKey="periode"
              formatLabel={(d) => period === 'year'
                ? parseLocalDate(d).toLocaleDateString('fr-FR', { month: 'short' })
                : parseLocalDate(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            />
          )}
        </>
      )}
    </div>
  );
}

export default OdooRangeCard;