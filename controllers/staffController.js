/**
 * controllers/staffController.js  (DUAL: MongoDB / SQLite)
 * 
 * Ahora usa req.db.Staff (que puede ser UsuarioStaff de Mongoose o StaffSQLite)
 */

const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function normalizeStaff(s) {
  if (!s) return null;
  return {
    _id:     s.mongo_id || s.id || s._id,
    _localId: s.id,
    nombre:  s.nombre,
    usuario: s.usuario,
    rol:     s.rol,
    isSynced: !!s.is_synced,
    createdAt: s.created_at || s.createdAt,
    updatedAt: s.updated_at || s.updatedAt,
  };
}

// ─────────────────────────────────────────
// CONTROLADORES
// ─────────────────────────────────────────

// @desc    Obtener todos los staff
// @route   GET /api/staff
// @access  Private/Admin
exports.getStaff = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const staff = req.db.Staff.findAll();
      return res.json(staff.map(normalizeStaff));
    }
    const staff = await req.db.Staff.find();
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
    if (req.db.mode === 'sqlite') {
      const existing = req.db.Staff.findByUsuario(usuario);
      if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

      // Password hashing se maneja dentro de StaffSQLite.create
      const nuevo = await req.db.Staff.create({ nombre, usuario, password, rol });
      return res.status(201).json(normalizeStaff(nuevo));
    }

    const userExists = await req.db.Staff.findOne({ usuario });
    if (userExists) return res.status(400).json({ message: 'El usuario ya existe' });

    const staff = await req.db.Staff.create({ nombre, usuario, password, rol });
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
    if (req.db.mode === 'sqlite') {
      const s = req.db.Staff.findById(req.params.id);
      if (!s) return res.status(404).json({ message: 'Staff no encontrado' });

      const updated = await req.db.Staff.update(s.id, req.body);
      return res.json(normalizeStaff(updated));
    }

    const staff = await req.db.Staff.findById(req.params.id).select('+password');
    if (!staff) return res.status(404).json({ message: 'Staff no encontrado' });

    const { nombre, usuario, password, rol } = req.body;
    if (nombre)   staff.nombre   = nombre;
    if (usuario)  staff.usuario  = usuario;
    if (rol)      staff.rol      = rol;
    if (password) staff.password = password;

    const updatedStaff = await staff.save();
    updatedStaff.password = undefined;
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
    if (req.db.mode === 'sqlite') {
      req.db.Staff.delete(req.params.id);
      return res.json({ id: req.params.id, message: 'Staff eliminado' });
    }

    const staff = await req.db.Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff no encontrado' });
    await req.db.Staff.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Staff eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
