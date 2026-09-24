import { useEffect, useState } from 'react';
import { apiFetch, API_URL } from '../utils/api';
import { Icon } from '../data/icons';
import { TYPE_COLORS } from '../data/typeColors';
import DownloadReportButton from './DownloadReportButton';
import Spinner from './Spinner';

const ACCENT = '#f86635';
const TYPES = ['appel', 'rdv', 'devis', 'commande'];
const LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

function TeamQuotaCard() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/team-today-quotas`)
      .then((r) => r.json())
      .then((res) => {
        setTeam(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Objectifs équipe</p>

      {loading ? (
        <div className="py-10 flex justify-center"><Spinner size={20} color={ACCENT} /></div>
      ) : team.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aucun commercial</p>
      ) : (
        <div className="flex flex-col gap-4">
          {team.map((c) => (
            <div key={c.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.nom}</p>
                <DownloadReportButton commercialId={c.id} commercialNom={c.nom} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {TYPES.map((type) => {
                  const current = Number(c.today?.[type] || 0);
                  const target = Number(c.quotas?.[type] || 5);
                  const percent = Math.min(Math.round((current / target) * 100), 100);
                  const circumference = 2 * Math.PI * 26;
                  const displayPercent = Math.max(percent, 4);
                  const ringColor = TYPE_COLORS[type];

                  return (
                    <div key={type} className="flex flex-col items-center text-center">
                      <div className="relative w-16 h-16 mb-1">
                        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                          <circle cx="32" cy="32" r="26" stroke="var(--border)" strokeWidth="5" fill="none" />
                          <circle
                            cx="32" cy="32" r="26" stroke={ringColor} strokeWidth="5" fill="none" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (displayPercent / 100) * circumference}
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon name={type} size={18} style={{ color: ringColor }} />
                        </div>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{current}/{target}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{LABELS[type]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TeamQuotaCard;