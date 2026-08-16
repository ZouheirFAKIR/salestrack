import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import phoneIcon from '../assets/Phone.png';
import calendarIcon from '../assets/calendar.png';
import documentIcon from '../assets/document.png';
import cartIcon from '../assets/Cart.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ImageLightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors"
      >
        ×
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const getTitleText = (activity) => {
  const n = Number(activity.nombre);
  const labels = {
    appel: n > 1 ? `${n} appels enregistrés` : 'Appel enregistré',
    rdv: n > 1 ? `${n} rendez-vous enregistrés` : 'Rendez-vous enregistré',
    devis: n > 1 ? `${n} devis envoyés` : 'Devis envoyé',
    commande: n > 1 ? `${n} commandes conclues` : 'Commande conclue',
  };
  const emojis = { appel: '📞', rdv: '📅', devis: '📄', commande: '🛒' };
  return `${emojis[activity.type]} ${labels[activity.type]}`;
};

function ActivityCard({ activity, index, icons, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(activity.description || '');
  const [imageUrl, setImageUrl] = useState(activity.image_url || '');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initiales = user?.nom?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ZF';
  const statutLabels = { repond: 'Répond', ne_repond_pas: 'Ne répond pas', present: 'Présent', absent: 'Absent' };

  const isLongText = (activity.description || '').length > 140;
  const displayText = expanded || !isLongText
    ? activity.description
    : `${activity.description.slice(0, 140)}...`;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop lourde (max 5 Mo)');
      return;
    }
    setError('');
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result);
      setImageLoading(false);
    };
    reader.onerror = () => setImageLoading(false);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}/api/activities/batch/${activity.batch_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description, image_url: imageUrl }),
      });
      if (res.ok) {
        onUpdate(activity.batch_id, { description, image_url: imageUrl });
        setEditing(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Échec de la sauvegarde');
      }
    } catch (err) {
      setError('Erreur réseau, réessaie');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`${API_URL}/api/activities/batch/${activity.batch_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete(activity.batch_id);
      }
    } catch (err) {
      console.error(err);
    }
    setDeleting(false);
  };

  return (
    <div
      className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden transition-all hover:border-white/[0.14]"
      style={{ animation: `slideIn 0.35s ease ${index * 0.04}s both` }}
    >
      {lightbox && <ImageLightbox src={activity.image_url} onClose={() => setLightbox(false)} />}

      <div className="p-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
        >
          {initiales}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{user?.nom || 'Toi'}</p>
          <p className="text-xs text-white/35">{new Date(activity.date_activite).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
          <img src={icons[activity.type]} alt={activity.type} className="w-4 h-4 opacity-80" />
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
          aria-label="Supprimer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
          </svg>
        </button>
      </div>

      {confirmDelete && (
        <div className="px-4 pb-3 flex items-center gap-2 animate-[fadeIn_0.2s_ease] bg-red-500/5 py-3">
          <p className="text-xs text-white/70 flex-1">
            Supprimer {Number(activity.nombre) > 1 ? `ces ${activity.nombre} activités` : 'cette activité'} ?
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting && <Spinner size={12} color="#fff" />}
            {deleting ? '' : 'Confirmer'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-3 py-1.5 rounded-lg text-white/60 border border-white/15 hover:text-white transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      <div className="px-4 pb-1 pt-3">
        <div className="mb-3">
          <p className="text-base font-semibold text-white">{getTitleText(activity)}</p>
        </div>

        {(activity.sens || activity.statut) && (
          <div className="flex gap-5 mb-3 pb-3 border-b border-white/[0.06]">
            {activity.sens && (
              <div>
                <p className="text-[11px] text-white/35 uppercase tracking-wide">Sens</p>
                <p className="text-sm font-medium text-white/90">{activity.sens === 'sortant' ? 'Sortant' : 'Entrant'}</p>
              </div>
            )}
            {activity.statut && (
              <div>
                <p className="text-[11px] text-white/35 uppercase tracking-wide">Statut</p>
                <p className="text-sm font-medium text-white/90">{statutLabels[activity.statut]}</p>
              </div>
            )}
          </div>
        )}

        {!editing && activity.description && (
          <p className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap mb-3">
            {displayText}
            {isLongText && (
              <button onClick={() => setExpanded((e) => !e)} className="ml-1 text-sm font-medium" style={{ color: ACCENT }}>
                {expanded ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </p>
        )}
      </div>

      {!editing && activity.image_url && (
        <button onClick={() => setLightbox(true)} className="block w-full bg-black">
          <img
            src={activity.image_url}
            alt=""
            className="w-full max-h-[420px] object-contain hover:opacity-90 transition-opacity"
          />
        </button>
      )}

      {editing && (
        <div className="px-4 pb-4 animate-[fadeIn_0.2s_ease]">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ajouter une description..."
            rows={3}
            className="w-full p-3 rounded-xl bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors resize-none placeholder:text-white/25"
          />

          {imageLoading && (
            <div className="mt-3 h-40 rounded-xl bg-black border border-white/10 flex items-center justify-center">
              <Spinner size={22} color={ACCENT} />
            </div>
          )}

          {!imageLoading && imageUrl && (
            <div className="relative mt-3 rounded-xl overflow-hidden bg-black border border-white/10">
              <img src={imageUrl} alt="" className="w-full max-h-72 object-contain" />
              <button
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors backdrop-blur-sm"
              >
                ×
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

          <div className="flex items-center gap-2 mt-3">
            <label className="text-xs text-white/70 px-3 py-2 rounded-lg border border-white/10 cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {imageUrl ? 'Changer' : 'Ajouter'} une image
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => { setEditing(false); setDescription(activity.description || ''); setImageUrl(activity.image_url || ''); setError(''); }}
                className="text-xs px-3 py-2 rounded-lg text-white/50 border border-white/10 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || imageLoading}
                className="text-xs px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 transition-all hover:brightness-110 flex items-center gap-1.5"
                style={{ backgroundColor: ACCENT }}
              >
                {saving && <Spinner size={12} color="#fff" />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!editing && !confirmDelete && (
        <div className="border-t border-white/[0.06] px-2 py-1 flex">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/[0.03] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
            {activity.description || activity.image_url ? 'Modifier' : 'Ajouter description ou image'}
          </button>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function Feed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  const loadActivities = () => {
    if (!token) { setLoading(false); return; }
    apiFetch(`${API_URL}/api/activities`)
      .then(r => r.json())
      .then((data) => {
        setActivities(data);
        setLoading(false);
      });
  };

  useEffect(() => { loadActivities(); }, [token]);

  const handleUpdate = (batchId, updates) => {
    setActivities((prev) =>
      prev.map((a) => (a.batch_id === batchId ? { ...a, ...updates } : a))
    );
  };

  const handleDelete = (batchId) => {
    setActivities((prev) => prev.filter((a) => a.batch_id !== batchId));
  };

  const icons = { appel: phoneIcon, rdv: calendarIcon, devis: documentIcon, commande: cartIcon };

  if (loading) return <PageLoader />;

  if (!token) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-4">🔒</span>
        <h1 className="text-xl font-semibold text-white mb-2">Connecte-toi pour voir ton feed</h1>
        <p className="text-white/40 text-sm mb-6">Ton historique d'activités apparaîtra ici</p>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  return (
    <div className="bg-black p-4 sm:p-6 pb-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-1">Feed</h1>
        <p className="text-white/40 text-sm mb-6">Toutes tes activités, façon flux social</p>

        {activities.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-10">Aucune activité pour l'instant. Enregistre-en une !</p>
        )}

        <div className="flex flex-col gap-4">
          {activities.map((a, i) => (
            <ActivityCard key={a.batch_id} activity={a} index={i} icons={icons} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Feed;