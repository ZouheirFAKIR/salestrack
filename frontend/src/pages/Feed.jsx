import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { compressImage } from '../utils/imageCompress';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import { Icon } from '../data/icons';
import EmptyState from '../components/EmptyState';
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
  return labels[activity.type];
};

function ActivityCard({ activity, index, onUpdate, onDelete }) {
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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setImageLoading(true);
    try {
      const compressed = await compressImage(file, 1000, 0.7);
      setImageUrl(compressed);
    } catch (err) {
      setError('Erreur lors du traitement de l\'image');
    }
    setImageLoading(false);
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
      className="bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden transition-all hover:border-white/[0.14]"
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
                    <Icon name={activity.type} size={15} style={{ color: 'var(--text-primary)' }} />
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
          <p className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Icon name={activity.type} size={17} style={{ color: 'var(--text-secondary)' }} />
            {getTitleText(activity)}
          </p>
        </div>

        {(activity.sens || activity.statut) && (
          <div className="flex gap-5 mb-3 pb-3 border-b border-white/6">
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
            className="w-full max-h-105 object-contain hover:opacity-90 transition-opacity"
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
        <div className="border-t border-white/6 px-2 py-1 flex">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/3 transition-colors"
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

const TYPE_FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'appel', label: 'Appels' },
  { key: 'rdv', label: 'Rendez-vous' },
  { key: 'devis', label: 'Devis' },
  { key: 'commande', label: 'Commandes' },
];

function Feed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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

  const filteredActivities = filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  // Stats de la semaine, calculées côté client à partir de ce qui est déjà chargé
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const weekActivities = activities.filter((a) => new Date(a.date_activite) >= weekAgo);
  const weekCounts = { appel: 0, rdv: 0, devis: 0, commande: 0 };
  weekActivities.forEach((a) => {
    weekCounts[a.type] = (weekCounts[a.type] || 0) + Number(a.nombre || 1);
  });
  const weekTotal = Object.values(weekCounts).reduce((sum, n) => sum + n, 0);

  const typeLabels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-1">Feed</h1>
        <p className="text-white/40 text-sm mb-5">Toutes tes activités, façon flux social</p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

          <div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'thin' }}>
              {TYPE_FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0"
                    style={active
                      ? { backgroundColor: ACCENT, color: '#fff' }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {filteredActivities.length === 0 && (
              <EmptyState
                icon="📭"
                title={filter === 'all' ? "Ton feed est vide" : "Aucune activité de ce type"}
                subtitle={filter === 'all' ? "Enregistre ta première activité et elle apparaîtra ici, comme un post." : "Change de filtre ou enregistre une nouvelle activité de ce type."}
                actionLabel={filter === 'all' ? "Enregistrer une activité" : undefined}
                actionHref={filter === 'all' ? "/nouvelle-activite" : undefined}
              />
            )}

            <div className="flex flex-col gap-4">
              {filteredActivities.map((a, i) => (
                <ActivityCard key={a.batch_id} activity={a} index={i} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </div>
          </div>

          <aside className="hidden lg:flex flex-col gap-4 sticky top-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-[11px] uppercase tracking-wide mb-1">Cette semaine</p>
              <p className="text-2xl font-semibold text-white mb-3">{weekTotal} <span className="text-sm text-white/40 font-normal">activités</span></p>
              <div className="flex flex-col gap-2.5">
                {Object.keys(typeLabels).map((type) => (
                  <div key={type} className="flex items-center gap-2.5">
                    <Icon name={type} size={15} style={{ color: 'var(--text-secondary)' }} className="shrink-0" />
                    <span className="text-xs text-white/60 flex-1">{typeLabels[type]}</span>
                    <span className="text-xs font-semibold text-white">{weekCounts[type]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-[11px] uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-semibold text-white">{activities.length} <span className="text-sm text-white/40 font-normal">activités</span></p>
              <p className="text-[11px] text-white/30 mt-1">depuis le début</p>
            </div>

            <a
              href="/nouvelle-activite"
              className="text-center text-white text-sm font-medium py-3 rounded-2xl transition-all hover:brightness-110"
              style={{ backgroundColor: ACCENT }}
            >
              + Nouvelle activité
            </a>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default Feed;