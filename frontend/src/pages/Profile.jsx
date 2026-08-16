import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Spinner from '../components/Spinner';
import PageLoader from '../components/PageLoader';

const ACCENT = '#f86635';
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

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">Mon profil</h1>
          <p className="text-white/40 text-xs">Gère tes informations personnelles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center sticky top-20">
              <div className="relative mb-4">
                {photoLoading ? (
                  <div className="w-24 h-24 rounded-full bg-black border border-white/10 flex items-center justify-center">
                    <Spinner size={24} color={ACCENT} />
                  </div>
                ) : photoUrl ? (
                  <img src={photoUrl} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-white/10" />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-semibold"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
                  >
                    {nom.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white flex items-center justify-center cursor-pointer hover:brightness-95 transition-all shadow-lg border-2 border-black">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>

              <p className="text-white font-semibold">{nom || 'Sans nom'}</p>
              {role && (
                <span className="text-xs px-2.5 py-1 rounded-full mt-1.5" style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}>
                  {role}
                </span>
              )}
              <p className="text-white/35 text-xs mt-3 break-all">{email}</p>
              {phone && <p className="text-white/35 text-xs mt-1">{phone}</p>}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-5">

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {error && <p className="text-red-400 text-xs mb-4 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              {message && <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>{message}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Nom complet</label>
                  <input
                    type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Email</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Téléphone</label>
                  <input
                    type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+212 6XX XXX XXX"
                    className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/25"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Rôle dans l'entreprise</label>
                  <input
                    type="text" value={role} onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Commercial, Manager..."
                    className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/25"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || photoLoading}
                className="w-full mt-6 text-white p-2.5 rounded-lg font-medium transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}30` }}
              >
                {saving && <Spinner size={15} color="#fff" />}
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">Sécurité</p>
                {!showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors"
                  >
                    Changer le mot de passe
                  </button>
                )}
              </div>

              {!showPasswordForm && (
                <p className="text-xs text-white/35">Dernière modification protégée par ton mot de passe actuel</p>
              )}

              {showPasswordForm && (
                <div className="mt-4 animate-[fadeIn_0.2s_ease]">
                  {passwordError && <p className="text-red-400 text-xs mb-3 bg-red-500/10 px-3 py-2 rounded-lg">{passwordError}</p>}
                  {passwordMessage && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}>{passwordMessage}</p>}

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1.5 block">Mot de passe actuel</label>
                      <input
                        type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1.5 block">Nouveau mot de passe</label>
                      <input
                        type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 6 caractères"
                        className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/25"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1.5 block">Confirmer le nouveau mot de passe</label>
                      <input
                        type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}
                      className="flex-1 text-xs px-3 py-2.5 rounded-lg text-white/60 border border-white/10 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      disabled={passwordSaving}
                      className="flex-1 text-xs px-3 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {passwordSaving && <Spinner size={13} color="#fff" />}
                      {passwordSaving ? 'Modification...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}

              <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Profile;