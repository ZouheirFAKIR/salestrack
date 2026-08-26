import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';
import Spinner from './Spinner';
import { Icon } from '../data/icons';
import CoinIcon from './CoinIcon';
import { apiFetch, API_URL } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';

const ACCENT = '#f86635';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [loggingOut, setLoggingOut] = useState(false);
  const [points, setPoints] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'admin';
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);

  const handleDismiss = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    apiFetch(`${API_URL}/api/admin/notifications/redemptions/${id}/dismiss`, { method: 'PATCH' }).catch(() => {});
  };

  const loadNotifications = () => {
    if (!isAdmin) return;
    apiFetch(`${API_URL}/api/admin/notifications/redemptions`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications);
        setUnseenCount(data.unseenCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
  }, [location.pathname]);

  const handleNotifClick = () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && unseenCount > 0) {
      apiFetch(`${API_URL}/api/admin/notifications/redemptions/mark-seen`, { method: 'POST' })
        .then(() => setUnseenCount(0))
        .catch(() => {});
    }
  };

  const loadPoints = () => {
    if (!user) return;
    apiFetch(`${API_URL}/api/rewards/balance`)
      .then((r) => r.json())
      .then((data) => setPoints(data.balance))
      .catch(() => {});
  };

  useEffect(() => {
    loadPoints();
  }, [location.pathname]);

  useEffect(() => {
    window.addEventListener('points-updated', loadPoints);
    return () => window.removeEventListener('points-updated', loadPoints);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

    const primaryLinks = [
    { path: '/nouvelle-activite', label: 'Nouvelle activité', iconName: 'add' },
    { path: '/', label: 'Dashboard', iconName: 'dashboard' },
    { path: '/feed', label: 'Feed', iconName: 'feed' },
  ];

  const secondaryLinks = [
    { path: '/courses', label: 'Formation', iconName: 'formation' },
    { path: '/badges', label: 'Badges', iconName: 'badges' },
    { path: '/rewards', label: 'Récompenses', iconName: 'gift' },
  ];

  const links = [...primaryLinks, ...secondaryLinks];

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }, 300);
  };

    const renderIcon = (link, active) => (
    <Icon
      name={link.iconName}
      size={16}
      className="shrink-0"
    />
  );

  return (
    <nav className="bg-black border-b border-white/10 sticky top-0 z-30">
      <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Link to="/nouvelle-activite" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <img src={yealeadLogo} alt="Yealead" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
          <span className="text-white font-semibold text-base sm:text-lg hidden sm:inline">SalesTrack</span>
        </Link>

        {/* 3 liens principaux, visibles sur tous les écrans */}
        <div className="flex gap-1 bg-white/5 rounded-full p-1 overflow-x-auto max-w-full">
          {primaryLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 whitespace-nowrap shrink-0"
                style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500, boxShadow: `0 0 16px ${ACCENT}66` } : { color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {renderIcon(link, active)}
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
          {/* Les 3 autres liens réapparaissent ici seulement sur grand écran */}
          {secondaryLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200 whitespace-nowrap shrink-0"
                style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500, boxShadow: `0 0 16px ${ACCENT}66` } : { color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {renderIcon(link, active)}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
                    <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
            aria-label="Changer de thème"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
              </svg>
            )}
          </button>

          {isAdmin && (
            <div className="relative">
              <button
                onClick={handleNotifClick}
                className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors relative"
                aria-label="Notifications"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unseenCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unseenCount > 9 ? '9+' : unseenCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 w-72 max-h-96 overflow-y-auto bg-[#0d0d0d] border border-white/10 rounded-xl shadow-xl z-40 p-2">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-[11px] text-white/40 uppercase tracking-wide">Échanges récents</p>
                    <Link to="/admin/notifications" onClick={() => setNotifOpen(false)} className="text-[11px] font-medium" style={{ color: ACCENT }}>
                      Voir tout
                    </Link>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-4">Aucune notification</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`flex items-center gap-2 p-2 rounded-lg group ${!n.seen_by_admin ? 'bg-orange-500/5' : ''}`}>
                        {n.image_url ? (
                          <img src={n.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-sm shrink-0">🎁</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/80 truncate">
                            <span className="font-medium">{n.commercial_nom}</span> a échangé {n.quantity > 1 ? `${n.quantity} × ` : ''}{n.title}
                          </p>
                          <p className="text-[10px] text-white/40">{new Date(n.redeemed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button
                          onClick={(e) => handleDismiss(n.id, e)}
                          className="text-white/20 hover:text-white/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                          aria-label="Masquer"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {user && points !== null && (
            <Link
              to="/rewards"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <CoinIcon size={16} />
              <span className="text-white text-xs font-semibold">{points}</span>
            </Link>
          )}

          {user ? (
            <>
              <Link to="/profile" className="hover:opacity-80 transition-opacity hidden sm:block">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-white flex items-center justify-center p-1">
                    <img src={yealeadLogo} alt="Profil" className="w-full h-full object-contain" />
                  </div>
                )}
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden md:flex items-center justify-center px-3 py-1.5 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-60 gap-1.5 shrink-0"
                aria-label="Déconnexion"
              >
                {loggingOut ? <Spinner size={14} color="currentColor" /> : (
                  <img src={yealeadLogo} alt="" className="w-4 h-4 object-contain" style={{ filter: 'brightness(0) invert(0.7)' }} />
                )}
                <span className="text-xs">{loggingOut ? '' : 'Déconnexion'}</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1.5 text-sm px-5 py-2 rounded-full text-white transition-all whitespace-nowrap shrink-0 hover:brightness-110 active:scale-95"
              style={{ backgroundColor: ACCENT, boxShadow: `0 2px 12px ${ACCENT}50` }}
            >
              <img src={yealeadLogo} alt="" className="w-4 h-4 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              Connexion
            </Link>
          )}

          {/* Bouton hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
                        className="md:hidden w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu déroulant mobile */}
      {menuOpen && (
                <div className="md:hidden border-t border-white/10 px-3 py-3 flex flex-col gap-1 bg-black animate-[fadeIn_0.15s_ease]">
          {secondaryLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                                style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500 } : { color: 'var(--text-secondary)' }}
              >
                {renderIcon(link, active)}
                <span>{link.label}</span>
              </Link>
            );
          })}
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white transition-colors">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5">
                    <img src={yealeadLogo} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <span>Profil</span>
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white transition-colors text-left"
              >
                {loggingOut ? <Spinner size={14} color="currentColor" /> : (
                  <img src={yealeadLogo} alt="" className="w-4 h-4 object-contain" style={{ filter: 'brightness(0) invert(0.5)' }} />
                )}
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm px-5 py-2.5 rounded-lg text-white mt-1"
              style={{ backgroundColor: ACCENT }}
            >
              Connexion
            </Link>
          )}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </nav>
  );
}

export default Navbar;