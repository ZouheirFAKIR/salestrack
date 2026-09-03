import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';
import Badge from '../components/Badge';
import { badgeDefinitions } from '../data/badgeDefinitions';

const ACCENT = '#f86635';
const ACCENT_DEEP = '#d6491f';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [pageLoading, setPageLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [badgeStats, setBadgeStats] = useState(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    apiFetch(`${API_URL}/api/profile`)
      .then((r) => r.json())
      .then((data) => {
        setNom(data.nom || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setRole(data.role || '');
        setPhotoUrl(data.photo_url || '');
        setPageLoading(false);
      })
      .catch(() => setPageLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/api/activities/badge-stats`).then((r) => r.json()).then(setBadgeStats);
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
    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop lourde (max 5 Mo)');
      return;
    }
    setError('');
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
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
        body: JSON.stringify({ nom, email, phone, role, photo_url: photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Échec de la mise à jour');
        setSaving(false);
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...data }));
      setMessage('Profil mis à jour avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Erreur réseau, réessaie');
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tous les champs sont requis');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit faire au moins 6 caractères');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/profile/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Échec du changement de mot de passe');
        setPasswordSaving(false);
        return;
      }

      setPasswordMessage('Mot de passe mis à jour avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setPasswordMessage(''); setShowPasswordForm(false); }, 2000);
    } catch (err) {
      setPasswordError('Erreur réseau, réessaie');
    }
    setPasswordSaving(false);
  };

  if (pageLoading) return <PageLoader />;

  const inputStyle = {
    backgroundColor: 'var(--surface-strong)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  const secondaryCols = role === 'admin' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3';

  return (
    <div className="min-h-[calc(100vh-64px)] pb-16" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Bandeau de couverture */}
      <div
        className="relative h-40 sm:h-48 overflow-hidden"
        style={{ background: `linear-gradient(120deg, ${ACCENT_DEEP}, ${ACCENT} 55%, #ffb37a)` }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.14) 1.5px, transparent 1.5px)`, backgroundSize: '22px 22px' }}
        />
        <svg className="absolute -bottom-6 right-8 opacity-25" width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" stroke="#fff" strokeWidth="2" fill="none" />
          <circle cx="70" cy="70" r="36" stroke="#fff" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-5 -mt-14 sm:-mt-16 relative z-10">
        {/* Carte identité */}
        <div
          className="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        >
          <div className="relative shrink-0 -mt-14 sm:-mt-2">
            {photoLoading ? (
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-strong)', border: '4px solid var(--surface)' }}>
                <Spinner size={24} color={ACCENT} />
              </div>
            ) : photoUrl ? (
              <img src={photoUrl} alt="" className="w-28 h-28 rounded-full object-cover" style={{ border: '4px solid var(--surface)' }} />
            ) : (
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-semibold"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, border: '4px solid var(--surface)' }}
              >
                {nom.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <label
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:brightness-95 transition-all shadow-lg"
              style={{ backgroundColor: '#fff', border: '2px solid var(--surface)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <p className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{nom || 'Sans nom'}</p>
              {role && (
                <span className="text-xs px-2.5 py-1 rounded-full w-fit mx-auto sm:mx-0" style={{ backgroundColor: `${ACCENT}1a`, color: ACCENT }}>
                  {role}
                </span>
              )}
            </div>
            <p className="text-sm mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>{email}{phone ? ` · ${phone}` : ''}</p>
          </div>

          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{earnedBadges.length}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Badges</p>
            </div>
            <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="text-center">
              <p className="text-xl font-semibold" style={{ color: ACCENT }}>{role === 'admin' ? 'Admin' : 'Com.'}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Statut</p>
            </div>
          </div>
        </div>

        {/* Formulaire principal, pleine largeur */}
        <div className="rounded-2xl p-4 sm:p-5 mt-3 sm:mt-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Informations personnelles</p>
          {error && <p className="text-red-500 text-xs mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>{error}</p>}
          {message && <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>{message}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nom complet</label>
              <input
                type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Téléphone</label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6XX XXX XXX"
                className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 transition-colors"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Rôle</label>
              <input
                type="text" value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Commercial"
                className="w-full p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 transition-colors"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || photoLoading}
            className="mt-4 px-6 py-2.5 rounded-lg font-medium transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}30`, color: '#fff' }}
          >
            {saving && <Spinner size={15} color="#fff" />}
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>

        {/* Rangée de cards secondaires — hauteur égale naturelle (grid stretch) */}
        <div className={`grid grid-cols-1 ${secondaryCols} gap-3 sm:gap-4 mt-3 sm:mt-4 items-stretch`}>

          <div
            className="rounded-2xl p-4 flex flex-col"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sécurité</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mot de passe et accès au compte</p>

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full text-xs px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)] mt-3"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Changer le mot de passe
              </button>
            ) : (
              <div className="mt-3 flex-1 flex flex-col animate-[fadeIn_0.2s_ease]">
                {passwordError && <p className="text-red-500 text-[11px] mb-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>{passwordError}</p>}
                {passwordMessage && <p className="text-[11px] mb-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>{passwordMessage}</p>}
                <div className="flex flex-col gap-2 flex-1">
                  <input
                    type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Mot de passe actuel"
                    className="w-full p-2 rounded-lg text-xs outline-none focus:border-orange-500/60 transition-colors"
                    style={inputStyle}
                  />
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nouveau (6 car. min)"
                    className="w-full p-2 rounded-lg text-xs outline-none focus:border-orange-500/60 transition-colors"
                    style={inputStyle}
                  />
                  <input
                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer"
                    className="w-full p-2 rounded-lg text-xs outline-none focus:border-orange-500/60 transition-colors"
                    style={inputStyle}
                  />
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}
                    className="flex-1 text-[11px] px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordSaving}
                    className="flex-1 text-[11px] px-2 py-1.5 rounded-lg text-white font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {passwordSaving && <Spinner size={11} color="#fff" />}
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className="rounded-2xl p-4 flex flex-col"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mes badges</p>
              <Link to="/badges" className="text-xs font-medium" style={{ color: ACCENT }}>Voir tout →</Link>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{earnedBadges.length} débloqué{earnedBadges.length > 1 ? 's' : ''}</p>

            {earnedBadges.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun badge débloqué pour l'instant</p>
            ) : (
              <div className="flex gap-3">
                {earnedBadges.slice(0, 3).map((b) => (
                  <Badge key={b.id} category={b.category} unlocked={true} label={null} size={52} />
                ))}
              </div>
            )}
          </div>

          {role === 'admin' && (
            <div
              className="rounded-2xl p-4 flex flex-col sm:col-span-2 xl:col-span-2"
              style={{ backgroundColor: 'var(--surface)', border: `1px solid ${ACCENT}33`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Espace administrateur</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Gère les commerciaux, les quotas et les formations</p>

              <div className="flex gap-2 flex-wrap">
                <Link to="/admin" className="flex-1 text-center text-xs px-4 py-2.5 rounded-lg font-medium" style={{ backgroundColor: ACCENT, color: '#fff' }}>
                  Dashboard admin
                </Link>
                <Link
                  to="/admin/courses"
                  className="flex-1 text-center text-xs px-4 py-2.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Gérer les formations
                </Link>
              </div>
            </div>
          )}

        </div>

      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default Profile;