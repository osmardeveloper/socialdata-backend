// ─── CRÍTICO: cargar variables de entorno PRIMERO ────────────────────────────
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// ─── Inicializar SQLite ANTES que cualquier otra cosa ─────────────────────────
// (crea tablas si no existen)
require('./sqlite/db.sqlite');

const connectDB = require('./db');
const connectivity = require('./services/connectivityService');
const syncService = require('./services/syncService');

const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const preguntaRoutes = require('./routes/preguntaRoutes');
const formularioRoutes = require('./routes/formularioRoutes');
const encuestaRoutes = require('./routes/encuestaRoutes');
const statusRoutes = require('./routes/statusRoutes');
const grupoFamiliarRoutes = require('./routes/grupoFamiliarRoutes');

// ─── Conectar MongoDB (no-blocking: arranca aunque falle) ─────────────────────
connectDB().then(() => {
  connectivity.startMonitoring(15000);
  syncService.initSync();
});

const app = express();

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/preguntas', preguntaRoutes);
app.use('/api/formularios', formularioRoutes);
app.use('/api/encuestas', encuestaRoutes);
app.use('/api/grupos-familiares', grupoFamiliarRoutes);
app.use('/api/status', statusRoutes);

// Health-check
app.get('/', (req, res) => {
  res.json({
    message: 'SocialData API is running',
    mode: connectivity.isOnline() ? 'online 🟢' : 'offline 🔴',
  });
});

// ─── Arrancar servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 SocialData API corriendo en puerto ${PORT}`);
  console.log(`   Entorno : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   SQLite  : backend/data/socialdata.sqlite`);
  console.log(`   MongoDB : ${process.env.MONGO_URI ? '(configurado)' : '⚠️ MONGO_URI no definido'}\n`);
});
