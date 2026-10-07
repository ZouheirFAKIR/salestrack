import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import yealeadLogo from '../assets/yealead.png';
import loginBg from '../assets/login-bg.png';
import Spinner from '../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ---------- Icônes ----------
function Icon({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}
const MailIcon = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>;
const LockIcon = <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>;
const EyeIcon = <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>;
const EyeOffIcon = <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M1 1l22 22" /></>;
const BoltIcon = <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />;
const ShieldIcon = <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>;
const TrendIcon = <><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></>;
const ArrowIcon = <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>;

const FEATURES = [
  { icon: BoltIcon, title: 'Plus de performance', text: 'Suivez vos résultats en temps réel' },
  { icon: ShieldIcon, title: 'Plus de contrôle', text: 'Gérez vos opportunités facilement' },
  { icon: TrendIcon, title: 'Plus de croissance', text: 'Prenez les bonnes décisions' },
];

function readRememberedEmail() {
  try { return localStorage.getItem('rememberEmail') || ''; } catch { return ''; }
}

function Login() {
  const remembered = readRememberedEmail();
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
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
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      // "Se souvenir de moi" = on garde seulement l'email, jamais le mot de passe
      try {
        if (remember) localStorage.setItem('rememberEmail', email.trim());
        else localStorage.removeItem('rememberEmail');
      } catch { /* stockage indisponible */ }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError('Erreur de connexion');
      setLoading(false);
    }
  };

  const inputWrap = 'flex items-center gap-3 px-4 rounded-xl border border-white/15 bg-white/[0.04] focus-within:border-[#f86635] focus-within:bg-white/[0.07] transition-colors';

  return (
    <div className="relative min-h-[100dvh] lg:h-[100dvh] w-full overflow-hidden bg-[#0d121a] text-white">
      {/* ===== Image de fond ===== */}
      <img
        src={loginBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-left pointer-events-none select-none"
      />
      {/* Mobile : on assombrit tout pour lire le formulaire */}
      <div className="absolute inset-0 bg-[#0d121a]/85 lg:hidden" />
      {/* Ordinateur : léger dégradé tout en bas pour lire les atouts */}
      <div
        className="hidden lg:block absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(13,18,26,0.85) 0%, rgba(13,18,26,0.4) 14%, transparent 28%)' }}
      />

      <div className="relative z-10 h-full min-h-[100dvh] lg:min-h-0 flex flex-col lg:flex-row">
        {/* ===== Atouts (gauche, ordinateur seulement) : une fine barre en bas ===== */}
        <div className="hidden lg:flex flex-1 flex-col justify-end pl-12 pr-6 pb-8">
          <div className="flex items-start gap-7">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`flex items-start gap-2.5 ${i > 0 ? 'pl-7 border-l border-white/20' : ''}`}>
                <span className="mt-0.5" style={{ color: ACCENT }}><Icon d={f.icon} size={20} /></span>
                <div>
                  <p className="text-[13px] font-semibold whitespace-nowrap drop-shadow">{f.title}</p>
                  <p className="text-[11px] text-white/70 mt-0.5 whitespace-nowrap drop-shadow">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Formulaire (droite) ===== */}
        <div className="flex-1 lg:flex-none lg:w-[500px] xl:w-[540px] flex items-center justify-center px-4 py-8 lg:py-6 lg:pr-12 xl:pr-16">
          <div className="w-full max-w-[400px] rounded-3xl border border-white/10 bg-[#121821]/85 backdrop-blur-xl shadow-2xl px-7 py-8 sm:px-9 animate-[popIn_0.35s_ease]">
            {/* Logo : seulement sur mobile (sur ordinateur, il est déjà sur l'image) */}
            <img src={yealeadLogo} alt="SalesTrack" className="w-12 h-12 mx-auto mb-4 lg:hidden" />

            <h1 className="text-2xl sm:text-3xl font-bold text-center">Connexion</h1>
            <p className="text-white/55 text-sm text-center mt-1.5 mb-7">Accédez à votre espace SalesTrack</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {error && (
                <p className="text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-300 border border-red-500/25">{error}</p>
              )}

              <div className={inputWrap}>
                <span className="text-white/45"><Icon d={MailIcon} /></span>
                <input
                  type="email" name="email" autoComplete="email" required
                  placeholder="Email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="login-input flex-1 min-w-0 bg-transparent py-3 outline-none text-white placeholder:text-white/40"
                />
              </div>

              <div className={inputWrap}>
                <span className="text-white/45"><Icon d={LockIcon} /></span>
                <input
                  type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required
                  placeholder="Mot de passe"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="login-input flex-1 min-w-0 bg-transparent py-3 outline-none text-white placeholder:text-white/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-white/45 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Icon d={showPassword ? EyeOffIcon : EyeIcon} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 text-[13px]">
                <label className="flex items-center gap-2 cursor-pointer select-none text-white/75">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#f86635]"
                  />
                  Se souvenir de moi
                </label>
                <button type="button" onClick={() => setShowForgot((v) => !v)} className="font-medium hover:underline" style={{ color: ACCENT }}>
                  Mot de passe oublié ?
                </button>
              </div>

              {showForgot && (
                <p className="text-xs rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white/70">
                  Contactez votre administrateur : il peut vous définir un nouveau mot de passe.
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full text-white py-3 rounded-xl font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, #ff7a3d)`, boxShadow: `0 10px 30px ${ACCENT}45` }}
              >
                {loading ? <Spinner size={16} color="#fff" /> : null}
                {loading ? 'Connexion...' : 'Se connecter'}
                {!loading && <Icon d={ArrowIcon} size={18} />}
              </button>
            </form>

            <p className="text-xs text-white/50 text-center mt-6">
              Pas de compte ? Contactez votre administrateur.
            </p>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/35 mt-4">
              <Icon d={ShieldIcon} size={13} /> Connexion sécurisée
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
        /* Empêche le fond blanc de l'auto-remplissage du navigateur */
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          caret-color: #ffffff;
          transition: background-color 600000s 0s, color 600000s 0s;
        }
      `}</style>
    </div>
  );
}

export default Login;