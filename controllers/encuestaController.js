/**
 * controllers/encuestaController.js  (DUAL: MongoDB / SQLite)
 * ACTUALIZADO: Enriquecimiento de respuestas con nombre de pregunta
 */

const UsuarioSQLite    = require('../sqlite/models/sqliteUsuario');
const FormularioSQLite = require('../sqlite/models/sqliteFormulario');
const PreguntaSQLite   = require('../sqlite/models/sqlitePregunta');
const db               = require('../sqlite/db.sqlite');

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

/** Enriquecer respuestas localmente (SQLite) */
function enrichRespuestasLocal(respuestasRaw) {
  if (!respuestasRaw) return [];
  const resps = typeof respuestasRaw === 'string' ? JSON.parse(respuestasRaw) : respuestasRaw;
  
  return resps.map(r => {
    // Si tiene pregunta_id, buscamos la definición normal
    if (r.pregunta_id) {
      const p = PreguntaSQLite.findById(r.pregunta_id) || PreguntaSQLite.findByMongoId(r.pregunta_id);
      return {
        ...r,
        pregunta_id: p ? { 
          _id: p.mongo_id || p.id, 
          detalles: p.detalles // Contiene el nombre
        } : { _id: r.pregunta_id }
      };
    }
    // Si es una sub-pregunta (identificada por nombre), creamos un objeto virtual para que el frontend lo lea bien
    return {
      ...r,
      pregunta_id: { 
        _id: null, 
        detalles: [{ nombre: r.pregunta_nombre || 'Sub-pregunta' }] 
      }
    };
  });
}

function normalizeEncuesta(e, formulario, usuario, encuestador) {
  return {
    _id: e.mongo_id || e.id || e._id,
    _localId: e.id,
    formulario_id: formulario || { _id: e.formulario_id },
    usuario_id:    usuario    || { _id: e.usuario_id },
    encuestador_id: encuestador || { _id: e.encuestador_id },
    respuestas: enrichRespuestasLocal(e.respuestas),
    fecha: e.fecha,
    isSynced: !!e.is_synced,
    createdAt: e.created_at || e.createdAt,
    updatedAt: e.updated_at || e.updatedAt,
  };
}

function getFormularioLocal(id) {
  const f = FormularioSQLite.findById(id) || FormularioSQLite.findByMongoId(id);
  if (!f) return null;
  return { _id: f.mongo_id || f.id, titulo: f.titulo };
}

function getUsuarioLocal(id) {
  const u = UsuarioSQLite.findById(id) || UsuarioSQLite.findByMongoId(id);
  if (!u) return null;
  return {
    _id: u.mongo_id || u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    correo: u.correo,
    tipo_documento: u.tipo_documento,
    numero_documento: u.numero_documento,
  };
}

function getStaffLocal(id) {
  const s = db.prepare('SELECT * FROM usuarios_staff WHERE id = ? OR mongo_id = ?').get(id, id);
  if (!s) return null;
  return { _id: s.mongo_id || s.id, nombre: s.nombre, usuario: s.usuario, rol: s.rol };
}

// ────────────────────────────────────────────
// CONTROLADORES
// ────────────────────────────────────────────

exports.createEncuesta = async (req, res) => {
  try {
    const encuestadorId = req.user?._id?.toString() || req.user?.id;

    if (req.db.mode === 'sqlite') {
      const data = {
        formulario_id:  req.body.formulario_id,
        usuario_id:     req.body.usuario_id,
        encuestador_id: encuestadorId,
        respuestas:     req.body.respuestas,
        fecha:          req.body.fecha || new Date().toISOString(),
      };
      const encuesta = req.db.EncuestaRealizada.create(data);
      return res.status(201).json(
        normalizeEncuesta(
          encuesta,
          getFormularioLocal(data.formulario_id),
          getUsuarioLocal(data.usuario_id),
          getStaffLocal(encuestadorId)
        )
      );
    }

    const encuesta = await req.db.EncuestaRealizada.create({
      ...req.body,
      encuestador_id: encuestadorId
    });
    res.status(201).json(encuesta);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEncuestas = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const encuestas = req.db.EncuestaRealizada.findAll().map((e) =>
        normalizeEncuesta(
          e,
          getFormularioLocal(e.formulario_id),
          getUsuarioLocal(e.usuario_id),
          getStaffLocal(e.encuestador_id)
        )
      );
      return res.json(encuestas);
    }

    const encuestas = await req.db.EncuestaRealizada.find()
      .populate('formulario_id', 'titulo')
      .populate('usuario_id', 'nombre apellido correo tipo_documento numero_documento')
      .populate('encuestador_id', 'nombre usuario rol')
      .populate('respuestas.pregunta_id', 'detalles'); // Populate de las preguntas en las respuestas
    res.json(encuestas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
