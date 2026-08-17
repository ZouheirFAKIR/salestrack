require('dotenv').config();
const express = require('express');
const cors = require('cors');
const activitiesRoutes = require('./routes/activities');
const profileRoutes = require('./routes/profile');
const coursesRoutes = require('./routes/courses');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/activities', activitiesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/courses', coursesRoutes);

app.get('/', (req, res) => {
  res.send('API Commercial Tracker fonctionne');
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});