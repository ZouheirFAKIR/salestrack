import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import Badge from '../components/Badge';
import CoinIcon from '../components/CoinIcon';
import DownloadReportButton from '../components/DownloadReportButton';
import { badgeDefinitions } from '../data/badgeDefinitions';

const ACCENT = '#f86635';
const ACCENT_DEEP = '#d6491f';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', commercial: 'Commercial' };

const ADMIN_LINKS = [
  { to: '/admin/courses', label: 'Formations', desc: 'Cours et quiz', icon: '🎓' },
  { to: '/admin/rewards', label: 'Récompenses', desc: 'Catalogue de points', icon: '🎁' },
  { to: '/admin/challenge', label: 'Défis', desc: 'Lancer un sprint', icon: '🏆' },
  { to: '/admin/odoo', label: 'Liaison Odoo', desc: 'Lier les vendeurs', icon: '🔗' },
];

const cardStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

function StatTile({ icon, value, label }) {
  return (
    <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const reset = () => {
    setOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) { setError('Tous les champs sont requis'); return; }
    if (newPassword !== confirmPassword) { setError('Les nouveaux mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 6) { setError('Le nouveau mot de passe doit faire au moins 6 caractères'); return; }

    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/profile/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Échec du changement de mot de passe');
      } else {
        setMessage('Mot de passe mis à jour');
        setTimeout(() => { setMessage(''); reset(); }, 2000);
      }
    } catch {
      setError('Erreur réseau, réessaie');
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl p-5" style={cardStyle}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${ACCENT}15` }}>🔒</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sécurité</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mot de passe du compte</p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs px-3.5 py-2 rounded-lg font-medium transition-colors hover:bg-[var(--surface-strong)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Modifier
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 animate-[fadeIn_0.2s_ease]">
          {error && <p className="text-red-500 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>{error}</p>}
          {message && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>{message}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mot de passe actuel" className="w-full p-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau (6 car. min)" className="w-full p-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer" className="w-full p-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={reset} className="text-xs px-4 py-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="text-xs px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60 flex items-center gap-1.5"
              style={{ backgroundColor: ACCENT }}
            >
              {saving && <Spinner size={12} color="#fff" />}
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [pageLoading, setPageLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [isAdminAccess, setIsAdminAccess] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [badgeStats, setBadgeStats] = useState(null);
  const [points, setPoints] = useState(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    apiFetch(`${API_URL}/api/profile`)
      .then((r) => r.json())
      .then((data) => {
        setNom(data.nom || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setRole(data.role || '');
        setIsAdminAccess(!!data.is_admin_access);
        setPhotoUrl(data.photo_url || '');
        setPageLoading(false);
      })
      .catch(() => setPageLoading(false));

    apiFetch(`${API_URL}/api/activities/badge-stats`).then((r) => r.json()).then(setBadgeStats).catch(() => {});
    apiFetch(`${API_URL}/api/rewards/balance`).then((r) => r.json()).then((d) => setPoints(d.balance)).catch(() => {});
  }, [token]);

  const getBadgeValue = (category) => {
    if (!badgeStats) return 0;
    if (category === 'total') return badgeStats.total;
    if (category === 'streak') return badgeStats.streak;
    if (category === 'target') return badgeStats.targetDays;
    return badgeStats.typeCounts[category] || 0;
  };
  const earnedBadges = badgeStats ? badgeDefinitions.filter((b) => getBadgeValue(b.category) >= b.threshold) : [];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image trop lourde (max 5 Mo)'); return; }
    setError('');
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
      setPhotoChanged(true);
      setPhotoLoading(false);
    };
    reader.onerror = () => setPhotoLoading(false);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await apiFetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ nom, email, phone, photo_url: photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Échec de la mise à jour');
      } else {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...data }));
        setPhotoChanged(false);
        setMessage('Profil mis à jour avec succès');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {
      setError('Erreur réseau, réessaie');
    }
    setSaving(false);
  };

  if (pageLoading) return <PageLoader />;

  const isAdmin = role === 'admin' || isAdminAccess;
  const roleLabel = ROLE_LABELS[role] || role || 'Commercial';

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-16 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}18, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}12, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle, ${ACCENT}22 1px, transparent 1px)`, backgroundSize: '26px 26px' }}
      />

      <div className="max-w-[1600px] mx-auto flex flex-col gap-5 relative z-10 lg:px-4">

        {/* Barre du haut : titre + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Mon profil</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Tes informations, tes rapports et tes accès</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: '#1a1a1a', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                Espace admin
              </Link>
            )}
            <DownloadReportButton self commercialNom={nom} />
          </div>
        </div>

        {isAdmin && (
          <div
            className="rounded-2xl p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a1a1a, #2a1a14)', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}
          >
            <div
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${ACCENT}40, transparent 70%)` }}
            />

            <div className="flex flex-col justify-between gap-4 relative">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: `${ACCENT}30`, color: '#ffb37a' }}>
                  Admin
                </span>
                <p className="text-lg font-semibold mt-3" style={{ color: '#fff' }}>Espace administrateur</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Gère l'équipe, les objectifs et les contenus</p>
              </div>
              <Link
                to="/admin"
                className="text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110"
                style={{ backgroundColor: ACCENT, color: '#fff', boxShadow: `0 4px 20px ${ACCENT}55` }}
              >
                Ouvrir le dashboard admin →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
              {ADMIN_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-xl p-4 flex flex-col gap-2 transition-all hover:-translate-y-1"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>{l.icon}</span>
                  <p className="text-sm font-semibold" style={{ color: '#fff' }}>{l.label}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{l.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Carte identité */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div
            className="h-28 sm:h-32 relative"
            style={{ background: `linear-gradient(120deg, ${ACCENT_DEEP}, ${ACCENT} 55%, #ffb37a)` }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }}
            />
          </div>

          <div className="px-5 sm:px-6 pb-5 pt-3 flex flex-col lg:flex-row lg:items-center gap-5 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 flex-1 min-w-0">
              <div className="relative shrink-0 -mt-16">
                {photoLoading ? (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-strong)', border: '4px solid var(--surface)' }}>
                    <Spinner size={22} color={ACCENT} />
                  </div>
                ) : photoUrl ? (
                  <img src={photoUrl} alt="" className="w-24 h-24 rounded-full object-cover" style={{ border: '4px solid var(--surface)' }} />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-semibold"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, border: '4px solid var(--surface)' }}
                  >
                    {nom.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <label
                  className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
                  style={{ backgroundColor: ACCENT, border: '2px solid var(--surface)' }}
                  title="Changer la photo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                  </svg>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>

              <div className="min-w-0 text-center sm:text-left pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="text-lg sm:text-xl font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{nom || 'Sans nom'}</p>
                  <span className="text-xs px-2.5 py-1 rounded-full w-fit mx-auto sm:mx-0 font-medium" style={{ backgroundColor: `${ACCENT}1a`, color: ACCENT }}>
                    {roleLabel}
                  </span>
                </div>
                <p className="text-sm mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>{email}{phone ? ` · ${phone}` : ''}</p>
                {photoChanged && (
                  <p className="text-[11px] mt-1" style={{ color: ACCENT }}>Nouvelle photo — clique sur « Enregistrer » pour l'appliquer</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
              <StatTile value={earnedBadges.length} label="Badges" icon={<span className="text-base">🏅</span>} />
              <StatTile value={badgeStats?.streak ?? 0} label="Série" icon={<span className="text-base">🔥</span>} />
              <StatTile value={points ?? 0} label="Points" icon={<CoinIcon size={16} />} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* Colonne gauche */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Informations personnelles</p>
              {error && <p className="text-red-500 text-xs mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>{error}</p>}
              {message && <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>{message}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom complet">
                  <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className="w-full p-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
                </Field>
                <Field label="Téléphone">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6XX XXX XXX" className="w-full p-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
                </Field>
                <Field label="Rôle">
                  <div className="w-full p-2.5 rounded-lg text-sm flex items-center justify-between" style={{ ...inputStyle, color: 'var(--text-muted)' }}>
                    {roleLabel}
                    <span className="text-[10px]">🔒 géré par l'admin</span>
                  </div>
                </Field>
              </div>

              <div className="flex justify-end mt-5">
                <button
                  onClick={handleSave}
                  disabled={saving || photoLoading}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
                  style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}30`, color: '#fff' }}
                >
                  {saving && <Spinner size={14} color="#fff" />}
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>

            <PasswordCard />
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mes badges</p>
                <Link to="/badges" className="text-xs font-medium" style={{ color: ACCENT }}>Voir tout →</Link>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                {earnedBadges.length} / {badgeDefinitions.length} débloqués
              </p>
              {earnedBadges.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun badge débloqué pour l'instant</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {earnedBadges.slice(-8).reverse().map((b) => (
                    <Badge key={b.id} category={b.category} unlocked={true} value={b.threshold} label={null} size={50} />
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default Profile;