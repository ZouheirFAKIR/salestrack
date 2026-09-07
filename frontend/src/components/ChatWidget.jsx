import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiFetch } from '../utils/api';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function displayName(nom) {
  return nom === 'Badr Ben Laswad' ? 'Admin' : nom;
}

function Avatar({ user, size = 38 }) {
  if (user?.photo_url) {
    return <img src={user.photo_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, backgroundColor: ACCENT, color: '#fff', fontSize: size * 0.4 }}
    >
      {user?.nom?.charAt(0).toUpperCase()}
    </div>
  );
}

function ConversationList({ conversations, onSelect }) {
  if (conversations.length === 0) {
    return <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Personne pour l'instant</p>;
  }
  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-strong)]"
        >
          <Avatar user={{ ...c, nom: displayName(c.nom) }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayName(c.nom)}</p>
              {c.last_message_at && (
                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.last_message_at)}</span>
              )}
            </div>
            <p className="text-xs truncate" style={{ color: c.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: c.unread_count > 0 ? 600 : 400 }}>
              {c.last_message || 'Dis bonjour 👋'}
            </p>
          </div>
          {c.unread_count > 0 && (
            <span className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0" style={{ backgroundColor: ACCENT, color: '#fff' }}>
              {c.unread_count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ChatThread({ user, myId, me, onBack, refreshSignal, onRead }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const load = () => {
    apiFetch(`${API_URL}/api/messages/${user.id}`, { skipCache: true })
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
        onRead?.();
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    if (refreshSignal > 0) load();
  }, [refreshSignal]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput('');
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, sender_id: myId, receiver_id: user.id, content, created_at: new Date().toISOString() }]);
    await apiFetch(`${API_URL}/api/messages/${user.id}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    load();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2.5 px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ color: 'var(--text-secondary)' }}>‹</button>
        <Avatar user={{ ...user, nom: displayName(user.nom) }} size={30} />
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayName(user.nom)}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {loading ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aucun message. Dis bonjour 👋</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === myId;
            const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const author = isMine ? me : user;
            return (
              <div key={m.id} className={`w-full flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 max-w-[85%]`}>
                  <Avatar user={{ ...author, nom: displayName(author?.nom) }} size={24} />
                  <div
                    className="rounded-2xl px-3 py-2 text-sm break-words"
                    style={{
                      backgroundColor: isMine ? ACCENT : 'var(--surface-strong)',
                      border: isMine ? 'none' : '1px solid var(--border)',
                      color: isMine ? '#fff' : 'var(--text-primary)',
                      borderBottomRightRadius: isMine ? 4 : 16,
                      borderBottomLeftRadius: isMine ? 16 : 4,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
                <span className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-secondary)', marginLeft: isMine ? 0 : 32, marginRight: isMine ? 32 : 0 }}>{time}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris un message..."
          className="flex-1 text-sm px-3 py-2 rounded-full outline-none"
          style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: ACCENT, color: '#fff' }}
          aria-label="Envoyer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
        </button>
      </form>
    </div>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [threadRefreshSignal, setThreadRefreshSignal] = useState(0);
  const [toast, setToast] = useState(null);
  const activeUserRef = useRef(null);
  const conversationsRef = useRef([]);
  const openRef = useRef(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { openRef.current = open; }, [open]);

  const loadUnreadTotal = () => {
    apiFetch(`${API_URL}/api/messages/unread/count`, { skipCache: true })
      .then((r) => r.json())
      .then((d) => setUnreadTotal(d.count || 0))
      .catch(() => {});
  };

  const loadConversations = () => {
    apiFetch(`${API_URL}/api/messages/conversations`, { skipCache: true })
      .then((r) => r.json())
      .then((data) => setConversations(Array.isArray(data) ? data.filter((c) => c.id !== user?.id) : []))
      .catch(() => {});
  };

  const handleThreadRead = () => {
    loadUnreadTotal();
    loadConversations();
  };

  // Socket.io — événements en temps réel + déclenchement du toast pour les nouveaux messages entrants
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });

    socket.on('new_message', (msg) => {
      loadUnreadTotal();
      loadConversations();
      if (activeUserRef.current) {
        setThreadRefreshSignal((n) => n + 1);
      }

      const isIncoming = msg.sender_id !== user?.id;
      const alreadyViewing = openRef.current && activeUserRef.current?.id === msg.sender_id;
      if (isIncoming && !alreadyViewing) {
        const sender = conversationsRef.current.find((c) => c.id === msg.sender_id);
        setToast({ sender: sender || { id: msg.sender_id, nom: 'Nouveau message' }, content: msg.content });
      }
    });

    return () => socket.disconnect();
  }, [token]);

  // Permet à d'autres composants (ex: la cloche de la navbar) d'ouvrir une conversation précise
  useEffect(() => {
    const handleOpenChat = (e) => {
      setActiveUser(e.detail);
      setOpen(true);
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleToastClick = () => {
    setActiveUser(toast.sender);
    setOpen(true);
    setToast(null);
  };

  useEffect(() => {
    if (!token) return;
    const handleFocus = () => {
      loadUnreadTotal();
      if (!activeUserRef.current) loadConversations();
      else setThreadRefreshSignal((n) => n + 1);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadUnreadTotal();
    const interval = setInterval(loadUnreadTotal, 1000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!open || activeUser) return;
    loadConversations();
    const interval = setInterval(loadConversations, 1000);
    return () => clearInterval(interval);
  }, [open, activeUser]);

  const handleBack = () => {
    setActiveUser(null);
    loadConversations();
    loadUnreadTotal();
  };

  if (!token) return null;

  return (
    <>
      {toast && (
        <div
          onClick={handleToastClick}
          className="fixed top-4 right-4 z-[60] cursor-pointer overflow-hidden"
          style={{
            width: 320,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${ACCENT}`,
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            animation: 'toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="relative shrink-0">
              <Avatar user={{ ...toast.sender, nom: displayName(toast.sender.nom) }} size={42} />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: ACCENT, border: '2px solid var(--surface)' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.02 2 11c0 2.85 1.44 5.4 3.68 7.06L5 22l4.28-1.53c.87.24 1.79.37 2.72.37 5.52 0 10-4.02 10-9S17.52 2 12 2z" /></svg>
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-medium mb-0.5" style={{ color: ACCENT }}>Nouveau message</p>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{displayName(toast.sender.nom)}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{toast.content}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setToast(null); }}
              className="shrink-0 text-lg leading-none -mt-1"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <div className="h-[3px] w-full" style={{ backgroundColor: 'var(--surface-strong)' }}>
            <div className="h-full" style={{ backgroundColor: ACCENT, animation: 'toastProgress 5s linear forwards' }} />
          </div>
          <style>{`
            @keyframes toastSlideIn { from { opacity: 0; transform: translateX(40px) scale(0.9); } to { opacity: 1; transform: translateX(0) scale(1); } }
            @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
          `}</style>
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-50">
        <div
          className="absolute bottom-0 right-[68px] rounded-2xl flex flex-col overflow-hidden origin-right"
          style={{
            width: 280,
            height: 360,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            opacity: open ? 1 : 0,
            transform: open ? 'scale(1) translateX(0)' : 'scale(0.85) translateX(14px)',
            pointerEvents: open ? 'auto' : 'none',
            transition: 'opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {!activeUser ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Messages</p>
                <button onClick={() => setOpen(false)} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
              </div>
              <ConversationList conversations={conversations} onSelect={setActiveUser} />
            </>
          ) : (
            <ChatThread user={activeUser} myId={user?.id} me={user} onBack={handleBack} refreshSignal={threadRefreshSignal} onRead={handleThreadRead} />
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: ACCENT, color: '#fff' }}
          aria-label="Messages"
        >
          <span className="relative w-6 h-6 flex items-center justify-center">
            <svg
              width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
              className="absolute"
              style={{
                opacity: open ? 0 : 1,
                transform: open ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
            >
              <path d="M12 2C6.48 2 2 6.02 2 11c0 2.85 1.44 5.4 3.68 7.06L5 22l4.28-1.53c.87.24 1.79.37 2.72.37 5.52 0 10-4.02 10-9S17.52 2 12 2z" />
            </svg>
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className="absolute"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </span>
          {!open && unreadTotal > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ backgroundColor: '#ef4444', color: '#fff', border: '2px solid var(--bg)' }}
            >
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

export default ChatWidget;