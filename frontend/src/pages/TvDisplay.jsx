import { useEffect, useState } from 'react';
import { Icon } from '../data/icons';
import yealeadLogo from '../assets/yealead.png';

const ACCENT = '#f86635';
const ACCENT_LIGHT = '#fb923c';
const ACCENT_DEEP = '#c2410c';
const WHITE = '#ffffff';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatMAD(n) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n || 0);
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function MoneyIcon({ size = 24, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7v10M9.3 9.5c0-1.1 1.2-2 2.7-2s2.7.9 2.7 2c0 2.6-5.4 1.6-5.4 4.2 0 1.1 1.2 2 2.7 2s2.7-.9 2.7-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RadialProgress({ percent, size = 54, stroke = 5, color, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#242424" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34, 1.4, 0.64, 1)', filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function BigStat({ icon, label, value, isMoney, color, index }) {
  const animated = useCountUp(value);
  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center overflow-hidden backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}30`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 8px 30px rgba(0,0,0,0.5)`,
        animation: `statIn 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) ${index * 0.08}s both`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 10px ${color}` }} />
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}18`, boxShadow: `0 0 20px ${color}20 inset` }}
      >
        {icon}
      </div>
      <p className="font-bold font-mono" style={{ color: WHITE, fontSize: 'clamp(1.5rem, 3.5vw, 2.75rem)', textShadow: `0 0 20px ${color}50` }}>
        {isMoney ? formatMAD(animated) : animated}
      </p>
      <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
    </div>
  );
}

function CommercialCard({ c, index, rank }) {
  const stats = [
    { type: 'appel', current: c.todayAppel, target: c.targetAppel, color: WHITE },
    { type: 'rdv', current: c.todayRdv, target: c.targetRdv, color: ACCENT_LIGHT },
    { type: 'devis', current: c.devis, target: c.targetDevis, color: ACCENT },
    { type: 'commande', current: c.commandes, target: c.targetCommande, color: ACCENT_DEEP },
  ];
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
  const ringColor = rank === 0 ? '#ffd700' : rank === 1 ? '#d9d9d9' : rank === 2 ? '#cd7f32' : 'rgba(255,255,255,0.12)';

  return (
    <div
      className="rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: rank < 3 ? `1px solid ${ringColor}50` : '1px solid rgba(255,255,255,0.06)',
        boxShadow: rank === 0 ? `0 0 24px ${ACCENT}22` : '0 4px 20px rgba(0,0,0,0.4)',
        animation: `riseIn 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) ${index * 0.06}s both`,
      }}
    >
      <div className="flex items-center gap-3 sm:w-40 shrink-0">
        <div className="relative shrink-0">
          {c.photo_url ? (
            <img
              src={c.photo_url} alt=""
              className="w-11 h-11 rounded-full object-cover"
              style={{ border: `2.5px solid ${ringColor}`, boxShadow: rank < 3 ? `0 0 12px ${ringColor}70` : 'none' }}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
              style={{ backgroundColor: ACCENT, color: '#000', border: `2.5px solid ${ringColor}`, boxShadow: rank < 3 ? `0 0 12px ${ringColor}70` : 'none' }}
            >
              {c.nom?.charAt(0).toUpperCase()}
            </div>
          )}
          {medal && (
            <span className="absolute -bottom-1 -right-1 text-sm" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }}>{medal}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: WHITE }}>{c.nom}</p>
          <p className="text-xs font-semibold font-mono" style={{ color: ACCENT, textShadow: `0 0 10px ${ACCENT}60` }}>{formatMAD(c.chiffreAffaires)}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-2">
        {stats.map((s) => {
          const percent = Math.min(Math.round((s.current / (s.target || 1)) * 100), 100);
          return (
            <div key={s.type} className="flex flex-col items-center gap-1">
              <RadialProgress percent={percent} size={46} stroke={4.5} color={s.color}>
                <Icon name={s.type} size={13} style={{ color: s.color }} />
              </RadialProgress>
              <p className="text-xs font-semibold font-mono" style={{ color: WHITE }}>
                {s.current}<span style={{ color: 'rgba(255,255,255,0.3)' }}>/{s.target}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TvDisplay() {
  const [commercials, setCommercials] = useState([]);
  const [now, setNow] = useState(new Date());

  const load = () => {
    fetch(`${API_URL}/api/activities/tv-display`)
      .then((r) => r.json())
      .then((data) => setCommercials(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const dataInterval = setInterval(load, 60000);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const totalAppels = commercials.reduce((s, c) => s + c.todayAppel, 0);
  const totalDevis = commercials.reduce((s, c) => s + c.devis, 0);
  const totalCommandes = commercials.reduce((s, c) => s + c.commandes, 0);
  const totalCA = commercials.reduce((s, c) => s + c.chiffreAffaires, 0);

  const sortedCommercials = [...commercials].sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #171717 0%, #050505 65%)' }}
    >
      <div
        className="absolute -top-32 -right-40 w-[42rem] h-[42rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}16, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT_DEEP}12, transparent 70%)` }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3 pb-4 sm:pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-1.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <img src={yealeadLogo} alt="Yealead" className="w-9 h-9 sm:w-12 sm:h-12 object-contain shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-bold" style={{ color: WHITE }}>
                  Sales<span style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}70` }}>Track</span>
                </h1>
                <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ACCENT}18`, color: ACCENT_LIGHT, border: `1px solid ${ACCENT}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: 'livePulse 1.6s ease-in-out infinite' }} />
                  EN DIRECT
                </span>
              </div>
              <p className="text-xs sm:text-sm capitalize mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{dateStr}</p>
            </div>
          </div>
          <p className="font-mono font-bold" style={{ color: ACCENT, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', textShadow: `0 0 24px ${ACCENT}60` }}>{timeStr}</p>
        </div>

        {commercials.length === 0 ? (
          <p className="text-base sm:text-lg text-center mt-16 sm:mt-20" style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement...</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <BigStat index={0} color={WHITE} icon={<Icon name="appel" size={24} style={{ color: WHITE }} />} label="Appels aujourd'hui" value={totalAppels} />
              <BigStat index={1} color={ACCENT_LIGHT} icon={<Icon name="devis" size={24} style={{ color: ACCENT_LIGHT }} />} label="Devis (Odoo)" value={totalDevis} />
              <BigStat index={2} color={ACCENT_DEEP} icon={<Icon name="commande" size={24} style={{ color: ACCENT_DEEP }} />} label="Commandes (Odoo)" value={totalCommandes} />
              <BigStat index={3} color={ACCENT} icon={<MoneyIcon size={24} color={ACCENT} />} label="Chiffre d'affaires" value={totalCA} isMoney />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {sortedCommercials.map((c, i) => (
                <CommercialCard key={c.id} c={c} index={i} rank={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes statIn { from { opacity: 0; transform: translateY(-8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
      `}</style>
    </div>
  );
}

export default TvDisplay;