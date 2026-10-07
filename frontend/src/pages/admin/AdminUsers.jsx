import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager' };

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function CreateUserForm({ onCreated }) {
  const [form, setForm] = useState({ nom: '', email: '', password: '', role: 'commercial' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/users`, { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return; }
      setSuccess(`Compte créé pour ${data.nom}. Donne-lui son email et son mot de passe.`);
      setForm({ nom: '', email: '', password: '', role: 'commercial' });
      onCreated();
    } catch {
      setError('Erreur de connexion au serveur');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Créer un compte</p>

      {error && <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#ef444418', color: '#ef4444' }}>{error}</p>}
      {success && <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#22c55e18', color: '#22c55e' }}>{success}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required placeholder="Nom complet" value={form.nom} onChange={update('nom')} className="text-sm px-3 py-2.5 rounded-lg outline-none" style={inputStyle} />
        <input required type="email" placeholder="Email" value={form.email} onChange={update('email')} className="text-sm px-3 py-2.5 rounded-lg outline-none" style={inputStyle} />
        <input required type="text" placeholder="Mot de passe (8 caractères min.)" value={form.password} onChange={update('password')} autoComplete="new-password" className="text-sm px-3 py-2.5 rounded-lg outline-none" style={inputStyle} />
        <select value={form.role} onChange={update('role')} className="text-sm px-3 py-2.5 rounded-lg outline-none" style={inputStyle}>
          <option value="commercial">Commercial</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="self-start text-sm px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-60"
        style={{ backgroundColor: ACCENT, color: '#fff' }}
      >
        {saving && <Spinner size={14} color="#fff" />}
        Créer le compte
      </button>
    </form>
  );
}

function UserRow({ u, onChanged }) {
  const [busy, setBusy] = useState(false);
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const isMe = me?.id === u.id;

  const toggleActive = async () => {
    if (!window.confirm(u.inactive ? `Réactiver le compte de ${u.nom} ?` : `Désactiver le compte de ${u.nom} ? Il ne pourra plus se connecter.`)) return;
    setBusy(true);
    await apiFetch(`${API_URL}/api/admin/users/${u.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ inactive: !u.inactive }),
    }).catch(() => {});
    setBusy(false);
    onChanged();
  };

  const resetPassword = async () => {
    const pwd = window.prompt(`Nouveau mot de passe pour ${u.nom} (8 caractères min.) :`);
    if (!pwd) return;
    if (pwd.length < 8) { alert('Le mot de passe doit contenir au moins 8 caractères'); return; }
    setBusy(true);
    const res = await apiFetch(`${API_URL}/api/admin/users/${u.id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password: pwd }),
    }).catch(() => null);
    setBusy(false);
    alert(res && res.ok ? 'Mot de passe changé' : 'Erreur lors du changement');
  };

  return (
    <div className="rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: u.inactive ? 0.6 : 1 }}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: u.inactive ? '#6b7280' : ACCENT, color: '#fff' }}>
          {u.nom?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {u.nom}
            {ROLE_LABELS[u.role] && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ACCENT}1f`, color: ACCENT }}>{ROLE_LABELS[u.role]}</span>
            )}
            {u.inactive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#6b7280', color: '#fff' }}>Inactif</span>
            )}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {busy && <Spinner size={14} color={ACCENT} />}
        <button onClick={resetPassword} className="text-xs px-3 py-2 rounded-lg" style={inputStyle}>
          Mot de passe
        </button>
        {!isMe && u.role !== 'admin' && (
          <button
            onClick={toggleActive}
            className="text-xs px-3 py-2 rounded-lg font-medium"
            style={u.inactive ? { backgroundColor: '#22c55e', color: '#fff' } : { backgroundColor: '#ef444418', color: '#ef4444' }}
          >
            {u.inactive ? 'Réactiver' : 'Désactiver'}
          </button>
        )}
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiFetch(`${API_URL}/api/admin/users`, { skipCache: true })
      .then((r) => r.json())
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader />;

  const active = users.filter((u) => !u.inactive);
  const inactive = users.filter((u) => u.inactive);

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Utilisateurs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Seul l'administrateur peut créer des comptes. Un compte désactivé ne peut plus se connecter.
          </p>
        </div>

        <CreateUserForm onCreated={load} />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Actifs ({active.length})</p>
          {active.map((u) => <UserRow key={u.id} u={u} onChanged={load} />)}
        </div>

        {inactive.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Désactivés ({inactive.length})</p>
            {inactive.map((u) => <UserRow key={u.id} u={u} onChanged={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;