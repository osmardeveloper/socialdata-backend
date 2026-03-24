const UsuarioStaff = require('../models/UsuarioStaff');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Registrar nuevo usuario staff
// @route   POST /api/auth/register
// @access  Public (solo para iniciar sistema o Admin)
// Nota: en producción, esto podría ser privado solo para admin.
exports.registerUser = async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;

  try {
    // Check if user exists
    const userExists = await UsuarioStaff.findOne({ usuario });

    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Create user
    const user = await UsuarioStaff.create({
      nombre,
      usuario,
      password,
      rol: rol || 'encuestador',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
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
    // Verificar por email
    const user = await UsuarioStaff.findOne({ usuario }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener usuario autenticado
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await UsuarioStaff.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
