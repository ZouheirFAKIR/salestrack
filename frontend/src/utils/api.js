const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const cache = new Map();
const CACHE_TTL = 30000; // 30 secondes

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Si on a déjà cette donnée en mémoire depuis moins de 30s, on la renvoie
  // directement, sans repasser par le serveur.
  if (isGet) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { ok: true, status: 200, json: async () => cached.data };
    }
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return res;
  }

  if (isGet && res.ok) {
    // On sauvegarde la réponse pour la prochaine fois.
    res.clone().json().then((data) => {
      cache.set(url, { data, timestamp: Date.now() });
    }).catch(() => {});
  } else if (!isGet && res.ok) {
    // Dès qu'on crée/modifie/supprime quelque chose, tout le cache est vidé
    // pour être sûr de ne jamais réafficher une donnée obsolète.
    cache.clear();
  }

  return res;
}

export { API_URL };