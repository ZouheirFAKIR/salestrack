import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { compressImage } from '../../utils/imageCompress';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function RewardFields({ values, onChange }) {
  const [imgLoading, setImgLoading] = useState(false);

  const handleImageFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgLoading(true);
    try {
      const compressed = await compressImage(file, 1000, 0.7);
      onChange('imageUrl', compressed);
    } catch (err) {
      alert('Erreur lors du traitement de l\'image');
    }
    setImgLoading(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        value={values.title} onChange={(e) => onChange('title', e.target.value)}
        placeholder="Nom de la récompense"
        className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
        style={inputStyle}
      />
      <textarea
        value={values.description} onChange={(e) => onChange('description', e.target.value)}
        placeholder="Description"
        rows={3}
        className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 resize-none"
        style={inputStyle}
      />
      <label
        className="p-2.5 rounded-lg text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 hover:bg-[var(--surface)]"
        style={{ ...inputStyle, color: 'var(--text-muted)' }}
      >
        {imgLoading ? 'Chargement...' : values.imageUrl ? "Changer l'image" : 'Choisir une image'}
        <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
      </label>
      {values.imageUrl && (
        <div className="rounded-lg overflow-hidden h-32" style={{ border: '1px solid var(--border)' }}>
          <img src={values.imageUrl} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <input
        value={values.cost} onChange={(e) => onChange('cost', e.target.value)}
        placeholder="Coût en points" type="number"
        className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
        style={inputStyle}
      />
    </div>
  );
}

function NewRewardForm({ onCreated }) {
  const [values, setValues] = useState({ title: '', description: '', imageUrl: '', cost: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setValues((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!values.title.trim() || !values.cost) { setError('Nom et coût obligatoires'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/rewards`, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title, description: values.description,
          cost: Number(values.cost), image_url: values.imageUrl || null,
        }),
      });
      if (res.ok) {
        setValues({ title: '', description: '', imageUrl: '', cost: '' });
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Nouvelle récompense</p>
      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <RewardFields values={values} onChange={handleChange} />

        <div className="rounded-xl p-4 flex flex-col items-center text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Aperçu</p>
          <div className="w-full aspect-video rounded-lg overflow-hidden mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {values.imageUrl ? (
              <img src={values.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--text-muted)' }}>🎁</div>
            )}
          </div>
          <p className="text-sm font-medium truncate w-full" style={{ color: 'var(--text-primary)' }}>{values.title || 'Nom de la récompense'}</p>
          <p className="text-xs mt-1" style={{ color: ACCENT }}>{values.cost || 0} points</p>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="mt-4 w-full px-4 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT }}
          >
            {saving && <Spinner size={13} color="#fff" />}
            Créer la récompense
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardCard({ reward, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [values, setValues] = useState({
    title: reward.title, description: reward.description || '',
    imageUrl: reward.image_url || '', cost: reward.cost,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setValues((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!values.title.trim() || !values.cost) { setError('Nom et coût obligatoires'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/rewards/${reward.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: values.title, description: values.description,
          cost: Number(values.cost), image_url: values.imageUrl || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        onRefresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}/api/admin/rewards/${reward.id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setDeleting(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <RewardFields values={values} onChange={handleChange} />
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT }}
          >
            {saving && <Spinner size={12} color="#fff" />}
            Enregistrer
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 px-4 py-2 rounded-lg text-xs transition-colors hover:bg-[var(--surface-strong)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {reward.image_url && (
            <img src={reward.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 opacity-50" style={{ border: '1px solid var(--border)' }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>Supprimer « {reward.title} » ?</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{error || 'Cette action est définitive.'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-[var(--surface-strong)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {deleting && <Spinner size={12} color="#fff" />}
            Confirmer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="relative aspect-video" style={{ backgroundColor: 'var(--surface-strong)' }}>
        {reward.image_url ? (
          <img src={reward.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--text-muted)' }}>🎁</div>
        )}
        <span
          className="absolute top-2.5 right-2.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${ACCENT}dd`, color: '#fff' }}
        >
          {reward.cost} pts
        </span>
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{reward.title}</p>
        {reward.description && <p className="text-xs mt-1 line-clamp-2 flex-1" style={{ color: 'var(--text-muted)' }}>{reward.description}</p>}

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Modifier
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRewards = () => {
    apiFetch(`${API_URL}/api/admin/rewards`)
      .then((r) => r.json())
      .then((data) => { setRewards(data); setLoading(false); });
  };

  useEffect(() => { loadRewards(); }, []);

  if (loading) return <PageLoader />;

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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Administration — Récompenses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Gère le catalogue de récompenses échangeables contre des points</p>
        </div>

        <NewRewardForm onCreated={loadRewards} />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rewards.length === 0 && <p className="text-sm text-center xl:col-span-3" style={{ color: 'var(--text-muted)' }}>Aucune récompense pour l'instant</p>}
          {rewards.map((r) => (
            <RewardCard key={r.id} reward={r} onRefresh={loadRewards} />
          ))}
        </div>
      </div>

      <style>{`.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
    </div>
  );
}

export default AdminRewards;