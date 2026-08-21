import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';
import addIcon from '../assets/add.png';
import dashboardIcon from '../assets/dashboard.png';
import feedIcon from '../assets/feed.png';
import Spinner from './Spinner';
import CoinIcon from './CoinIcon';
import { apiFetch, API_URL } from '../utils/api';

const ACCENT = '#f86635';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const [loggingOut, setLoggingOut] = useState(false);
  const [points, setPoints] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/api/rewards/balance`)
      .then((r) => r.json())
      .then((data) => setPoints(data.balance))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
    {
      path: '/rewards', label: 'Récompenses', svgIcon: (
        <>
          <path d="M20 12v10H4V12" />
          <path d="M2 7h20v5H2z" />
          <path d="M12 22V7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
        </>
      ),
    },
  ];

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }, 300);
  };

  const renderIcon = (link, active) => (
    link.icon ? (
      <img src={link.icon} alt="" className="w-4 h-4 shrink-0" style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(1) opacity(0.6)' }} />
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        {link.svgIcon}
      </svg>
    )
  );

  return (
    <nav className="bg-black border-b border-white/10 sticky top-0 z-30">
      <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Link to="/nouvelle-activite" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <img src={yealeadLogo} alt="Yealead" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
          <span className="text-white font-semibold text-base sm:text-lg hidden sm:inline">SalesTrack</span>
        </Link>

        {/* Liens en pilules, uniquement sur écran moyen/large */}
        <div className="hidden md:flex gap-1 bg-white/5 rounded-full p-1 overflow-x-auto max-w-full">
          {links.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200 whitespace-nowrap shrink-0"
                style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500, boxShadow: `0 0 16px ${ACCENT}66` } : { color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                {renderIcon(link, active)}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

          {/* Bouton hamburger, uniquement sur petit écran */}
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
          {links.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500 } : { color: 'rgba(255,255,255,0.7)' }}
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