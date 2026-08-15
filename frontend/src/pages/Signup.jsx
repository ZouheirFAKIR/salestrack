import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';

const ACCENT = '#f86635';

function Signup() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('${API_URL}/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      navigate('/login');
    } catch (err) {
      setError("Erreur lors de l'inscription");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 max-w-sm w-full animate-[popIn_0.3s_ease]">
        <img src={yealeadLogo} alt="Yealead" className="w-10 h-10 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-black mb-1 text-center">Créer un compte</h1>
        <p className="text-black/50 text-sm mb-6 text-center">Rejoins SalesTrack</p>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <input type="text" placeholder="Nom complet" value={nom} onChange={(e) => setNom(e.target.value)}
          className="w-full p-3 rounded-lg border border-black/15 mb-3 outline-none focus:border-orange-500 transition-colors" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg border border-black/15 mb-3 outline-none focus:border-orange-500 transition-colors" />
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg border border-black/15 mb-4 outline-none focus:border-orange-500 transition-colors" />
        <button type="submit" className="w-full text-white p-3 rounded-lg font-medium hover:brightness-110 active:scale-95 transition-all" style={{ backgroundColor: ACCENT }}>
          S'inscrire
        </button>
        <p className="text-center text-sm text-black/50 mt-4">
          Déjà un compte ? <Link to="/login" style={{ color: ACCENT }} className="font-medium">Se connecter</Link>
        </p>
      </form>
      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

export default Signup;