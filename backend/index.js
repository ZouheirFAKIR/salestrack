require('dotenv').config({ quiet: true });
process.removeAllListeners('warning');
const express = require('express');
const cors = require('cors');
const activitiesRoutes = require('./routes/activities');
const profileRoutes = require('./routes/profile');
const coursesRoutes = require('./routes/courses');
const adminRoutes = require('./routes/admin');
const commercialProfileRoutes = require('./routes/commercialProfile');
const rewardsRoutes = require('./routes/rewards');
const cronRoutes = require('./routes/cron');
const odooRoutes = require('./routes/odoo');
const messagesRoutes = require('./routes/messages');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/activities', activitiesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/admin', commercialProfileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/odoo', odooRoutes);
app.use('/api/messages', messagesRoutes);

app.get('/', (req, res) => {
  res.send('API Commercial Tracker fonctionne');
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Non authentifié'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Token invalide'));
  }
});

io.on('connection', (socket) => {
  
  socket.join(`user:${socket.userId}`);
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Serveur SalesTrack démarré avec succès sur http://localhost:${PORT}`);
});