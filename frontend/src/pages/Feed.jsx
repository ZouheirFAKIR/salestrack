import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { compressImage } from '../utils/imageCompress';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import { Icon } from '../data/icons';
import { TYPE_COLORS } from '../data/typeColors';
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

function Avatar({ nom, photoUrl, size = 40, dot }) {
  const initiales = nom?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const face = photoUrl ? (
    <img src={photoUrl} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.35, background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
    >
      {initiales}
    </div>
  );
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {face}
      {dot && (
        <span
          className="absolute -right-0.5 -bottom-0.5 w-4 h-4 rounded-full"
          style={{ backgroundColor: dot, border: '3px solid var(--bg)' }}
        />
      )}
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
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
      style={{ color: liked ? '#f43f5e' : 'var(--text-secondary)' }}
      aria-label="J'aime"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="text-xs font-medium">{count > 0 ? count : "J'aime"}</span>
    </button>
  );
}

function CommentIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
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
    <div className="contents">
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
        style={{ color: open ? ACCENT : 'var(--text-secondary)' }}
        aria-expanded={open}
      >
        <CommentIcon />
        <span className="text-xs font-medium">{count > 0 ? count : 'Commenter'}</span>
      </button>

      {open && (
        <div className="basis-full w-full pt-3 mt-1 animate-[fadeIn_0.2s_ease]" style={{ borderTop: '1px solid var(--border)' }}>
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

// ---------- Petits éléments partagés par les cartes ----------
const STATUT_LABELS = { repond: 'Répond', ne_repond_pas: 'Ne répond pas', present: 'Présent', absent: 'Absent' };
const GOOD_STATUTS = ['repond', 'present'];

function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Phrase du haut : « Meryem Talbi a passé 12 appels »
function activitySentence(activity) {
  const n = Number(activity.nombre) || 1;
  const many = n > 1;
  const parts = {
    appel: ['a passé', many ? `${n} appels` : 'un appel'],
    rdv: ['a eu', many ? `${n} rendez-vous` : 'un rendez-vous'],
    devis: ['a envoyé', many ? `${n} devis` : 'un devis'],
    commande: ['a conclu', many ? `${n} commandes` : 'une commande'],
  };
  return parts[activity.type] || ['a enregistré', getTitleText(activity)];
}

// « Odoo - S02816 » devient une étiquette verte au lieu d'un texte
function odooRef(description) {
  const m = (description || '').trim().match(/^Odoo\s*-\s*(\S+)$/i);
  return m ? m[1] : null;
}

function Tag({ children, tone }) {
  const tones = {
    good: { color: '#4ade80', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' },
    bad: { color: '#f87171', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' },
    accent: { color: ACCENT, backgroundColor: `${ACCENT}12`, border: `1px solid ${ACCENT}40` },
  };
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
      style={tones[tone] || { color: 'var(--text-secondary)', backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}
    >
      {children}
    </span>
  );
}

function CardShell({ index, highlight, children }) {
  return (
    <article
      className="rounded-2xl px-3.5 py-3 sm:px-4 transition-colors"
      style={{
        background: highlight
          ? `linear-gradient(135deg, ${highlight}1f, var(--surface) 55%)`
          : 'var(--surface)',
        border: `1px solid ${highlight ? `${highlight}59` : 'var(--border)'}`,
        animation: `slideIn 0.35s ease ${Math.min(index, 8) * 0.04}s both`,
      }}
    >
      {children}
    </article>
  );
}

function CardHead({ nom, photoUrl, dot, isOwn, verb, object, emoji, date, actions }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar nom={nom} photoUrl={photoUrl} size={42} dot={dot} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
          <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{nom}</b>
          {isOwn && <span style={{ color: 'var(--text-muted)' }}> (toi)</span>}
          {' '}{verb}{' '}
          {object && <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{object}</b>}
          {emoji && ` ${emoji}`}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatTime(date)}</p>
      </div>
      {actions}
    </div>
  );
}

// Ligne du bas : étiquettes à gauche, j'aime + commentaires à droite
function CardFooter({ tags, postId, likedByMe, likesCount, commentsCount, currentUserId }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 sm:pl-[54px]">
      {tags}
      <div className="ml-auto flex items-center gap-0.5">
        <LikeButton postId={postId} initialLiked={likedByMe} initialCount={likesCount} />
      </div>
      <CommentsSection postId={postId} initialCount={commentsCount} currentUserId={currentUserId} />
    </div>
  );
}

const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 hover:bg-[var(--surface-strong)]';

function RedemptionCard({ item, index, currentUserId }) {
  const n = Number(item.nombre);
  return (
    <CardShell index={index}>
      <CardHead
        nom={item.commercial_nom}
        photoUrl={item.commercial_photo_url}
        dot={ACCENT}
        isOwn={item.commercial_id === currentUserId}
        verb="a échangé"
        object={`${n > 1 ? `${n} × ` : ''}${item.reward_title}`}
        emoji="🎁"
        date={item.date_activite}
        actions={item.image_url && (
          <img src={item.image_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" style={{ border: '1px solid var(--border)' }} />
        )}
      />
      <CardFooter
        tags={(
          <Tag tone="accent">
            <span className="inline-flex items-center gap-1"><CoinIcon size={12} />−{item.cost_at_redemption} points</span>
          </Tag>
        )}
        postId={item.batch_id}
        likedByMe={item.liked_by_me}
        likesCount={item.likes_count}
        commentsCount={item.comments_count}
        currentUserId={currentUserId}
      />
    </CardShell>
  );
}

function AnnouncementCard({ item, index }) {
  const isChallenge = item.type === 'challenge_won';
  const n = Number(item.nombre);
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.14), var(--surface) 60%)',
        border: '1px solid #d4af3755',
        animation: `slideIn 0.35s ease ${Math.min(index, 8) * 0.04}s both`,
      }}
    >
      <img src={goldTrophy} alt="" className="w-11 h-11 object-contain shrink-0" />
      <Avatar nom={item.commercial_nom} photoUrl={item.commercial_photo_url} size={34} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
          <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.commercial_nom}</b>
          {isChallenge
            ? <> a remporté le défi <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.description}</b></>
            : <> est le champion du jour avec <b className="font-semibold" style={{ color: 'var(--text-primary)' }}>{n} activité{n > 1 ? 's' : ''}</b></>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#d4af37' }}>{isChallenge ? 'Défi remporté' : 'Champion du jour'}</p>
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
  const ref = odooRef(activity.description);
  const note = ref ? '' : activity.description;
  const isLongText = (note || '').length > 160;
  const displayText = expanded || !isLongText ? note : `${note.slice(0, 160)}...`;
  const [verb, object] = activitySentence(activity);
  const color = TYPE_COLORS[activity.type] || ACCENT;
  const isWin = activity.type === 'commande';

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
      const res = await apiFetch(`${API_URL}/api/activities/batch/${activity.batch_id}`, { method: 'DELETE' });
      if (res.ok) onDelete(activity.batch_id);
    } catch (err) {
      console.error(err);
    }
    setDeleting(false);
  };

  const tags = (
    <>
      {activity.sens && <Tag>{activity.sens === 'sortant' ? 'Sortant' : 'Entrant'}</Tag>}
      {activity.statut && <Tag tone={GOOD_STATUTS.includes(activity.statut) ? 'good' : 'bad'}>{STATUT_LABELS[activity.statut]}</Tag>}
      {ref && <Tag tone="good"><span className="font-mono">Odoo {ref}</span></Tag>}
    </>
  );

  return (
    <CardShell index={index} highlight={isWin ? color : null}>
      {lightbox && <ImageLightbox src={activity.image_url} onClose={() => setLightbox(false)} />}

      <CardHead
        nom={activity.commercial_nom}
        photoUrl={activity.commercial_photo_url}
        dot={color}
        isOwn={isOwn}
        verb={verb}
        object={object}
        emoji={isWin ? '🎉' : null}
        date={activity.date_activite}
        actions={isOwn && !editing && (
          <div className="flex items-center -mr-1.5">
            <button onClick={() => setEditing(true)} className={iconBtn} style={{ color: 'var(--text-muted)' }} aria-label="Modifier" title="Ajouter ou modifier la note et la photo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
            <button onClick={() => setConfirmDelete(true)} className={`${iconBtn} hover:text-red-500`} style={{ color: 'var(--text-muted)' }} aria-label="Supprimer" title="Supprimer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
              </svg>
            </button>
          </div>
        )}
      />

      {confirmDelete && (
        <div className="mt-2.5 sm:ml-[54px] px-3 py-2 rounded-xl flex items-center gap-2 animate-[fadeIn_0.2s_ease]" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
          <p className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
            Supprimer {Number(activity.nombre) > 1 ? `ces ${activity.nombre} activités` : 'cette activité'} ?
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting ? <Spinner size={12} color="#fff" /> : 'Confirmer'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Annuler
          </button>
        </div>
      )}

      {!editing && note && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap mt-2 sm:pl-[54px]" style={{ color: 'var(--text-secondary)' }}>
          {displayText}
          {isLongText && (
            <button onClick={() => setExpanded((e) => !e)} className="ml-1 text-sm font-medium" style={{ color: ACCENT }}>
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </p>
      )}

      {!editing && activity.image_url && (
        <div className="mt-2.5 sm:pl-[54px]">
          <button onClick={() => setLightbox(true)} className="block w-full rounded-xl overflow-hidden bg-black" style={{ border: '1px solid var(--border)' }}>
            <img src={activity.image_url} alt="" className="w-full max-h-80 object-cover hover:opacity-90 transition-opacity" />
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-3 sm:pl-[54px] animate-[fadeIn_0.2s_ease]">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ajouter une note..."
            rows={3}
            className="w-full p-3 rounded-xl text-sm outline-none focus:border-orange-500/60 transition-colors resize-none"
            style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          {imageLoading && (
            <div className="mt-2 h-32 rounded-xl bg-black flex items-center justify-center" style={{ border: '1px solid var(--border)' }}>
              <Spinner size={22} color={ACCENT} />
            </div>
          )}

          {!imageLoading && imageUrl && (
            <div className="relative mt-2 rounded-xl overflow-hidden bg-black" style={{ border: '1px solid var(--border)' }}>
              <img src={imageUrl} alt="" className="w-full max-h-64 object-contain" />
              <button
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors"
                aria-label="Retirer l'image"
              >
                ×
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

          <div className="flex items-center gap-2 mt-2">
            <label
              className="text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 hover:bg-[var(--surface-strong)]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => { setEditing(false); setDescription(activity.description || ''); setImageUrl(activity.image_url || ''); setError(''); }}
                className="text-xs px-3 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
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
        <CardFooter
          tags={tags}
          postId={activity.batch_id}
          likedByMe={activity.liked_by_me}
          likesCount={activity.likes_count}
          commentsCount={activity.comments_count}
          currentUserId={currentUserId}
        />
      )}
    </CardShell>
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
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-[var(--surface-strong)]"
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
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-[var(--surface-strong)]"
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
  { key: 'appel', label: 'Appels', color: TYPE_COLORS.appel },
  { key: 'rdv', label: 'RDV', color: TYPE_COLORS.rdv },
  { key: 'devis', label: 'Devis', color: TYPE_COLORS.devis },
  { key: 'commande', label: 'Commandes', color: TYPE_COLORS.commande },
  { key: 'reward', label: 'Récompenses', icon: 'gift' },
  { key: 'champion', label: 'Champions', icon: 'badges' },
];

const TYPE_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };

// « Aujourd'hui », « Hier » ou « jeudi 9 octobre »
function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupByDay(items) {
  const groups = [];
  items.forEach((item) => {
    const key = new Date(item.date_activite).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(item.date_activite), items: [item] });
  });
  return groups;
}

