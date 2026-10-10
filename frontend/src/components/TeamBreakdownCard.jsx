import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, API_URL } from '../utils/api';
import { Icon } from '../data/icons';
import { TYPE_COLORS } from '../data/typeColors';
import Spinner from './Spinner';
import { SplitBarCard, GaugeCard, DotsCard, StageBarsCard } from './MiniCharts';
import DownloadReportButton from './DownloadReportButton';

const ACCENT = '#f86635';
const GRAY = '#9ca3af';
const GREEN = '#22c55e';
const RED = '#ef4444';
const BLUE = '#3b82f6';
const PURPLE = '#a78bfa';
const ORANGE = '#f59e0b';
const TEAL = '#14b8a6';
const STAGE_COLORS = ['#3b82f6', '#a78bfa', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#f86635'];

const PERIODS = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
  { key: 'global', label: 'Tout' },
];

const QUOTA_TYPES = ['appel', 'rdv', 'devis', 'commande', 'ca'];
const QUOTA_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes', ca: "Chiffre d'affaires" };
const QUARTER_NAMES = ['janv. – mars', 'avr. – juin', 'juil. – sept.', 'oct. – déc.'];

// Rangée qui défile sur le côté (sans barre visible) sur téléphone
const SCROLL_ROW = 'flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

// ---------- Dates ----------
function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toMonth(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function toWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${pad(w)}`;
}
function weekToDate(s) {
  const [y, w] = s.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const day = jan4.getDay() || 7;
  return new Date(y, 0, 4 - day + 1 + (w - 1) * 7);
}
function quarterStart(d) { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); }
function periodStart(period, d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (period === 'week') { const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); }
  if (period === 'month') x.setDate(1);
  if (period === 'quarter') return quarterStart(x);
  if (period === 'year') { x.setMonth(0); x.setDate(1); }
  return x;
}
function shiftDate(period, d, dir) {
  const x = new Date(d);
  if (period === 'day') x.setDate(x.getDate() + dir);
  if (period === 'week') x.setDate(x.getDate() + dir * 7);
  if (period === 'month') x.setMonth(x.getMonth() + dir);
  if (period === 'quarter') x.setMonth(x.getMonth() + dir * 3);
  if (period === 'year') x.setFullYear(x.getFullYear() + dir);
  return x;
}
function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR'); }
function fmtK(n) {
  const v = Math.round(Number(n) || 0);
  if (v < 1000) return String(v);
  return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.0', '')}k`;
}

function withOther(list, other) {
  return other > 0 ? [...list, { label: 'Non précisé', value: other, color: GRAY }] : list;
}

// ---------- Petits composants ----------
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
      style={active
        ? { backgroundColor: ACCENT, color: '#fff' }
        : { backgroundColor: 'var(--surface-strong)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
    >
      {children}
    </button>
  );
}

const inputStyle = {
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface-strong)',
  color: 'var(--text-primary)',
};

