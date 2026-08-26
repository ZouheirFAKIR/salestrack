import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { compressImage } from '../../utils/imageCompress';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input
        value={values.title} onChange={(e) => onChange('title', e.target.value)}
        placeholder="Nom de la récompense"
        className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
      />
      <input
        value={values.description} onChange={(e) => onChange('description', e.target.value)}
        placeholder="Description"
        className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
      />
      <label className="p-2.5 rounded-lg bg-black border border-white/10 text-white/50 text-sm cursor-pointer hover:text-white transition-colors sm:col-span-2 flex items-center justify-center gap-2">
        {imgLoading ? 'Chargement...' : values.imageUrl ? "Changer l'image" : 'Choisir une image'}
        <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
      </label>
      {values.imageUrl && (
        <div className="sm:col-span-2 rounded-lg overflow-hidden border border-white/10 h-28">
          <img src={values.imageUrl} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <input
        value={values.cost} onChange={(e) => onChange('cost', e.target.value)}
        placeholder="Coût en points" type="number"
        className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-5">
      <p className="text-sm font-semibold text-white mb-3">Nouvelle récompense</p>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <RewardFields values={values} onChange={handleChange} />
      <button
        onClick={handleCreate}
        disabled={saving}
        className="mt-4 w-full sm:w-auto px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: ACCENT }}
      >
        {saving && <Spinner size={13} color="#fff" />}
        Créer la récompense
      </button>
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
      <div className="bg-black/40 border border-white/10 rounded-xl p-4">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <RewardFields values={values} onChange={handleChange} />
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-60 flex items-center gap-2"
            style={{ backgroundColor: ACCENT }}
          >
            {saving && <Spinner size={12} color="#fff" />}
            Enregistrer
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-white/60 text-xs border border-white/10 hover:text-white transition-colors">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {reward.image_url && (
            <img src={reward.image_url} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0 border border-white/10 opacity-50" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">Supprimer « {reward.title} » ?</p>
            <p className="text-white/40 text-xs mt-0.5">{error || 'Cette action est définitive.'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors disabled:opacity-50"
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
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4">
      <div className="flex items-center gap-3 min-w-0">
        {reward.image_url && (
          <img src={reward.image_url} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0 border border-white/10" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{reward.title}</p>
          <p className="text-white/40 text-xs mt-0.5 truncate">{reward.description}</p>
          <p className="text-xs mt-1 font-medium" style={{ color: ACCENT }}>{reward.cost} points</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
        <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
          Modifier
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Supprimer
        </button>
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
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Administration — Récompenses</h1>
          <p className="text-white/40 text-xs">Gère le catalogue de récompenses échangeables contre des points</p>
        </div>

        <NewRewardForm onCreated={loadRewards} />

        <div className="flex flex-col gap-3">
          {rewards.length === 0 && <p className="text-white/30 text-sm text-center">Aucune récompense pour l'instant</p>}
          {rewards.map((r) => (
            <RewardCard key={r.id} reward={r} onRefresh={loadRewards} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminRewards;