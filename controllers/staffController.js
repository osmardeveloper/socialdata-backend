const UsuarioStaff = require('../models/UsuarioStaff');
const bcrypt = require('bcryptjs');

// @desc    Obtener todos los staff
// @route   GET /api/staff
// @access  Private/Admin
exports.getStaff = async (req, res) => {
  try {
    const staff = await UsuarioStaff.find();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crear nuevo staff
// @route   POST /api/staff
// @access  Private/Admin
exports.createStaff = async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;
  try {
    const userExists = await UsuarioStaff.findOne({ usuario });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const staff = await UsuarioStaff.create({ nombre, usuario, password, rol });
    res.status(201).json(staff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Actualizar staff
// @route   PUT /api/staff/:id
// @access  Private/Admin
exports.updateStaff = async (req, res) => {
  try {
    const staff = await UsuarioStaff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff no encontrado' });
    }

    const { nombre, usuario, password, rol } = req.body;

    if (nombre) staff.nombre = nombre;
    if (usuario) staff.usuario = usuario;
    if (rol) staff.rol = rol;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      staff.password = await bcrypt.hash(password, salt);
    }

    const updatedStaff = await staff.save();
    res.json(updatedStaff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Eliminar staff
// @route   DELETE /api/staff/:id
// @access  Private/Admin
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await UsuarioStaff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff no encontrado' });
    }

    await UsuarioStaff.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Staff eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
