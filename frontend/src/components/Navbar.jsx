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
    <nav className="bg-black border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <img src={yealeadLogo} alt="Yealead" className="w-9 h-9 object-contain" />
        <span className="text-white font-semibold text-lg">Yealead</span>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-full p-1">
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200"
              style={active ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 500, boxShadow: `0 0 16px ${ACCENT}66` } : { color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              <img src={link.icon} alt="" className="w-4 h-4" style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(1) opacity(0.6)' }} />
              {link.label}
            </Link>
          );
        })}
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: ACCENT }}>
            {user.nom?.charAt(0).toUpperCase()}
          </div>
          <button onClick={handleLogout} className="text-xs text-white/40 hover:text-white transition-colors">
            Déconnexion
          </button>
        </div>
      ) : (
        <Link to="/login" className="text-sm px-4 py-2 rounded-full border border-white/20 text-white hover:bg-white hover:text-black transition-all">
          Connexion
        </Link>
      )}
    </nav>
  );
}

export default Navbar;