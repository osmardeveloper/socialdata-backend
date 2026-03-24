const Usuario = require('../models/Usuario');

// @desc    Obtener todos los usuarios encuestados
// @route   GET /api/usuarios
// @access  Private
exports.getUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Buscar usuario por numero_documento (para auto-relleno)
// @route   GET /api/usuarios/buscar?numero_documento=xxx
// @access  Private
exports.buscarPorDocumento = async (req, res) => {
  try {
    const { numero_documento } = req.query;
    if (!numero_documento) return res.status(400).json({ message: 'Parámetro numero_documento requerido' });
    const usuario = await Usuario.findOne({ numero_documento });
    if (!usuario) return res.status(404).json({ message: 'No encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crear un nuevo usuario encuestado
// @route   POST /api/usuarios
// @access  Private
exports.createUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.create(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Actualizar un usuario encuestado
// @route   PUT /api/usuarios/:id
// @access  Private
exports.updateUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Eliminar un usuario encuestado
// @route   DELETE /api/usuarios/:id
// @access  Private
exports.deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await Usuario.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
