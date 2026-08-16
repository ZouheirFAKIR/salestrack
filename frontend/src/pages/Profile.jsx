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
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      const payload = { nom, email, phone, role, photo_url: photoUrl };
      if (password) payload.password = password;

      const res = await apiFetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Échec de la mise à jour');
        setSaving(false);
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...data }));
      setPassword('');
      setMessage('Profil mis à jour avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Erreur réseau, réessaie');
    }
    setSaving(false);
  };

  if (pageLoading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-lg font-semibold text-white mb-1">Mon profil</h1>
        <p className="text-white/40 text-xs mb-6">Gère tes informations personnelles</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {photoLoading ? (
                <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center">
                  <Spinner size={22} color={ACCENT} />
                </div>
              ) : photoUrl ? (
                <img src={photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-white/10" />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
                >
                  {nom.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white flex items-center justify-center cursor-pointer hover:brightness-95 transition-all shadow-lg">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
          {message && <p className="text-xs mb-3 text-center" style={{ color: ACCENT }}>{message}</p>}

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Nom complet</label>
              <input
                type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Téléphone</label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6XX XXX XXX"
                className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/25"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Rôle dans l'entreprise</label>
              <input
                type="text" value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Commercial, Manager..."
                className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/25"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Nouveau mot de passe (optionnel)</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Laisser vide pour ne pas changer"
                className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/25"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || photoLoading}
            className="w-full mt-5 text-white p-2.5 rounded-lg font-medium transition-all active:scale-95 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT }}
          >
            {saving && <Spinner size={15} color="#fff" />}
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;