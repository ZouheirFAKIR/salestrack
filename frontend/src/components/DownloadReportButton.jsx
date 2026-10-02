import { useState } from 'react';
import { API_URL } from '../utils/api';

const ACCENT = '#f86635';

const PERIODS = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
  { key: 'global', label: 'Global' },
];

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const QUARTERS = [
  { label: 'T1', sub: 'Janv. – Mars', start: 0 },
  { label: 'T2', sub: 'Avr. – Juin', start: 3 },
  { label: 'T3', sub: 'Juil. – Sept.', start: 6 },
  { label: 'T4', sub: 'Oct. – Déc.', start: 9 },
];

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}
function fmtShort(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stepper({ label, onPrev, onNext, disableNext }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 mb-2" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      <button onClick={onPrev} className="w-7 h-7 rounded-full flex items-center justify-center text-base" style={{ color: 'var(--text-secondary)' }}>‹</button>
      <span className="text-sm font-medium text-center" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <button
        onClick={onNext}
        disabled={disableNext}
        className="w-7 h-7 rounded-full flex items-center justify-center text-base disabled:opacity-25"
        style={{ color: 'var(--text-secondary)' }}
      >
        ›
      </button>
    </div>
  );
}

function optionStyle(active, disabled) {
  if (disabled) return { backgroundColor: 'var(--surface-strong)', color: 'var(--text-muted)', opacity: 0.4, cursor: 'not-allowed' };
  return active
    ? { backgroundColor: ACCENT, color: '#fff' }
    : { backgroundColor: 'var(--surface-strong)', color: 'var(--text-secondary)', border: '1px solid var(--border)' };
}

