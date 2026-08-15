require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect((err) => {
  if (err) console.error('Erreur de connexion à PostgreSQL', err.stack);
  else console.log('Connecté à PostgreSQL avec succès');
});

module.exports = pool;