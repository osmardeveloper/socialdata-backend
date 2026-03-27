/**
 * controllers/authController.js  (DUAL: MongoDB / SQLite)
 * 
 * Gestiona el login tanto online como offline.
 */

const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const StaffSQLite  = require('../sqlite/models/sqliteStaff');
const UsuarioStaff = require('../models/UsuarioStaff');
const connectivity = require('../services/connectivityService');

// ─────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ─────────────────────────────────────────
// CONTROLADORES
// ─────────────────────────────────────────

// @desc    Registrar nuevo usuario staff
// @route   POST /api/auth/register
// @access  Public (Admin en producción)
exports.registerUser = async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;

  try {
    if (!connectivity.isOnline()) {
      // Registro offline en SQLite
      const existing = StaffSQLite.findByUsuario(usuario);
      if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

      const user = await StaffSQLite.create({ nombre, usuario, password, rol });
      return res.status(201).json({
        _id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        token: generateToken(user.id),
        offline: true,
      });
    }

    // Online → MongoDB
    const userExists = await UsuarioStaff.findOne({ usuario });
    if (userExists) return res.status(400).json({ message: 'El usuario ya existe' });

    const user = await UsuarioStaff.create({ nombre, usuario, password, rol: rol || 'encuestador' });

    if (user) {
      // Cachear localmente para login offline futuro
      const userWithPw = await UsuarioStaff.findById(user._id).select('+password');
      if (userWithPw) StaffSQLite.upsertFromMongo(user.toObject(), userWithPw.password);

      res.status(201).json({
        _id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Autenticar un usuario staff (login)
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { usuario, password } = req.body;

  try {
    // ── ESTRATEGIA OPTIMIZADA: Probar SQLite Primero (Fast-Path) ───
    // Buscamos en la base de datos local (SQLite). Si el usuario ya existe y las 
    // credenciales coinciden, entramos inmediatamente (<100ms).
    const staffLocal = StaffSQLite.findByUsuario(usuario);
    if (staffLocal) {
      const match = await bcrypt.compare(password, staffLocal.password);
      if (match) {
        const tokenId = staffLocal.mongo_id || staffLocal.id;
        console.log(`[Auth Controller] Login Ultra-Rápido via SQLite para: ${usuario}`);
        
        // Si estamos "online", lanzamos una actualización silenciosa de la caché en segundo plano
        if (connectivity.isOnline()) {
          UsuarioStaff.findOne({ usuario }).select('+password').then(u => {
            if (u) StaffSQLite.upsertFromMongo(u.toObject(), u.password);
          }).catch(() => {});
        }

        return res.json({
          _id: tokenId,
          nombre: staffLocal.nombre,
          usuario: staffLocal.usuario,
          rol: staffLocal.rol,
          token: generateToken(tokenId),
          offline: !connectivity.isOnline(),
        });
      }
    }

    // ── FALLBACK A MONGODB: (Si no está en SQLite o la password local es distinta) ──
    if (connectivity.isOnline()) {
      try {
        console.log(`[Auth Controller] Usuario no encontrado/inválido en SQLite, intentando MongoDB para: ${usuario}...`);
        const user = await UsuarioStaff.findOne({ usuario }).select('+password').maxTimeMS(4000);

        if (user && (await user.matchPassword(password))) {
          // Actualizar caché local para la próxima vez
          StaffSQLite.upsertFromMongo(user.toObject(), user.password);

          return res.json({
            _id: user._id,
            nombre: user.nombre,
            usuario: user.usuario,
            rol: user.rol,
            token: generateToken(user._id),
          });
        }
      } catch (mongoErr) {
        console.error('[Auth Controller] Error crítico en MongoDB:', mongoErr.message);
      }
    }

    res.status(401).json({ message: 'Credenciales inválidas' });

    res.status(401).json({ message: 'Credenciales inválidas' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener usuario autenticado
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
