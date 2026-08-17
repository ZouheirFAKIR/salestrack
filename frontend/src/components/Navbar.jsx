import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';
import addIcon from '../assets/add.png';
import dashboardIcon from '../assets/dashboard.png';
import feedIcon from '../assets/feed.png';
import Spinner from './Spinner';

const ACCENT = '#f86635';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [loggingOut, setLoggingOut] = useState(false);

  const links = [
    { path: '/nouvelle-activite', label: 'Nouvelle activité', icon: addIcon },
    { path: '/', label: 'Dashboard', icon: dashboardIcon },
    { path: '/feed', label: 'Feed', icon: feedIcon },
    {
      path: '/courses', label: 'Formation', svgIcon: (
        <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5Z M6 12v5c3 3 9 3 12 0v-5" />
      ),
    },
    {
      path: '/badges', label: 'Badges', svgIcon: (
        <>
          <circle cx="12" cy="8" r="6" />
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        </>
      ),
    },
    ...(user?.role === 'admin' ? [{
      path: '/admin', label: 'Admin', svgIcon: (
        <path d="M12 2 3 7v6c0 5 3.8 9.4 9 11 5.2-1.6 9-6 9-11V7Z" />
      ),
    }] : []),
  ];

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }, 300);
  };

  return (
    <nav className="bg-black border-b border-white/10 px-3 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20 gap-2">
      <Link to="/nouvelle-activite" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
        <img src={yealeadLogo} alt="Yealead" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
        <span className="text-white font-semibold text-base sm:text-lg hidden sm:inline">SalesTrack</span>
      </Link>

      <div className="flex gap-1 bg-white/5 rounded-full p-1 overflow-x-auto max-w-full">
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 whitespace-nowrap shrink-0"
              style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500, boxShadow: `0 0 16px ${ACCENT}66` } : { color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              {link.icon ? (
                <img src={link.icon} alt="" className="w-4 h-4 shrink-0" style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(1) opacity(0.6)' }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  {link.svgIcon}
                </svg>
              )}
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {user ? (
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/profile" className="hover:opacity-80 transition-opacity">
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-white flex items-center justify-center p-1">
                <img src={yealeadLogo} alt="Profil" className="w-full h-full object-contain" />
              </div>
            )}
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:px-3 sm:py-1.5 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-60 gap-1.5 shrink-0"
            aria-label="Déconnexion"
          >
            {loggingOut ? (
              <Spinner size={14} color="currentColor" />
            ) : (
              <img src={yealeadLogo} alt="" className="w-4 h-4 object-contain" style={{ filter: 'brightness(0) invert(0.7)' }} />
            )}
            <span className="text-xs hidden sm:inline">{loggingOut ? '' : 'Déconnexion'}</span>
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-5 py-2 rounded-full text-white transition-all whitespace-nowrap shrink-0 hover:brightness-110 active:scale-95"
          style={{ backgroundColor: ACCENT, boxShadow: `0 2px 12px ${ACCENT}50` }}
        >
          <img src={yealeadLogo} alt="" className="w-4 h-4 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          Connexion
        </Link>
      )}
    </nav>
  );
}

export default Navbar;