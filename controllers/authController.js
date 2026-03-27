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
    // ── MODO OFFLINE: buscar en SQLite ──────────────────────────
    if (!connectivity.isOnline()) {
      const staffLocal = StaffSQLite.findByUsuario(usuario);

      if (!staffLocal) {
        return res.status(401).json({
          message: 'Usuario no encontrado en caché local. (Debes loguearte online al menos una vez)',
        });
      }

      const match = await bcrypt.compare(password, staffLocal.password);
      if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

      const tokenId = staffLocal.mongo_id || staffLocal.id;

      return res.json({
        _id: tokenId,
        nombre: staffLocal.nombre,
        usuario: staffLocal.usuario,
        rol: staffLocal.rol,
        token: generateToken(tokenId),
        offline: true,
      });
    }

    // ── MODO ONLINE: buscar en MongoDB ──────────────────────────
    let user = null;
    try {
      user = await UsuarioStaff.findOne({ usuario }).select('+password').maxTimeMS(5000); // 5s timeout
    } catch (mongoErr) {
      console.warn('[Auth Controller] MongoDB falló o tardó demasiado, reintentando via SQLite...', mongoErr.message);
    }

    if (user && (await user.matchPassword(password))) {
      // Actualizar caché local
      StaffSQLite.upsertFromMongo(user.toObject(), user.password);

      return res.json({
        _id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        token: generateToken(user._id),
      });
    }

    // ── REINTENTO EN SQLITE (si Mongo falló o no existe el usuario online) ──
    const staffLocal = StaffSQLite.findByUsuario(usuario);
    if (staffLocal) {
      const match = await bcrypt.compare(password, staffLocal.password);
      if (match) {
        const tokenId = staffLocal.mongo_id || staffLocal.id;
        console.log(`[Auth Controller] Login exitoso vía SQLite (tras fallo/ausencia en Mongo) para: ${usuario}`);
        return res.json({
          _id: tokenId,
          nombre: staffLocal.nombre,
          usuario: staffLocal.usuario,
          rol: staffLocal.rol,
          token: generateToken(tokenId),
          offline: true, // Avisar al frontend que estamos "fallbackeando"
        });
      }
    }

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
