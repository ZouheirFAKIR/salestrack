const { Pool: PgPool } = require('pg');

// USE_NEON_WS=true : connexion à Neon par le port 443 (comme un site web).
// Utile sur les Wi-Fi qui bloquent le port 5432 (université, entreprise...).
// Sur Vercel, ne pas mettre cette variable : la connexion normale est gardée.
const useWebSocket = process.env.USE_NEON_WS === 'true';

let Pool = PgPool;
if (useWebSocket) {
  const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
  neonConfig.webSocketConstructor = require('ws');
  Pool = NeonPool;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useWebSocket ? {} : { ssl: { rejectUnauthorized: false } }),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Sans ce handler, une erreur sur une connexion inactive (ex: Neon qui coupe
// la connexion après un moment) fait planter silencieusement tout le pool,
// et toutes les routes suivantes échouent avec "Connection terminated".
pool.on('error', (err) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL inactive :', err.message);
});

if (useWebSocket) console.log('🔌 Base de données : connexion Neon par le port 443 (WebSocket)');

module.exports = pool;