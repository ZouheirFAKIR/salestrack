// Connexion à l'API Yeastar P-Series Cloud (journal des appels)
const BASE = `${process.env.YEASTAR_URL}/openapi/v1.0`;
const HEADERS = { 'Content-Type': 'application/json', 'User-Agent': 'OpenAPI' };

let cachedToken = null;
let tokenExpiresAt = 0;

// Récupère un token (gardé en mémoire tant qu'il est valide)
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${BASE}/get_token`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      username: process.env.YEASTAR_CLIENT_ID,
      password: process.env.YEASTAR_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`Yeastar token refusé : ${data.errmsg}`);

  cachedToken = data.access_token;
  // On renouvelle 1 minute avant l'expiration
  tokenExpiresAt = Date.now() + (data.access_token_expire_time - 60) * 1000;
  return cachedToken;
}

// Liste des appels entre deux dates (objets Date)
async function getCalls(from, to) {
  const token = await getToken();
  const all = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      access_token: token,
      page: String(page),
      page_size: '1000',
      start_time: String(Math.floor(from.getTime() / 1000)),
      end_time: String(Math.floor(to.getTime() / 1000)),
    });
    const res = await fetch(`${BASE}/cdr/search?${params}`, { headers: HEADERS });
    const data = await res.json();
    if (data.errcode !== 0) throw new Error(`Yeastar CDR erreur : ${data.errmsg}`);

    const rows = data.data || [];
    all.push(...rows);
    if (rows.length < 1000) break;
    page += 1;
  }

  // On garde seulement ce qui sert à SalesTrack
  return all.map((c) => ({
    id: c.uid,
    time: c.time,
    timestamp: c.timestamp,
    from: c.call_from_number || c.call_from,
    to: c.call_to_number || c.call_to,
    type: c.call_type,            // Inbound / Outbound / Internal
    status: c.disposition,        // ANSWERED / NO ANSWER / BUSY / FAILED / VOICEMAIL
    talkDuration: c.talk_duration // en secondes
  }));
}

module.exports = { getToken, getCalls };