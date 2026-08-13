import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import phoneIcon from '../assets/Phone.png';
import calendarIcon from '../assets/calendar.png';
import documentIcon from '../assets/document.png';
import cartIcon from '../assets/Cart.png';

const ACCENT = '#f86635';

function ActivityCard({ activity, index, icons, titles }) {
  const [showComment, setShowComment] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initiales = user?.nom?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ZF';

  const addComment = () => {
    if (!commentText.trim()) return;
    setComments((c) => [...c, commentText]);
    setCommentText('');
  };

  const statutLabels = { repond: 'Répond', ne_repond_pas: 'Ne répond pas', present: 'Présent', absent: 'Absent' };

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
      style={{ animation: `slideIn 0.35s ease ${index * 0.04}s both` }}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: ACCENT }}>
          {initiales}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{user?.nom || 'Toi'}</p>
          <p className="text-xs text-white/40">{new Date(activity.date_activite).toLocaleString('fr-FR')}</p>
        </div>
        <img src={icons[activity.type]} alt={activity.type} className="w-6 h-6 opacity-70" />
      </div>

      <div className="px-4 pb-3">
        <p className="text-lg font-semibold text-white mb-2">{titles[activity.type]}</p>
        {(activity.sens || activity.statut) && (
          <div className="flex gap-6">
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
      </div>

      {comments.length > 0 && (
        <div className="px-4 pb-2 text-xs text-white/40">
          {comments.length} commentaire{comments.length > 1 ? 's' : ''}
        </div>
      )}

      <div className="border-t border-white/10 px-2 py-1 flex">
        <button onClick={() => setShowComment((s) => !s)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors">
          💬 Commenter
        </button>
      </div>

      {showComment && (
        <div className="border-t border-white/10 p-3 animate-[fadeIn_0.2s_ease]">
          {comments.map((c, i) => (
            <p key={i} className="text-sm text-white/70 mb-2">💬 {c}</p>
          ))}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="Écrire un commentaire..."
              className="flex-1 bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
            />
            <button onClick={addComment} className="px-3 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: ACCENT }}>
              Envoyer
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function Feed() {
  const [activities, setActivities] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    apiFetch('http://localhost:5000/api/activities').then(r => r.json()).then(setActivities);
  }, [token]);

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
    <div className="bg-black p-6 pb-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-1">Feed</h1>
        <p className="text-white/40 text-sm mb-6">Toutes tes activités, façon flux social</p>

        {activities.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-10">Aucune activité pour l'instant. Enregistre-en une !</p>
        )}

        <div className="flex flex-col gap-4">
          {activities.map((a, i) => (
            <ActivityCard key={a.id} activity={a} index={i} icons={icons} titles={titles} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Feed;