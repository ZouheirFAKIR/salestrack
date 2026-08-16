require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Empêche le crash du serveur si une connexion est coupée en arrière-plan
pool.on('error', (err) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL inactive', err);
});

// Test de connexion au démarrage, sans garder la connexion ouverte
pool.query('SELECT NOW()')
  .then(() => console.log('Connecté à PostgreSQL avec succès'))
  .catch((err) => console.error('Erreur de connexion à PostgreSQL', err.message));

module.exports = pool;