function DownloadReportButton({ commercialId, commercialNom = '', self = false }) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const currentMonday = mondayOf(now);

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState('day');

  const [day, setDay] = useState(toISO(now));
  const [weekStart, setWeekStart] = useState(currentMonday);
  const [monthYear, setMonthYear] = useState(thisYear);
  const [month, setMonth] = useState({ y: thisYear, m: thisMonth });
  const [quarterYear, setQuarterYear] = useState(thisYear);
  const [quarterStart, setQuarterStart] = useState({ y: thisYear, m: Math.floor(thisMonth / 3) * 3 });
  const [year, setYear] = useState(thisYear);

  const isFutureMonth = (y, m) => y > thisYear || (y === thisYear && m > thisMonth);
  const inQuarter = (y, m) => {
    const idx = y * 12 + m;
    const s = quarterStart.y * 12 + quarterStart.m;
    return idx >= s && idx < s + 3;
  };

  // Date envoyée au serveur + phrase de résumé
  let refDate = day;
  let summary = '';
  if (period === 'day') {
    summary = new Date(`${day}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } else if (period === 'week') {
    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
    refDate = toISO(weekStart);
    summary = `Semaine du ${fmtShort(weekStart)} au ${fmtShort(end)} ${end.getFullYear()}`;
  } else if (period === 'month') {
    refDate = `${month.y}-${pad(month.m + 1)}-01`;
    summary = `${MONTHS_LONG[month.m]} ${month.y}`;
  } else if (period === 'quarter') {
    const endD = new Date(quarterStart.y, quarterStart.m + 2, 1);
    refDate = `${quarterStart.y}-${pad(quarterStart.m + 1)}-01`;
    summary = `${MONTHS_LONG[quarterStart.m]} ${quarterStart.y} → ${MONTHS_LONG[endD.getMonth()]} ${endD.getFullYear()}`;
  } else if (period === 'year') {
    refDate = `${year}-01-01`;
    summary = `Année ${year}`;
  } else {
    summary = "Toute l'activité depuis le début";
  }

  const shiftWeek = (dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      let url;
      if (period === 'global') {
        url = self
          ? `${API_URL}/api/activities/report/global`
          : `${API_URL}/api/admin/report/global/${commercialId}`;
      } else {
        url = self
          ? `${API_URL}/api/activities/report/period?period=${period}&date=${refDate}`
          : `${API_URL}/api/admin/report/period/${commercialId}?period=${period}&date=${refDate}`;
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `rapport-${commercialNom.replace(/\s+/g, '-')}-${period === 'global' ? 'global' : `${period}-${refDate}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
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
        className="text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
        style={{
          color: '#fff',
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
          <div className="fixed inset-0 z-[80] bg-black/40 sm:bg-transparent" onClick={() => setOpen(false)} />

          <div
            className="fixed left-3 right-3 top-1/2 -translate-y-1/2 z-[81] max-h-[85vh] overflow-y-auto rounded-2xl p-4
                       sm:absolute sm:left-auto sm:right-0 sm:top-full sm:translate-y-0 sm:mt-2 sm:w-80 sm:max-h-none sm:overflow-visible"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                Rapport{commercialNom ? ` — ${commercialNom}` : ''}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-base sm:hidden"
                style={{ backgroundColor: 'var(--surface-strong)', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            {/* Choix du type de période */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="text-[11px] font-medium py-1.5 rounded-full transition-colors"
                  style={optionStyle(period === p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* JOUR */}
            {period === 'day' && (
              <div className="mb-3">
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Choisis le jour</p>
                <input
                  type="date"
                  value={day}
                  max={toISO(now)}
                  onChange={(e) => e.target.value && setDay(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg w-full"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-strong)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {/* SEMAINE */}
            {period === 'week' && (
              <div className="mb-3">
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Choisis la semaine (lundi → dimanche)</p>
                <Stepper
                  label={(() => {
                    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
                    return `${fmtShort(weekStart)} → ${fmtShort(end)} ${end.getFullYear()}`;
                  })()}
                  onPrev={() => shiftWeek(-1)}
                  onNext={() => shiftWeek(1)}
                  disableNext={weekStart >= currentMonday}
                />
                <button
                  onClick={() => setWeekStart(currentMonday)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full w-full"
                  style={optionStyle(toISO(weekStart) === toISO(currentMonday))}
                >
                  Cette semaine
                </button>
              </div>
            )}

            {/* MOIS */}
            {period === 'month' && (
              <div className="mb-3">
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Choisis le mois</p>
                <Stepper
                  label={String(monthYear)}
                  onPrev={() => setMonthYear((y) => y - 1)}
                  onNext={() => setMonthYear((y) => y + 1)}
                  disableNext={monthYear >= thisYear}
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map((label, m) => {
                    const disabled = isFutureMonth(monthYear, m);
                    return (
                      <button
                        key={label}
                        disabled={disabled}
                        onClick={() => setMonth({ y: monthYear, m })}
                        className="text-[11px] font-medium py-1.5 rounded-lg"
                        style={optionStyle(month.y === monthYear && month.m === m, disabled)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TRIMESTRE */}
            {period === 'quarter' && (
              <div className="mb-3">
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Choisis un trimestre, ou le 1er mois de tes 3 mois</p>
                <Stepper
                  label={String(quarterYear)}
                  onPrev={() => setQuarterYear((y) => y - 1)}
                  onNext={() => setQuarterYear((y) => y + 1)}
                  disableNext={quarterYear >= thisYear}
                />
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {QUARTERS.map((q) => {
                    const disabled = isFutureMonth(quarterYear, q.start);
                    const active = quarterStart.y === quarterYear && quarterStart.m === q.start;
                    return (
                      <button
                        key={q.label}
                        disabled={disabled}
                        onClick={() => setQuarterStart({ y: quarterYear, m: q.start })}
                        className="py-1.5 rounded-lg flex flex-col items-center"
                        style={optionStyle(active, disabled)}
                        title={q.sub}
                      >
                        <span className="text-[11px] font-semibold">{q.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map((label, m) => {
                    const disabled = isFutureMonth(quarterYear, m);
                    const selected = inQuarter(quarterYear, m);
                    return (
                      <button
                        key={label}
                        disabled={disabled}
                        onClick={() => setQuarterStart({ y: quarterYear, m })}
                        className="text-[11px] font-medium py-1.5 rounded-lg"
                        style={selected && !disabled
                          ? { backgroundColor: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}` }
                          : optionStyle(false, disabled)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ANNÉE */}
            {period === 'year' && (
              <div className="mb-3">
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Choisis l'année</p>
                <Stepper
                  label={String(year)}
                  onPrev={() => setYear((y) => y - 1)}
                  onNext={() => setYear((y) => y + 1)}
                  disableNext={year >= thisYear}
                />
              </div>
            )}

            {/* GLOBAL */}
            {period === 'global' && (
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                Le rapport global contient toute l'activité, sans limite de date.
              </p>
            )}

            {/* Résumé */}
            <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Rapport pour</p>
              <p className="text-xs font-semibold capitalize" style={{ color: ACCENT }}>{summary}</p>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-sm w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
              style={{ backgroundColor: ACCENT, color: '#fff', opacity: downloading ? 0.6 : 1 }}
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