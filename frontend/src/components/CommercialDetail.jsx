import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Icon } from '../data/icons';
import { TYPE_COLORS } from '../data/typeColors';
import Spinner from './Spinner';
import LineChart from './LineChart';
import CoinIcon from './CoinIcon';
import OdooRangeCard from './OdooRangeCard';
import OdooActivitiesCard from './OdooActivitiesCard';
import OdooActivitiesChartCard from './OdooActivitiesChartCard';
import OdooPipelineCard from './OdooPipelineCard';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TYPE_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function TypeQuotasForm({ commercialId, onSaved }) {
  const [quotas, setQuotas] = useState({ appel: 5, rdv: 2, devis: 1, commande: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/commercials/${commercialId}/type-quotas`)
      .then((r) => r.json())
      .then((data) => { setQuotas(data); setLoading(false); });
  }, [commercialId]);

  const handleChange = (type, value) => {
    setQuotas((prev) => ({ ...prev, [type]: value }));
    setSaved(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    await Promise.all(
      Object.keys(TYPE_LABELS).map((type) =>
        apiFetch(`${API_URL}/api/admin/commercials/${commercialId}/type-quotas`, {
          method: 'PUT',
          body: JSON.stringify({ type, daily_target: Number(quotas[type]) }),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <Spinner size={18} color={ACCENT} />;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Object.keys(TYPE_LABELS).map((type) => (
          <div key={type} className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'var(--surface-strong)', border: `1px solid ${TYPE_COLORS[type]}30` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${TYPE_COLORS[type]}15` }}>
              <Icon name={type} size={15} style={{ color: TYPE_COLORS[type] }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{TYPE_LABELS[type]} / jour</p>
              <input
                type="number" min="0" value={quotas[type]}
                onChange={(e) => handleChange(type, e.target.value)}
                className="w-full bg-transparent text-sm font-semibold outline-none border-b mt-1"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="w-full text-sm font-medium py-2.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ color: '#fff', backgroundColor: ACCENT }}
      >
        {saving && <Spinner size={13} color="#fff" />}
        {saving ? 'Enregistrement...' : saved ? '✓ Objectifs enregistrés' : 'Enregistrer les objectifs'}
      </button>
    </div>
  );
}

function CommercialDetail({ commercial, onClose, onQuotaUpdated }) {
  const viewer = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = viewer?.role === 'admin';
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('appel');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState([]);
  const [weekRange, setWeekRange] = useState(null);
  const [weekLoading, setWeekLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/admin/commercials/${commercial.id}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setLoading(false);
      });
  }, [commercial.id]);

  useEffect(() => {
    setWeekLoading(true);
    apiFetch(`${API_URL}/api/admin/commercials/${commercial.id}/activity-week?type=${selectedType}&offset=${weekOffset}`)
      .then((r) => r.json())
      .then((data) => {
        setWeekData(data.daily || []);
        setWeekRange({ start: data.start, end: data.end });
        setWeekLoading(false);
      });
  }, [commercial.id, selectedType, weekOffset]);

  const labels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

  const formatRange = (start, end) => {
    if (!start || !end) return '';
    const opts = { day: 'numeric', month: 'short' };
    const s = new Date(`${start}T00:00:00`).toLocaleDateString('fr-FR', opts);
    const e = new Date(`${end}T00:00:00`).toLocaleDateString('fr-FR', opts);
    return `${s} – ${e}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50" onClick={onClose}>
      <div
        className="rounded-2xl p-4 sm:p-8 max-w-5xl w-full max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
              {commercial.nom?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{commercial.nom}</p>
              <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{commercial.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl shrink-0 leading-none transition-colors" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size={24} color={ACCENT} />
          </div>
        )}

        {!loading && detail && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['appel', 'rdv', 'devis', 'commande'].map((type) => {
                const stat = detail.stats.find((s) => s.type === type);
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setWeekOffset(0); }}
                    className="rounded-xl p-4 text-center transition-all"
                    style={{
                      backgroundColor: isSelected ? `${TYPE_COLORS[type]}18` : 'var(--surface-strong)',
                      border: isSelected ? `1.5px solid ${TYPE_COLORS[type]}` : `1px solid ${TYPE_COLORS[type]}30`,
                    }}
                  >
                    <Icon name={type} size={22} className="mx-auto" style={{ color: TYPE_COLORS[type] }} />
                    <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>{stat?.total || 0}</p>
                    <p className="text-xs mt-0.5" style={{ color: isSelected ? TYPE_COLORS[type] : 'var(--text-muted)' }}>{labels[type]}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', borderTop: `2.5px solid ${TYPE_COLORS[selectedType]}` }}>
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{labels[selectedType]} — par semaine</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWeekOffset((o) => o - 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    aria-label="Semaine précédente"
                  >
                    ‹
                  </button>
                  <span className="text-xs w-24 text-center" style={{ color: 'var(--text-muted)' }}>
                    {weekRange ? formatRange(weekRange.start, weekRange.end) : ''}
                  </span>
                  <button
                    onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
                    disabled={weekOffset >= 0}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    aria-label="Semaine suivante"
                  >
                    ›
                  </button>
                </div>
              </div>
              {weekLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size={18} color={TYPE_COLORS[selectedType]} />
                </div>
              ) : (
                <LineChart data={weekData} color={TYPE_COLORS[selectedType]} />
              )}
            </div>

            <OdooRangeCard commercialId={commercial.id} />

            <OdooActivitiesCard commercialId={commercial.id} />

            <OdooActivitiesChartCard commercialId={commercial.id} />

            <OdooPipelineCard commercialId={commercial.id} />

            <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-5`}>
              <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Solde de points</p>
                  <span className="flex items-center gap-1.5 text-lg font-semibold" style={{ color: ACCENT }}>
                    <CoinIcon size={16} />
                    {detail.points_balance ?? 0}
                  </span>
                </div>

                {detail.redemptions?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Récompenses échangées</p>
                    {detail.redemptions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg p-2" style={{ backgroundColor: 'var(--surface)' }}>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {r.quantity > 1 ? `${r.quantity} × ` : ''}{r.title}
                        </p>
                        <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {new Date(r.redeemed_at).toLocaleDateString('fr-FR')} · −{r.cost_at_redemption}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Objectifs quotidiens par type</p>
                  <TypeQuotasForm commercialId={commercial.id} onSaved={onQuotaUpdated} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommercialDetail;