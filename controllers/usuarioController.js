/**
 * controllers/usuarioController.js  (DUAL: MongoDB / SQLite)
 *
 * req.db.mode === 'sqlite' → usa SQLite (síncrono)
 * req.db.mode === 'mongo'  → usa Mongoose (asíncrono)
 */

// ──────────────────────────────────────────────────────────
// HELPERS para normalizar respuestas entre ambas fuentes
// ──────────────────────────────────────────────────────────

/** Convierte un doc SQLite al formato que espera el frontend */
function normalizeSQLite(u) {
  if (!u) return null;
  return {
    _id: u.mongo_id || u.id,   // el frontend siempre usa _id
    _localId: u.id,            // UUID local para referencias offline
    tipo_documento: u.tipo_documento,
    numero_documento: u.numero_documento,
    nombre: u.nombre,
    apellido: u.apellido,
    direccion: u.direccion,
    telefono: u.telefono,
    correo: u.correo,
    fecha_nacimiento: u.fecha_nacimiento,
    isSynced: !!u.is_synced,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

// ──────────────────────────────────────────────────────────
// CONTROLADORES
// ──────────────────────────────────────────────────────────

// @desc    Obtener todos los usuarios encuestados
// @route   GET /api/usuarios
// @access  Private
exports.getUsuarios = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const usuarios = req.db.Usuario.findAll().map(normalizeSQLite);
      return res.json(usuarios);
    }
    const usuarios = await req.db.Usuario.find();
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
    if (!numero_documento)
      return res.status(400).json({ message: 'Parámetro numero_documento requerido' });

    if (req.db.mode === 'sqlite') {
      const u = req.db.Usuario.findByNumeroDocumento(numero_documento);
      if (!u) return res.status(404).json({ message: 'No encontrado' });
      return res.json(normalizeSQLite(u));
    }

    const usuario = await req.db.Usuario.findOne({ numero_documento });
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
    if (req.db.mode === 'sqlite') {
      // Verificar duplicado local
      const existing = req.db.Usuario.findByNumeroDocumento(req.body.numero_documento);
      if (existing)
        return res.status(400).json({ message: 'Ya existe un usuario con ese número de documento' });

      const nuevo = req.db.Usuario.create(req.body);
      return res.status(201).json(normalizeSQLite(nuevo));
    }

    const usuario = await req.db.Usuario.create(req.body);
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
    if (req.db.mode === 'sqlite') {
      // req.params.id puede ser UUID local o mongo_id
      let u = req.db.Usuario.findById(req.params.id);
      if (!u) u = req.db.Usuario.findByMongoId(req.params.id);
      if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });

      // Marcar como no sincronizado al editar offline
      const updated = req.db.Usuario.update(u.id, { ...req.body, is_synced: 0 });
      return res.json(normalizeSQLite(updated));
    }

    const usuario = await req.db.Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
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
    if (req.db.mode === 'sqlite') {
      let u = req.db.Usuario.findById(req.params.id);
      if (!u) u = req.db.Usuario.findByMongoId(req.params.id);
      if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });
      req.db.Usuario.delete(u.id);
      return res.json({ id: req.params.id, message: 'Usuario eliminado correctamente' });
    }

    const usuario = await req.db.Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    await req.db.Usuario.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