function PeriodPicker({ period, refDate, onChange }) {
  const today = new Date();
  const cls = 'text-xs px-3 py-1.5 rounded-lg outline-none flex-1 min-w-0 sm:flex-none';

  if (period === 'day') {
    return (
      <input type="date" className={cls} style={inputStyle} max={toISO(today)} value={toISO(refDate)}
        onChange={(e) => e.target.value && onChange(new Date(`${e.target.value}T00:00:00`))} />
    );
  }
  if (period === 'week') {
    return (
      <input type="week" className={cls} style={inputStyle} max={toWeek(today)} value={toWeek(refDate)}
        onChange={(e) => e.target.value && onChange(weekToDate(e.target.value))} />
    );
  }
  if (period === 'month') {
    return (
      <input type="month" className={cls} style={inputStyle} max={toMonth(today)} value={toMonth(refDate)}
        onChange={(e) => e.target.value && onChange(new Date(`${e.target.value}-01T00:00:00`))} />
    );
  }
  if (period === 'quarter') {
    const options = [];
    let q = quarterStart(today);
    for (let i = 0; i < 8; i++) {
      options.push(q);
      q = new Date(q.getFullYear(), q.getMonth() - 3, 1);
    }
    return (
      <select className={cls} style={inputStyle} value={toISO(quarterStart(refDate))}
        onChange={(e) => onChange(new Date(`${e.target.value}T00:00:00`))}>
        {options.map((o) => (
          <option key={toISO(o)} value={toISO(o)}>
            T{Math.floor(o.getMonth() / 3) + 1} {o.getFullYear()} ({QUARTER_NAMES[Math.floor(o.getMonth() / 3)]})
          </option>
        ))}
      </select>
    );
  }
  if (period === 'year') {
    const years = [0, 1, 2, 3, 4].map((i) => today.getFullYear() - i);
    return (
      <select className={cls} style={inputStyle} value={refDate.getFullYear()}
        onChange={(e) => onChange(new Date(Number(e.target.value), 0, 1))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    );
  }
  return null;
}

function Box({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 min-w-0" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      <div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, color, sub, className = '' }) {
  return (
    <div className={`rounded-xl p-3 min-w-0 ${className}`} style={{ backgroundColor: `${ACCENT}0d`, border: '1px solid var(--border)' }}>
      <p className="text-lg sm:text-xl font-semibold truncate" style={{ color }}>{value}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>
    </div>
  );
}

function Ring({ type, current, target }) {
  const color = TYPE_COLORS[type];
  const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const c = 2 * Math.PI * 26;
  const shown = Math.max(percent, 4);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-1">
        <svg viewBox="0 0 64 64" className="w-14 h-14 sm:w-16 sm:h-16 -rotate-90">
          <circle cx="32" cy="32" r="26" stroke="var(--border)" strokeWidth="5" fill="none" />
          <circle cx="32" cy="32" r="26" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name={type} size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {type === 'ca' ? `${fmtK(current)}/${fmtK(target)}` : `${current}/${target}`}
      </p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{QUOTA_LABELS[type]}</p>
    </div>
  );
}

function MiniBars({ buckets, series }) {
  const scrollRef = useRef(null);
  const max = Math.max(1, ...buckets.flatMap((b) => series.map((s) => b[s.key] || 0)));

  // Toujours démarrer sur les périodes les plus récentes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [buckets]);

  return (
    <div className="min-w-0">
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="flex gap-1" style={{ minWidth: buckets.length * 46 }}>
          {buckets.map((b) => (
            <div
              key={b.key}
              className="flex-1 flex flex-col items-center rounded-md hover:bg-black/5"
              style={{ minWidth: 42 }}
              title={`${b.tableLabel} — ${series.map((s) => `${s.label} : ${b[s.key] || 0}`).join(' · ')}`}
            >
              <div className="h-36 sm:h-40 w-full flex items-end justify-center gap-[3px] border-b" style={{ borderColor: 'var(--border)' }}>
                {series.map((s) => {
                  const v = b[s.key] || 0;
                  return (
                    <div key={s.key} className="flex flex-col items-center justify-end h-full" style={{ width: 14 }}>
                      {v > 0 && (
                        <span className="text-[10px] font-semibold mb-0.5" style={{ color: s.color }}>{v}</span>
                      )}
                      <div
                        style={{
                          height: `${(v / max) * 85}%`,
                          minHeight: v ? 3 : 0,
                          width: '100%',
                          backgroundColor: s.color,
                          borderRadius: '3px 3px 0 0',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="mt-1 text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Carte ----------
const reportCache = new Map();

function TeamBreakdownCard() {
  const [team, setTeam] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [userId, setUserId] = useState(() => Number(localStorage.getItem('teamCardUserId')) || null);
  const [period, setPeriod] = useState('month');
  const [refDate, setRefDate] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const loadTeam = useCallback(() => (
    apiFetch(`${API_URL}/api/admin/team-today-quotas`, { skipCache: true })
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setTeam(list);
        setUserId((current) => current ?? list[0]?.id ?? null);
        if (list.length === 0) setLoading(false);
      })
      .catch(() => setLoading(false))
  ), []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  useEffect(() => {
    if (userId) localStorage.setItem('teamCardUserId', String(userId));
  }, [userId]);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/inactive-commercials`)
      .then((r) => r.json())
      .then((res) => setInactive(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    const key = `${userId}|${period}|${toISO(refDate)}`;
    const cached = reportCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    let cancelled = false;
    apiFetch(`${API_URL}/api/admin/commercials/${userId}/report-data?period=${period}&date=${toISO(refDate)}`, { skipCache: true })
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) reportCache.set(key, res);
        if (!cancelled) { setData(res); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, period, refDate]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await apiFetch(`${API_URL}/api/admin/sync-odoo-activities`, { method: 'POST' });
      const json = await res.json();
      setSyncMsg(`${json.synced || 0} nouvelle(s) activité(s)`);
      await loadTeam();
    } catch {
      setSyncMsg('Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const changePeriod = (p) => {
    setPeriod(p);
    setRefDate(p === 'quarter' ? quarterStart(new Date()) : new Date());
  };

  const canGoNext = period !== 'global' && periodStart(period, shiftDate(period, refDate, 1)) <= new Date();
  const selected = team.find((c) => c.id === userId);
  const selectedInactive = inactive.find((c) => c.id === userId);
  const current = selected || selectedInactive;

  return (
    <div className="rounded-2xl p-3 sm:p-5 min-w-0" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

      {/* 1. Choix du commercial + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className={`${SCROLL_ROW} min-w-0 -mx-1 px-1 pb-1`}>
          {team.map((c) => (
            <Chip key={c.id} active={userId === c.id} onClick={() => setUserId(c.id)}>{c.nom}</Chip>
          ))}
          {inactive.length > 0 && (
            <select
              value={selectedInactive ? userId : ''}
              onChange={(e) => {
                if (!e.target.value) return;
                setUserId(Number(e.target.value));
                setPeriod('global');
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-full outline-none shrink-0 max-w-[200px]"
              style={selectedInactive
                ? { backgroundColor: '#6b7280', color: '#fff' }
                : { backgroundColor: 'var(--surface-strong)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <option value="">Anciens commerciaux ({inactive.length})</option>
              {inactive.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 shrink-0">
          {syncMsg && <span className="text-[10px] mr-auto sm:mr-0" style={{ color: 'var(--text-muted)' }}>{syncMsg}</span>}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-[11px] font-medium px-3 py-2 rounded-lg whitespace-nowrap"
            style={{ backgroundColor: `${ACCENT}14`, color: ACCENT, opacity: syncing ? 0.6 : 1 }}
          >
            {syncing ? 'Synchro...' : 'Synchroniser Odoo'}
          </button>
          {current && <DownloadReportButton commercialId={current.id} commercialNom={current.nom} />}
        </div>
      </div>

      {/* 2. Aujourd'hui face aux objectifs */}
      {selected && (
        <div className="rounded-xl p-3 sm:p-4 mb-4" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            Aujourd'hui — objectifs de {selected.nom.split(' ')[0]}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-2 gap-y-3">
            {QUOTA_TYPES.map((type) => (
              <Ring
                key={type}
                type={type}
                current={Number(selected.today?.[type] || 0)}
                target={Number(selected.quotas?.[type] || 0)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedInactive && (
        <div className="rounded-xl px-3 sm:px-4 py-3 mb-4 flex items-start sm:items-center gap-2 text-xs" style={{ backgroundColor: 'var(--surface-strong)', border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: '#6b7280', color: '#fff' }}>INACTIF</span>
          {selectedInactive.nom} ne fait plus partie de l'équipe. Seules ses données Odoo sont affichées.
        </div>
      )}

      {/* 3. Filtre de période */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-2">
        <div className={`${SCROLL_ROW} -mx-1 px-1 sm:flex-wrap`}>
          {PERIODS.map((p) => (
            <Chip key={p.key} active={period === p.key} onClick={() => changePeriod(p.key)}>{p.label}</Chip>
          ))}
        </div>
        {period !== 'global' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setRefDate((d) => shiftDate(period, d, -1))}
              className="w-8 h-8 sm:w-7 sm:h-7 shrink-0 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >‹</button>
            <PeriodPicker period={period} refDate={refDate} onChange={setRefDate} />
            <button
              onClick={() => canGoNext && setRefDate((d) => shiftDate(period, d, 1))}
              disabled={!canGoNext}
              className="w-8 h-8 sm:w-7 sm:h-7 shrink-0 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >›</button>
          </div>
        )}
      </div>
      {data?.periodLabel && (
        <p className="text-sm font-semibold mb-3 first-letter:uppercase" style={{ color: ACCENT }}>{data.periodLabel}</p>
      )}

      {/* 4. Analyse de la période */}
      {loading || !data ? (
        <div className="py-16 flex justify-center"><Spinner size={20} color={ACCENT} /></div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <Kpi label="Devis" value={data.sales.linked ? fmt(data.sales.devis) : '-'} color={ORANGE} />
            <Kpi label="Commandes" value={data.sales.linked ? fmt(data.sales.commandes) : '-'} color={GREEN} />
            <Kpi label="Chiffre d'affaires" value={data.sales.linked ? `${fmt(data.sales.ca)} MAD` : '-'} color={ACCENT} className="col-span-2 sm:col-span-1" />

            <Kpi label="Appels" value={fmt(data.local.appels)} color={BLUE} />
            <Kpi label="Rendez-vous" value={fmt(data.local.rdv)} color={PURPLE} />
          </div>

          {data.buckets.length > 1 && (
            <Box title={`Devis et commandes par ${data.unit || (data.monthly ? 'mois' : 'jour')}`} subtitle="Glisse sur le côté pour voir les autres périodes">
              <MiniBars
                buckets={data.buckets}
                series={[
                  { key: 'devis', label: 'Devis', color: ORANGE },
                  { key: 'commandes', label: 'Commandes', color: GREEN },
                ]}
              />
            </Box>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 [&>*]:min-w-0">
            <SplitBarCard
              title="Sens des appels"
              unit="appels"
              parts={withOther([
                { label: 'Sortants', value: data.local.sens.sortant, color: BLUE },
                { label: 'Entrants', value: data.local.sens.entrant, color: PURPLE },
              ], data.local.sens.autre)}
            />
            <GaugeCard
              title="Réponse aux appels"
              rateLabel="taux de réponse"
              parts={withOther([
                { label: 'Répondus', value: data.local.reponse.repond, color: GREEN },
                { label: 'Sans réponse', value: data.local.reponse.ne_repond_pas, color: RED },
              ], data.local.reponse.autre)}
            />
            <DotsCard
              title="Présence aux rendez-vous"
              unit="RDV"
              parts={withOther([
                { label: 'Présents', value: data.local.presence.present, color: GREEN },
                { label: 'Absents', value: data.local.presence.absent, color: RED },
              ], data.local.presence.autre)}
            />
          </div>

          {data.acts.linked ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 [&>*]:min-w-0">
              <Box title="Activités Odoo" subtitle={period === 'global' ? 'Toutes les activités' : 'Échéance dans la période'}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-1 gap-y-3">
                  <MiniStat label="Terminées" value={fmt(data.acts.done)} color={GREEN} />
                  <MiniStat label="Prévues" value={fmt(data.acts.planned)} color={BLUE} />
                  <MiniStat label="En retard" value={fmt(data.acts.overdue)} color={RED} />
                  <MiniStat label="Annulées" value={fmt(data.acts.cancelled)} color={GRAY} />
                </div>
                <div className="flex flex-col gap-1.5">
                  {data.acts.byCategory.slice(0, 5).map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-sm py-0.5">
                      <span className="truncate mr-2" style={{ color: 'rgba(255,255,255,0.72)' }}>{c.label}</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(c.total)}</span>
                    </div>
                  ))}
                  {data.acts.byCategory.length === 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune activité sur la période</p>
                  )}
                </div>
              </Box>

              <SplitBarCard
                title="Liste d'attente"
                subtitle="Odoo, état actuel"
                unit="pistes"
                parts={[
                  { label: 'Actives', value: data.leads.waitingActive, color: ACCENT },
                  { label: 'Perdues', value: data.leads.waitingLost, color: GRAY },
                ]}
                footer={period !== 'global' && (
                  <p className="text-[11px] mt-auto" style={{ color: 'var(--text-muted)' }}>
                    Sur la période : <b style={{ color: 'var(--text-primary)' }}>{fmt(data.leads.periodWaitingNew)}</b> nouvelles,{' '}
                    <b style={{ color: RED }}>{fmt(data.leads.periodWaitingLost)}</b> perdues
                  </p>
                )}
              />

              <StageBarsCard
                title="Pipeline"
                subtitle="Odoo, opportunités par étape"
                extra={`${fmt(data.leads.pipelineLost)} perdues`}
                stages={data.leads.byStage.map((st, i) => ({ label: st.name, value: st.count, color: STAGE_COLORS[i % STAGE_COLORS.length] }))}
                footer={period !== 'global' && (
                  <p className="text-[11px] mt-auto" style={{ color: 'var(--text-muted)' }}>
                    Sur la période : <b style={{ color: 'var(--text-primary)' }}>{fmt(data.leads.periodPipelineNew)}</b> nouvelles,{' '}
                    <b style={{ color: RED }}>{fmt(data.leads.periodPipelineLost)}</b> perdues
                  </p>
                )}
              />
            </div>
          ) : (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Pas de compte Odoo lié pour ce commercial</p>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamBreakdownCard;