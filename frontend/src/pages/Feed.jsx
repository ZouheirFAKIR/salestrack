import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import phoneIcon from '../assets/Phone.png';
import calendarIcon from '../assets/calendar.png';
import documentIcon from '../assets/document.png';
import cartIcon from '../assets/Cart.png';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ImageLightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-white/70 hover:text-white text-3xl leading-none"
      >
        ×
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function ActivityCard({ activity, index, icons, titles, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(activity.description || '');
  const [imageUrl, setImageUrl] = useState(activity.image_url || '');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [error, setError] = useState('');

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
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result);
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

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
      style={{ animation: `slideIn 0.35s ease ${index * 0.04}s both` }}
    >
      {lightbox && <ImageLightbox src={activity.image_url} onClose={() => setLightbox(false)} />}

      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: ACCENT }}>
          {initiales}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{user?.nom || 'Toi'}</p>
          <p className="text-xs text-white/40">{new Date(activity.date_activite).toLocaleString('fr-FR')}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <img src={icons[activity.type]} alt={activity.type} className="w-5 h-5" />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <p className="text-lg font-semibold text-white">{titles[activity.type]}</p>
          {Number(activity.nombre) > 1 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: ACCENT, color: '#fff' }}>
              x{activity.nombre}
            </span>
          )}
        </div>

        {(activity.sens || activity.statut) && (
          <div className="flex gap-6 mb-3">
            {activity.sens && (
              <div>
                <p className="text-xs text-white/40">Sens</p>
                <p className="text-sm font-medium text-white">{activity.sens === 'sortant' ? 'Sortant' : 'Entrant'}</p>
              </div>
            )}
            {activity.statut && (
              <div>
                <p className="text-xs text-white/40">Statut</p>
                <p className="text-sm font-medium text-white">{statutLabels[activity.statut]}</p>
              </div>
            )}
          </div>
        )}

        {!editing && activity.description && (
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
            {displayText}
            {isLongText && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="ml-1 text-sm font-medium"
                style={{ color: ACCENT }}
              >
                {expanded ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </p>
        )}

        {!editing && activity.image_url && (
          <button
            onClick={() => setLightbox(true)}
            className="mt-3 w-full rounded-xl overflow-hidden border border-white/10 block"
          >
            <img src={activity.image_url} alt="" className="w-full h-56 object-cover hover:brightness-90 transition-all" />
          </button>
        )}

        {editing && (
          <div className="mt-2 animate-[fadeIn_0.2s_ease]">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajouter une description..."
              rows={3}
              className="w-full p-3 rounded-xl bg-black border border-white/15 text-white text-sm outline-none focus:border-orange-500 resize-none"
            />

            {imageUrl && (
              <div className="relative mt-3 rounded-xl overflow-hidden border border-white/10">
                <img src={imageUrl} alt="" className="w-full h-56 object-cover" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

            <div className="flex items-center gap-2 mt-3">
              <label className="text-xs text-white/70 px-3 py-2 rounded-lg border border-white/15 cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-1.5">
                📷 {imageUrl ? 'Changer' : 'Ajouter'} une image
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => { setEditing(false); setDescription(activity.description || ''); setImageUrl(activity.image_url || ''); setError(''); }}
                  className="text-xs px-3 py-2 rounded-lg text-white/60 border border-white/15 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!editing && (
        <div className="border-t border-white/10 px-2 py-1 flex">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            ✏️ {activity.description || activity.image_url ? 'Modifier' : 'Ajouter description ou image'}
          </button>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function Feed() {
  const [activities, setActivities] = useState([]);
  const token = localStorage.getItem('token');

  const loadActivities = () => {
    if (!token) return;
    apiFetch(`${API_URL}/api/activities`).then(r => r.json()).then(setActivities);
  };

  useEffect(() => { loadActivities(); }, [token]);

  const handleUpdate = (batchId, updates) => {
    setActivities((prev) =>
      prev.map((a) => (a.batch_id === batchId ? { ...a, ...updates } : a))
    );
  };

  const icons = { appel: phoneIcon, rdv: calendarIcon, devis: documentIcon, commande: cartIcon };
  const titles = {
    appel: '📞 Appel enregistré',
    rdv: '📅 Rendez-vous enregistré',
    devis: '📄 Devis envoyé',
    commande: '🛒 Commande conclue',
  };

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
            <ActivityCard key={a.batch_id} activity={a} index={i} icons={icons} titles={titles} onUpdate={handleUpdate} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Feed;