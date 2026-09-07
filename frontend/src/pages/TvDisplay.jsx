import { useEffect, useState } from 'react';
import { Icon } from '../data/icons';
import yealeadLogo from '../assets/yealead.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatMAD(n) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n || 0);
}

function progressColor(percent) {
  if (percent >= 100) return '#22c55e';
  if (percent >= 75) return '#fb923c';
  if (percent >= 25) return ACCENT;
  return '#e5d5cc';
}

function RadialProgress({ percent, size = 54, stroke = 5, color, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ded5" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function CommercialCard({ c, index }) {
  const devisPercent = Math.min(Math.round((c.devis / (c.targetDevis || 1)) * 100), 100);
  const commandePercent = Math.min(Math.round((c.commandes / (c.targetCommande || 1)) * 100), 100);

  return (
    <div
      className="rounded-2xl px-4 py-3.5 flex items-center gap-4"
      style={{ backgroundColor: '#ffffff', border: '1px solid #f0ded5', boxShadow: '0 1px 6px rgba(248,102,53,0.06)', animation: `riseIn 0.4s ease ${index * 0.04}s both` }}
    >
      {c.photo_url ? (
        <img src={c.photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
          {c.nom?.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 shrink-0" style={{ width: 96 }}>
        <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{c.nom}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: ACCENT }}>{formatMAD(c.chiffreAffaires)}</p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <RadialProgress percent={devisPercent} size={44} stroke={4} color={progressColor(devisPercent)}>
            <Icon name="devis" size={12} style={{ color: progressColor(devisPercent) }} />
          </RadialProgress>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{c.devis}<span className="text-xs font-normal" style={{ color: '#b0a39a' }}>/{c.targetDevis}</span></p>
            <p className="text-[10px]" style={{ color: '#b0a39a' }}>Devis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RadialProgress percent={commandePercent} size={44} stroke={4} color={progressColor(commandePercent)}>
            <Icon name="commande" size={12} style={{ color: progressColor(commandePercent) }} />
          </RadialProgress>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{c.commandes}<span className="text-xs font-normal" style={{ color: '#b0a39a' }}>/{c.targetCommande}</span></p>
            <p className="text-[10px]" style={{ color: '#b0a39a' }}>Commandes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamOverview({ commercials }) {
  const totalDevis = commercials.reduce((s, c) => s + c.devis, 0);
  const targetDevis = commercials.reduce((s, c) => s + c.targetDevis, 0);
  const totalCommandes = commercials.reduce((s, c) => s + c.commandes, 0);
  const targetCommandes = commercials.reduce((s, c) => s + c.targetCommande, 0);
  const totalCA = commercials.reduce((s, c) => s + c.chiffreAffaires, 0);

  const devisPercent = targetDevis > 0 ? Math.min(Math.round((totalDevis / targetDevis) * 100), 100) : 0;
  const commandePercent = targetCommandes > 0 ? Math.min(Math.round((totalCommandes / targetCommandes) * 100), 100) : 0;

  return (
    <div className="rounded-2xl p-5 mb-5 flex flex-wrap items-center gap-8" style={{ backgroundColor: '#ffffff', border: '1px solid #f0ded5', boxShadow: '0 1px 6px rgba(248,102,53,0.06)' }}>
      <div>
        <p className="text-xs uppercase tracking-wide font-medium mb-0.5" style={{ color: '#b0a39a' }}>Équipe — Odoo en direct</p>
        <p className="text-3xl font-bold" style={{ color: ACCENT }}>{formatMAD(totalCA)}</p>
        <p className="text-xs mt-0.5" style={{ color: '#b0a39a' }}>Chiffre d'affaires du jour</p>
      </div>
      <div className="flex flex-wrap gap-7">
        <div className="flex items-center gap-3">
          <RadialProgress percent={devisPercent} size={64} stroke={6} color={progressColor(devisPercent)}>
            <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>{devisPercent}%</span>
          </RadialProgress>
          <div>
            <p className="text-xs" style={{ color: '#b0a39a' }}>Devis</p>
            <p className="text-base font-bold" style={{ color: '#1a1a1a' }}>{totalDevis}<span className="text-xs font-normal" style={{ color: '#b0a39a' }}>/{targetDevis}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RadialProgress percent={commandePercent} size={64} stroke={6} color={progressColor(commandePercent)}>
            <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>{commandePercent}%</span>
          </RadialProgress>
          <div>
            <p className="text-xs" style={{ color: '#b0a39a' }}>Commandes</p>
            <p className="text-base font-bold" style={{ color: '#1a1a1a' }}>{totalCommandes}<span className="text-xs font-normal" style={{ color: '#b0a39a' }}>/{targetCommandes}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaLeaderboard({ commercials }) {
  const sorted = [...commercials].sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
  const max = Math.max(...sorted.map((c) => c.chiffreAffaires), 1);

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: '#ffffff', border: '1px solid #f0ded5', boxShadow: '0 1px 6px rgba(248,102,53,0.06)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: '#1a1a1a' }}>Chiffre d'affaires par commercial</p>
      <div className="flex flex-col gap-3">
        {sorted.map((c, i) => {
          const width = Math.max((c.chiffreAffaires / max) * 100, c.chiffreAffaires > 0 ? 4 : 0);
          return (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-xs font-semibold w-24 truncate shrink-0" style={{ color: '#1a1a1a' }}>{c.nom}</span>
              <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: '#fff6f2' }}>
                <div
                  className="h-full rounded-full flex items-center justify-end px-2.5 transition-all duration-700"
                  style={{ width: `${width}%`, backgroundColor: i === 0 ? '#22c55e' : ACCENT, minWidth: c.chiffreAffaires > 0 ? 60 : 0 }}
                >
                  {c.chiffreAffaires > 0 && (
                    <span className="text-[11px] font-semibold text-white whitespace-nowrap">{formatMAD(c.chiffreAffaires)}</span>
                  )}
                </div>
              </div>
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

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#fffaf7' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 pb-5" style={{ borderBottom: '1px solid #f0ded5' }}>
        <div className="flex items-center gap-4">
          <img src={yealeadLogo} alt="Yealead" className="w-14 h-14 object-contain" />
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#1a1a1a' }}>
              Sales<span style={{ color: ACCENT }}>Track</span>
            </h1>
            <p className="text-sm capitalize mt-1" style={{ color: '#8a7a72' }}>Données Odoo en direct — {dateStr}</p>
          </div>
        </div>
        <p className="text-4xl font-mono font-bold" style={{ color: ACCENT }}>{timeStr}</p>
      </div>

      {commercials.length === 0 ? (
        <p className="text-lg text-center mt-20" style={{ color: '#b0a39a' }}>Chargement des données Odoo...</p>
      ) : (
        <>
          <TeamOverview commercials={commercials} />
          <CaLeaderboard commercials={commercials} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {commercials.map((c, i) => (
              <CommercialCard key={c.id} c={c} index={i} />
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default TvDisplay;