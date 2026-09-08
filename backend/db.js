const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
console.log('[diagnostic] DATABASE_URL longueur:', dbUrl.length);
console.log('[diagnostic] DATABASE_URL début:', dbUrl.slice(0, 15));
console.log('[diagnostic] DATABASE_URL fin:', dbUrl.slice(-30));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Sans ce handler, une erreur sur une connexion inactive (ex: Neon qui coupe
// la connexion après un moment) fait planter silencieusement tout le pool,
// et toutes les routes suivantes échouent avec "Connection terminated".
pool.on('error', (err) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL inactive :', err.message);
});

module.exports = pool;