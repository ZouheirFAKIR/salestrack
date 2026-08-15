import { Link, useLocation, useNavigate } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';
import addIcon from '../assets/add.png';
import dashboardIcon from '../assets/dashboard.png';
import feedIcon from '../assets/feed.png';

const ACCENT = '#f86635';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const links = [
    { path: '/nouvelle-activite', label: 'Nouvelle activité', icon: addIcon },
    { path: '/', label: 'Dashboard', icon: dashboardIcon },
    { path: '/feed', label: 'Feed', icon: feedIcon },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
              <img src={link.icon} alt="" className="w-4 h-4" style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(1) opacity(0.6)' }} />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {user ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ backgroundColor: ACCENT }}>
            {user.nom?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:px-3 sm:py-1.5 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all"
            aria-label="Déconnexion"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="text-xs hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-5 py-2 rounded-full text-white transition-all whitespace-nowrap shrink-0 hover:brightness-110 active:scale-95"
          style={{ backgroundColor: ACCENT, boxShadow: `0 2px 12px ${ACCENT}50` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Connexion
        </Link>
      )}
    </nav>
  );
}

export default Navbar;