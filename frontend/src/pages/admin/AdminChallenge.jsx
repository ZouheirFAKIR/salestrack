import { useState, useEffect } from 'react';
import { apiFetch, API_URL } from '../../utils/api';

function AdminChallenge() {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !target || !deadline) {
      setError('Remplis tous les champs.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/challenge`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          target: parseInt(target, 10),
          deadline,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la création du défi');
      }

      setTitle('');
      setTarget('');
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

    try {
      const res = await apiFetch(`${API_URL}/api/admin/challenge/${activeChallenge.id}/end`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erreur lors de la clôture du défi');
      await fetchActiveChallenge();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '640px' }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
        Gestion du défi
      </h2>

      {activeChallenge ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{activeChallenge.title}</h3>
            <span
              style={{
                background: '#f86635',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              En cours
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
            Objectif : {activeChallenge.target} activités
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Deadline : {new Date(activeChallenge.deadline).toLocaleString('fr-FR')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeChallenge.runners?.map((r) => (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  <span>{r.nom} {r.isWinner ? '🏆' : ''}</span>
                  <span>{r.total} / {activeChallenge.target}</span>
                </div>
                <div style={{ background: 'var(--surface-alt)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${r.progress}%`,
                      background: r.isWinner ? '#f86635' : 'var(--accent-soft, #f86635)',
                      height: '100%',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleEnd}
            style={{
              marginTop: '20px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Terminer le défi maintenant
          </button>
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Aucun défi actif pour le moment.
        </p>
      )}

      {!activeChallenge && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Créer un nouveau défi</h3>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Titre du défi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Sprint de fin de mois"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, var(--surface-alt))',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Objectif (nombre d'activités)
            </label>
            <input
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Ex : 50"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, var(--surface-alt))',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Date et heure limite
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, var(--surface-alt))',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {error && <p style={{ color: '#e53e3e', fontSize: '13px', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#f86635',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Création...' : 'Lancer le défi'}
          </button>
        </form>
      )}
    </div>
  );
}

export default AdminChallenge;