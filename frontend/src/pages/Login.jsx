import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';
import Spinner from '../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError('Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 text-white/50 hover:text-white text-sm flex items-center gap-1 transition-colors"
      >
        ← Retour
      </button>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 max-w-sm w-full animate-[popIn_0.3s_ease]">
        <img src={yealeadLogo} alt="Yealead" className="w-10 h-10 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-black mb-1 text-center">Connexion</h1>
        <p className="text-black/50 text-sm mb-6 text-center">Accède à ton espace SalesTrack</p>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <input type="email" name="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg border border-black/15 mb-3 outline-none focus:border-orange-500 transition-colors" />
        <input type="password" name="password" autoComplete="current-password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg border border-black/15 mb-4 outline-none focus:border-orange-500 transition-colors" />
        <button
          type="submit"
          disabled={loading}
          className="w-full text-white p-3 rounded-lg font-medium hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          style={{ backgroundColor: ACCENT }}
        >
          {loading && <Spinner size={16} color="#fff" />}
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="text-center text-sm text-black/50 mt-4">
          Pas de compte ? <Link to="/signup" style={{ color: ACCENT }} className="font-medium">S'inscrire</Link>
        </p>
      </form>
      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default Login;