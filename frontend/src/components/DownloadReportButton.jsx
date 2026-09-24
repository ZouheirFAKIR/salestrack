import { useState } from 'react';
import { API_URL } from '../utils/api';

const ACCENT = '#f86635';
const PERIODS = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadReportButton({ commercialId, commercialNom }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(() => toISO(new Date()));
  const [downloading, setDownloading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/report/period/${commercialId}?period=${period}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${commercialNom.replace(/\s+/g, '-')}-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      alert('Erreur lors du téléchargement du rapport');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer text-white"
        style={{
          backgroundColor: hover || open ? '#e0551f' : ACCENT,
          boxShadow: hover ? '0 4px 12px rgba(248,102,53,0.35)' : '0 1px 3px rgba(248,102,53,0.25)',
          transform: hover ? 'translateY(-1px)' : 'none',
        }}
      >
        <DownloadIcon />
        Rapport
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div
            className="absolute right-0 mt-2 z-20 rounded-2xl p-4 w-64"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }}
          >
            <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-primary)' }}>Période du rapport</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-full transition-colors"
                  style={period === p.key ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: 'var(--surface-strong)', color: 'var(--text-secondary)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg w-full mb-3"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-strong)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-sm w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: ACCENT, opacity: downloading ? 0.6 : 1 }}
            >
              {downloading ? 'Génération...' : (<><DownloadIcon /> Télécharger</>)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DownloadReportButton;