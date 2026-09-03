import { useState, useEffect } from 'react';
import { apiFetch, API_URL } from '../../utils/api';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function AdminChallenge() {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [targetAppel, setTargetAppel] = useState('');
  const [targetRdv, setTargetRdv] = useState('');
  const [targetDevis, setTargetDevis] = useState('');
  const [targetCommande, setTargetCommande] = useState('');
  const [deadline, setDeadline] = useState('');

  const fetchActiveChallenge = async () => {
    try {
      const res = await apiFetch(`${API_URL}/api/admin/challenge`);
      const data = await res.json();
      setActiveChallenge(data.active ? data : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveChallenge();
  }, []);

  const totalTarget = (parseInt(targetAppel, 10) || 0) + (parseInt(targetRdv, 10) || 0) + (parseInt(targetDevis, 10) || 0) + (parseInt(targetCommande, 10) || 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || totalTarget <= 0 || !deadline) {
      setError('Remplis le titre, au moins un objectif, et la deadline.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/challenge`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          targetAppel: parseInt(targetAppel, 10) || 0,
          targetRdv: parseInt(targetRdv, 10) || 0,
          targetDevis: parseInt(targetDevis, 10) || 0,
          targetCommande: parseInt(targetCommande, 10) || 0,
          deadline,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la création du défi');
      }

      setTitle('');
      setTargetAppel('');
      setTargetRdv('');
      setTargetDevis('');
      setTargetCommande('');
      setDeadline('');
      await fetchActiveChallenge();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (!activeChallenge?.id) return;
    if (!window.confirm('Terminer ce défi maintenant ?')) return;

    setEnding(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/challenge/${activeChallenge.id}/end`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erreur lors de la clôture du défi');
      await fetchActiveChallenge();
    } catch (err) {
      setError(err.message);
    }
    setEnding(false);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Spinner size={22} color={ACCENT} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}18, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`, filter: 'blur(6px)' }}
      />

      <div className="max-w-6xl mx-auto flex flex-col gap-5 relative z-10">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Gestion du défi</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Lance un sprint collectif et suis la progression en direct</p>
        </div>

        {activeChallenge ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{activeChallenge.title}</p>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: ACCENT, color: '#fff' }}>
                  En cours
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Deadline : {new Date(activeChallenge.deadline).toLocaleString('fr-FR')}
              </p>

              <div className="flex flex-col gap-4">
                {activeChallenge.runners?.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span style={{ color: 'var(--text-primary)' }}>{r.nom} {r.isWinner ? '🏆' : ''}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{r.total} / {activeChallenge.target}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-strong)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${r.progress}%`, backgroundColor: r.isWinner ? '#ffd700' : ACCENT }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleEnd}
                disabled={ending}
                className="mt-6 text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2 hover:bg-red-500/10"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                {ending && <Spinner size={13} color="#ef4444" />}
                Terminer le défi maintenant
              </button>
            </div>

            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Objectifs</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Appels', value: activeChallenge.targets?.appel || 0 },
                  { label: 'Rendez-vous', value: activeChallenge.targets?.rdv || 0 },
                  { label: 'Devis', value: activeChallenge.targets?.devis || 0 },
                  { label: 'Commandes', value: activeChallenge.targets?.commande || 0 },
                ].map((t) => (
                  <div key={t.label} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-2.5 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span className="font-semibold" style={{ color: ACCENT }}>{activeChallenge.target}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Créer un nouveau défi</p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Titre du défi</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex : Sprint de fin de mois"
                    className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Objectifs par type d'activité</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Appels', value: targetAppel, set: setTargetAppel },
                      { label: 'Rendez-vous', value: targetRdv, set: setTargetRdv },
                      { label: 'Devis', value: targetDevis, set: setTargetDevis },
                      { label: 'Commandes', value: targetCommande, set: setTargetCommande },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                        <input
                          type="number"
                          min="0"
                          value={f.value}
                          onChange={(e) => f.set(e.target.value)}
                          placeholder="0"
                          className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Date et heure limite</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
                    style={inputStyle}
                  />
                </div>

                {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2 text-white transition-all hover:brightness-110"
                  style={{ backgroundColor: ACCENT }}
                >
                  {submitting && <Spinner size={13} color="#fff" />}
                  {submitting ? 'Création...' : 'Lancer le défi'}
                </button>
              </div>

              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Aperçu</p>
                <p className="text-sm font-medium mb-3 truncate" style={{ color: 'var(--text-primary)' }}>{title || 'Nom du défi'}</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Appels', value: targetAppel || 0 },
                    { label: 'Rendez-vous', value: targetRdv || 0 },
                    { label: 'Devis', value: targetDevis || 0 },
                    { label: 'Commandes', value: targetCommande || 0 },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>{t.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm pt-3 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Total</span>
                  <span className="font-semibold" style={{ color: ACCENT }}>{totalTarget}</span>
                </div>
                {deadline && (
                  <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
                    Fin : {new Date(deadline).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminChallenge;