import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { compressImage } from '../utils/imageCompress';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import { Icon } from '../data/icons';
import EmptyState from '../components/EmptyState';
import CoinIcon from '../components/CoinIcon';
import goldTrophy from '../assets/trophy.png';
const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 15;

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

function Avatar({ nom, photoUrl, size = 40 }) {
  const initiales = nom?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  if (photoUrl) {
    return <img src={photoUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
    >
      {initiales}
    </div>
  );
}

function LikeButton({ postId, initialLiked, initialCount }) {
  const [liked, setLiked] = useState(!!initialLiked);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? Math.max(0, count - 1) : count + 1);
    try {
      const res = await apiFetch(`${API_URL}/api/activities/${postId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount(data.likes_count);
      } else {
        setLiked(prevLiked);
        setCount(prevCount);
      }
    } catch (err) {
      setLiked(prevLiked);
      setCount(prevCount);
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggleLike}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
      style={{ color: liked ? '#f43f5e' : 'var(--text-secondary)' }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="text-xs font-medium">{count > 0 ? count : ''}</span>
    </button>
  );
}

function CommentIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CommentsSection({ postId, initialCount, currentUserId }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/activities/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        setLoaded(true);
      }
    } catch (err) {}
    setLoading(false);
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiFetch(`${API_URL}/api/activities/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCount((c) => c + 1);
        setText('');
      }
    } catch (err) {}
    setSending(false);
  };

  const handleDelete = async (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCount((c) => Math.max(0, c - 1));
    try {
      await apiFetch(`${API_URL}/api/activities/comments/${commentId}`, { method: 'DELETE' });
    } catch (err) {}
  };

  return (
    <div>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
        style={{ color: 'var(--text-secondary)' }}
      >
        <CommentIcon />
        <span className="text-xs font-medium">{count > 0 ? count : ''}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 animate-[fadeIn_0.2s_ease]">
          {loading && (
            <div className="py-3 flex justify-center">
              <Spinner size={16} color="#888" />
            </div>
          )}

          {!loading && comments.length === 0 && (
            <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
              Aucun commentaire. Sois le premier à réagir !
            </p>
          )}

          <div className="flex flex-col gap-2.5 mb-3">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar nom={c.commercial_nom} photoUrl={c.commercial_photo_url} size={28} />
                <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--surface-strong)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{c.commercial_nom}</p>
                    {c.commercial_id === currentUserId && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-[10px] font-medium transition-opacity hover:opacity-70"
                        style={{ color: ACCENT }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Écrire un commentaire..."
              className="flex-1 text-xs px-3 py-2.5 rounded-full outline-none transition-colors focus:border-orange-500/60"
              style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all hover:brightness-110 shrink-0"
              style={{ backgroundColor: ACCENT }}
            >
              {sending ? <Spinner size={13} color="#fff" /> : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RedemptionCard({ item, index, currentUserId }) {
  const n = Number(item.nombre);

  return (
    <div
      className="bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden transition-all hover:border-white/[0.14] p-4"
      style={{ animation: `slideIn 0.35s ease ${index * 0.04}s both` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar nom={item.commercial_nom} photoUrl={item.commercial_photo_url} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{item.commercial_nom}</p>
          <p className="text-xs text-white/35">{new Date(item.date_activite).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
          <Icon name="gift" size={15} style={{ color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-black/40 flex items-center justify-center text-xl shrink-0 border border-white/10">🎁</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {n > 1 ? `${n} × ` : ''}{item.reward_title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Récompense échangée contre ses points
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium mt-1.5" style={{ color: ACCENT }}>
            <CoinIcon size={12} />
            −{item.cost_at_redemption} points
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <LikeButton postId={item.batch_id} initialLiked={item.liked_by_me} initialCount={item.likes_count} />
        <CommentsSection postId={item.batch_id} initialCount={item.comments_count} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

function AnnouncementCard({ item, index }) {
  const isChallenge = item.type === 'challenge_won';
  return (
    <div
      className="rounded-2xl overflow-hidden p-4 flex items-center gap-4"
      style={{
        backgroundColor: 'var(--surface-strong)',
        border: '1px solid #d4af3755',
        boxShadow: '0 0 20px #d4af3722',
        animation: `slideIn 0.35s ease ${index * 0.04}s both`,
      }}
    >
      <img src={goldTrophy} alt="" className="w-14 h-14 object-contain shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#b8860b' }}>
          {isChallenge ? 'Défi remporté' : 'Champion du jour'}
        </p>
        <div className="flex items-center gap-2 mb-1">
          <Avatar nom={item.commercial_nom} photoUrl={item.commercial_photo_url} size={24} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.commercial_nom}</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {isChallenge
            ? `A remporté le défi "${item.description}" 🏆`
            : `${item.nombre} activité${Number(item.nombre) > 1 ? 's' : ''} enregistrée${Number(item.nombre) > 1 ? 's' : ''} aujourd'hui 🏆`}
        </p>
      </div>
    </div>
  );
}

function ActivityCard({ activity, index, currentUserId, onUpdate, onDelete }) {
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

  const isOwn = activity.commercial_id === currentUserId;
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
        <Avatar nom={activity.commercial_nom} photoUrl={activity.commercial_photo_url} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{activity.commercial_nom}{isOwn && <span className="text-white/30 font-normal"> (toi)</span>}</p>
          <p className="text-xs text-white/35">{new Date(activity.date_activite).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
          <Icon name={activity.type} size={15} style={{ color: 'var(--text-primary)' }} />
        </div>
        {isOwn && (
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
        )}
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
            className="w-full p-3 rounded-xl text-sm outline-none focus:border-orange-500/60 transition-colors resize-none"
            style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
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

      {!editing && (
        <div className="flex items-center gap-1 px-2" style={{ borderTop: '1px solid var(--border)' }}>
          <LikeButton postId={activity.batch_id} initialLiked={activity.liked_by_me} initialCount={activity.likes_count} />
          <CommentsSection postId={activity.batch_id} initialCount={activity.comments_count} currentUserId={currentUserId} />
        </div>
      )}

      {!editing && !confirmDelete && isOwn && (
        <div className="px-2 py-1 flex" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setEditing(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
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

function Pager({ currentPage, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const window = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= currentPage - window && p <= currentPage + window)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-white/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        aria-label="Page précédente"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>⋯</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
            style={p === currentPage
              ? { backgroundColor: ACCENT, color: '#fff', boxShadow: `0 0 14px ${ACCENT}55`, transform: 'scale(1.05)' }
              : { border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-white/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        aria-label="Page suivante"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

const TYPE_FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'appel', label: 'Appels', icon: 'appel' },
  { key: 'rdv', label: 'RDV', icon: 'rdv' },
  { key: 'devis', label: 'Devis', icon: 'devis' },
  { key: 'commande', label: 'Commandes', icon: 'commande' },
  { key: 'reward', label: 'Récompenses', icon: 'gift' },
  { key: 'champion', label: 'Champions', icon: 'badges' },
];

function Feed() {
  const [activities, setActivities] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [feedStats, setFeedStats] = useState({ weekCounts: { appel: 0, rdv: 0, devis: 0, commande: 0 }, weekTotal: 0, myTotal: 0 });
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(PAGE_SIZE),
      type: filter,
      search,
    });
    if (currentPage === 1 && filter === 'all' && !search) setLoading(true);
    else setPageLoading(true);

    apiFetch(`${API_URL}/api/activities?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setActivities(data.activities || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
        setPageLoading(false);
      });
  }, [token, currentPage, filter, search]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/api/activities/my-feed-stats`)
      .then((r) => r.json())
      .then(setFeedStats)
      .catch(() => {});
  }, [token]);

  const scrollToFeedTop = () => {
    document.getElementById('feed-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    scrollToFeedTop();
  };

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
        <h1 className="text-xl font-semibold text-white mb-2">Connecte-toi pour voir le feed</h1>
        <p className="text-white/40 text-sm mb-6">L'activité de l'équipe apparaîtra ici</p>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  const typeLabels = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-1">Feed</h1>
        <p className="text-white/40 text-sm mb-5">L'activité de toute l'équipe, en direct</p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

          <div>
            <div className="relative mb-4">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher une activité, une personne, une récompense..."
                className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl outline-none transition-colors focus:border-orange-500/60"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
              {TYPE_FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all"
                    style={active
                      ? { backgroundColor: ACCENT, color: '#fff', boxShadow: `0 2px 12px ${ACCENT}55` }
                      : { backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    {f.icon && <Icon name={f.icon} size={13} />}
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div id="feed-list-top" />

            {pageLoading && (
              <div className="py-10 flex justify-center">
                <Spinner size={22} color={ACCENT} />
              </div>
            )}

            {!pageLoading && activities.length === 0 && (
              <EmptyState
                icon="📭"
                title={search ? "Aucun résultat" : (filter === 'all' ? "Le feed est vide" : "Aucune activité de ce type")}
                subtitle={search ? "Essaie un autre mot-clé." : (filter === 'all' ? "Enregistre une activité et elle apparaîtra ici, visible par toute l'équipe." : "Change de filtre ou enregistre une nouvelle activité de ce type.")}
                actionLabel={filter === 'all' && !search ? "Enregistrer une activité" : undefined}
                actionHref={filter === 'all' && !search ? "/nouvelle-activite" : undefined}
              />
            )}

            {!pageLoading && activities.length > 0 && (
              <div key={currentPage} className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease]">
                {activities.map((a, i) => (
                  a.kind === 'redemption'
                    ? <RedemptionCard key={a.batch_id} item={a} index={i} currentUserId={currentUser?.id} />
                    : a.kind === 'announcement'
                    ? <AnnouncementCard key={a.batch_id} item={a} index={i} />
                    : <ActivityCard key={a.batch_id} activity={a} index={i} currentUserId={currentUser?.id} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            )}

            <Pager currentPage={currentPage} totalPages={totalPages} onChange={handlePageChange} />
          </div>

          <aside className="hidden lg:flex flex-col gap-4 sticky top-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-[11px] uppercase tracking-wide mb-1">Mon activité — cette semaine</p>
              <p className="text-2xl font-semibold text-white mb-3">{feedStats.weekTotal} <span className="text-sm text-white/40 font-normal">activités</span></p>
              <div className="flex flex-col gap-2.5">
                {Object.keys(typeLabels).map((type) => (
                  <div key={type} className="flex items-center gap-2.5">
                    <Icon name={type} size={15} style={{ color: 'var(--text-secondary)' }} className="shrink-0" />
                    <span className="text-xs text-white/60 flex-1">{typeLabels[type]}</span>
                    <span className="text-xs font-semibold text-white">{feedStats.weekCounts[type] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-[11px] uppercase tracking-wide mb-1">Mon total</p>
              <p className="text-2xl font-semibold text-white">{feedStats.myTotal} <span className="text-sm text-white/40 font-normal">activités</span></p>
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