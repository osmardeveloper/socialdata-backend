const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db');
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const preguntaRoutes = require('./routes/preguntaRoutes');
const formularioRoutes = require('./routes/formularioRoutes');
const encuestaRoutes = require('./routes/encuestaRoutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Map routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/preguntas', preguntaRoutes);
app.use('/api/formularios', formularioRoutes);
app.use('/api/encuestas', encuestaRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
