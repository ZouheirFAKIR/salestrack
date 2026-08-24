const { Pool } = require('pg');

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