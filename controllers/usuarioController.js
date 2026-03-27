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
    edad: u.edad,
    grupo_familiar_id: u.grupo_familiar_id,
    isSynced: !!u.is_synced,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

// ──────────────────────────────────────────────────────────
// CONTROLADORES
// ──────────────────────────────────────────────────────────

exports.getUsuarios = async (req, res) => {
  try {
    if (req.db.mode === 'mongo') {
      try {
        const usuarios = await req.db.Usuario.find().maxTimeMS(3000);
        return res.json(usuarios);
      } catch (err) {
        console.warn('[UsuarioController] Falló Mongo, usando SQLite de respaldo...', err.message);
      }
    }

    // Backup o modo explicito SQLite
    const usuarios = req.db.mode === 'mongo' 
      ? require('../sqlite/models/sqliteUsuario').findAll().map(normalizeSQLite)
      : req.db.Usuario.findAll().map(normalizeSQLite);
    
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

    if (req.db.mode === 'mongo') {
      try {
        const usuario = await req.db.Usuario.findOne({ numero_documento }).maxTimeMS(2000);
        if (usuario) return res.json(usuario);
      } catch (err) {
        console.warn('[UsuarioController] Falló búsqueda en Mongo, intentando SQLite...', err.message);
      }
    }

    // Fallback SQLite
    const u = require('../sqlite/models/sqliteUsuario').findByNumeroDocumento(numero_documento);
    if (!u) return res.status(404).json({ message: 'No encontrado' });
    res.json(normalizeSQLite(u));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUsuario = async (req, res) => {
  try {
    if (req.db.mode === 'mongo') {
      try {
         const usuario = await req.db.Usuario.create(req.body);
         return res.status(201).json(usuario);
      } catch (err) {
         console.warn('[UsuarioController] Falló creación en Mongo, guardando en SQLite...', err.message);
      }
    }

    // Modo SQLite o Fallback
    const sqliteModel = req.db.mode === 'sqlite' ? req.db.Usuario : require('../sqlite/models/sqliteUsuario');
    const existing = sqliteModel.findByNumeroDocumento(req.body.numero_documento);
    if (existing) return res.status(400).json({ message: 'Ya existe un usuario con ese número de documento' });

    const nuevo = sqliteModel.create(req.body);
    res.status(201).json(normalizeSQLite(nuevo));
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