// ---------- Colonne de droite ----------
function SideBox({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl px-4 py-3.5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      {children}
    </section>
  );
}

function BarRow({ label, color, percent, value }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_2.75rem] items-center gap-2.5 text-xs mt-2">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${percent}%`, backgroundColor: color }} />
      </span>
      <b className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</b>
    </div>
  );
}

function weekRangeLabel() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const f = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `Du ${f(monday)} au ${f(sunday)}`;
}

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
  const [myQuotas, setMyQuotas] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
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
      })
      .catch(() => { setLoading(false); setPageLoading(false); });
  }, [token, currentPage, filter, search]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/api/activities/my-feed-stats`)
      .then((r) => r.json())
      .then(setFeedStats)
      .catch(() => {});
    apiFetch(`${API_URL}/api/activities/my-type-quotas`)
      .then((r) => r.json())
      .then((d) => setMyQuotas(d?.quotas ? d : null))
      .catch(() => {});
    apiFetch(`${API_URL}/api/activities/leaderboard`)
      .then((r) => r.json())
      .then((d) => setLeaderboard(Array.isArray(d) ? d.slice(0, 3) : []))
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
    setActivities((prev) => prev.map((a) => (a.batch_id === batchId ? { ...a, ...updates } : a)));
  };

  const handleDelete = (batchId) => {
    setActivities((prev) => prev.filter((a) => a.batch_id !== batchId));
  };

  if (loading) return <PageLoader />;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <span className="text-4xl mb-4">🔒</span>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connecte-toi pour voir le feed</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>L'activité de l'équipe apparaîtra ici</p>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  const maxWeekCount = Math.max(...Object.values(feedStats.weekCounts), 1);
  const groups = groupByDay(activities);
  let cardIndex = 0;

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-5 sm:px-6 lg:px-7 pb-12 relative overflow-clip" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 right-0 w-[40rem] h-[28rem] pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${ACCENT}1c, transparent)` }}
      />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* En-tête */}
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Feed</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>L'activité de toute l'équipe, en direct</p>
          </div>
          <a
            href="/nouvelle-activite"
            className="shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:brightness-110"
            style={{ backgroundColor: ACCENT, boxShadow: `0 4px 18px ${ACCENT}40` }}
          >
            + Nouvelle activité
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">

          {/* ===== Fil d'activité ===== */}
          <div className="min-w-0">
            <div className="relative mb-3">
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

            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
              {TYPE_FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    aria-pressed={active}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-all"
                    style={active
                      ? { backgroundColor: ACCENT, color: '#fff', boxShadow: `0 2px 12px ${ACCENT}55` }
                      : { backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    {f.color && <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: active ? '#fff' : f.color }} />}
                    {f.icon && <Icon name={f.icon} size={13} />}
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div id="feed-list-top" className="scroll-mt-24" />

            {pageLoading && (
              <div className="py-10 flex justify-center">
                <Spinner size={22} color={ACCENT} />
              </div>
            )}

            {!pageLoading && activities.length === 0 && (
              <EmptyState
                icon="📭"
                title={search ? 'Aucun résultat' : (filter === 'all' ? 'Le feed est vide' : 'Aucune activité de ce type')}
                subtitle={search ? 'Essaie un autre mot-clé.' : (filter === 'all' ? "Enregistre une activité et elle apparaîtra ici, visible par toute l'équipe." : 'Change de filtre ou enregistre une nouvelle activité de ce type.')}
                actionLabel={filter === 'all' && !search ? 'Enregistrer une activité' : undefined}
                actionHref={filter === 'all' && !search ? '/nouvelle-activite' : undefined}
              />
            )}

            {!pageLoading && activities.length > 0 && (
              <div key={currentPage} className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease]">
                {groups.map((g) => (
                  <section key={g.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 pt-1">
                      <h2 className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{g.label}</h2>
                      <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {g.items.length} publication{g.items.length > 1 ? 's' : ''}
                      </span>
                      <span className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    </div>
                    {g.items.map((a) => {
                      const i = cardIndex++;
                      return a.kind === 'redemption'
                        ? <RedemptionCard key={a.batch_id} item={a} index={i} currentUserId={currentUser?.id} />
                        : a.kind === 'announcement'
                          ? <AnnouncementCard key={a.batch_id} item={a} index={i} />
                          : <ActivityCard key={a.batch_id} activity={a} index={i} currentUserId={currentUser?.id} onUpdate={handleUpdate} onDelete={handleDelete} />;
                    })}
                  </section>
                ))}
              </div>
            )}

            <Pager currentPage={currentPage} totalPages={totalPages} onChange={handlePageChange} />
          </div>

          {/* ===== Colonne de droite : compacte, toujours visible ===== */}
          <aside className="hidden lg:flex flex-col gap-2.5 sticky top-[88px]">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${ACCENT}, #e2531f)`, boxShadow: `0 6px 24px ${ACCENT}33` }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>🔥</span>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold leading-none" style={{ color: '#fff' }}>{feedStats.myTotal}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>activités depuis le début</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold leading-none" style={{ color: '#fff' }}>{feedStats.weekTotal}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>cette semaine</p>
              </div>
            </div>

            <section className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-[1fr_3.5rem_7.5rem] gap-2 items-end pb-1.5 mb-0.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mon activité</h2>
                <span className="text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>Semaine</span>
                <span className="text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>Objectif du jour</span>
              </div>
              {Object.keys(TYPE_LABELS).map((type) => {
                const week = feedStats.weekCounts[type] || 0;
                const cur = Number(myQuotas?.today?.[type] || 0);
                const target = Number(myQuotas?.quotas?.[type] || 0);
                const pct = target > 0 ? Math.max(Math.min(Math.round((cur / target) * 100), 100), cur > 0 ? 6 : 0) : 0;
                return (
                  <div key={type} className="grid grid-cols-[1fr_3.5rem_7.5rem] gap-2 items-center py-1.5 text-xs">
                    <span className="flex items-center gap-2 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
                      <span className="truncate">{TYPE_LABELS[type]}</span>
                    </span>
                    <b className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{week}</b>
                    <span className="flex items-center gap-2">
                      <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] }} />
                      </span>
                      <span className="w-11 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{myQuotas ? `${cur}/${target}` : '–'}</span>
                    </span>
                  </div>
                );
              })}
            </section>

            {leaderboard.length > 0 && (
              <section className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h2 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>Top du jour</h2>
                <ol className="flex flex-col gap-0.5">
                  {leaderboard.map((e, i) => {
                    const lead = i === 0 && Number(e.total) > 0;
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                        style={{ backgroundColor: lead ? `${ACCENT}14` : 'transparent' }}
                      >
                        <span className="w-4 text-xs font-bold text-center" style={{ color: lead ? ACCENT : 'var(--text-muted)' }}>{i + 1}</span>
                        <Avatar nom={e.nom} photoUrl={e.photo_url} size={26} />
                        <span className="flex-1 min-w-0 text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {e.nom}{e.id === currentUser?.id ? ' (toi)' : ''}
                        </span>
                        <b className="text-sm font-bold" style={{ color: lead ? ACCENT : 'var(--text-primary)' }}>{e.total}</b>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </aside>
          <aside className="hidden lg:flex flex-col gap-2.5 sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${ACCENT}, #e2531f)`, boxShadow: `0 6px 24px ${ACCENT}33` }}>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>🔥</span>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold leading-none" style={{ color: '#fff' }}>{feedStats.myTotal}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>activités depuis le début</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold leading-none" style={{ color: '#fff' }}>{feedStats.weekTotal}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>cette semaine</p>
              </div>
            </div>

            <SideBox title="Ma semaine" subtitle={weekRangeLabel()}>
              {Object.keys(TYPE_LABELS).map((type) => {
                const val = feedStats.weekCounts[type] || 0;
                return (
                  <BarRow
                    key={type}
                    label={TYPE_LABELS[type]}
                    color={TYPE_COLORS[type]}
                    percent={Math.max(Math.round((val / maxWeekCount) * 100), val > 0 ? 6 : 0)}
                    value={val}
                  />
                );
              })}
            </SideBox>

            {myQuotas && (
              <SideBox title="Mes objectifs du jour">
                {Object.keys(TYPE_LABELS).map((type) => {
                  const cur = Number(myQuotas.today?.[type] || 0);
                  const target = Number(myQuotas.quotas?.[type] || 0);
                  return (
                    <BarRow
                      key={type}
                      label={TYPE_LABELS[type]}
                      color={TYPE_COLORS[type]}
                      percent={target > 0 ? Math.max(Math.min(Math.round((cur / target) * 100), 100), cur > 0 ? 6 : 0) : 0}
                      value={`${cur}/${target}`}
                    />
                  );
                })}
              </SideBox>
            )}

            {leaderboard.length > 0 && (
              <SideBox title="Top du jour">
                <ol className="flex flex-col gap-1 mt-2">
                  {leaderboard.map((e, i) => {
                    const lead = i === 0 && Number(e.total) > 0;
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                        style={{ backgroundColor: lead ? `${ACCENT}14` : 'transparent' }}
                      >
                        <span className="w-4 text-xs font-bold text-center" style={{ color: lead ? ACCENT : 'var(--text-muted)' }}>{i + 1}</span>
                        <Avatar nom={e.nom} photoUrl={e.photo_url} size={28} />
                        <span className="flex-1 min-w-0 text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {e.nom}{e.id === currentUser?.id ? ' (toi)' : ''}
                        </span>
                        <b className="text-sm font-bold" style={{ color: lead ? ACCENT : 'var(--text-primary)' }}>{e.total}</b>
                      </li>
                    );
                  })}
                </ol>
              </SideBox>
            )}
          </aside>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { article { animation: none !important; } }
      `}</style>
    </div>
  );
}

export default Feed;