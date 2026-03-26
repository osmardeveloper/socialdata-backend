/**
 * controllers/formularioController.js  (DUAL: MongoDB / SQLite)
 * ACTUALIZADO: Soporte para UPDATE y DELETE
 */

const PreguntaSQLite = require('../sqlite/models/sqlitePregunta');

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

function normalizeFormulario(f, populatedPreguntas = null) {
  if (!f) return null;
  return {
    _id: f.mongo_id || f.id || f._id,
    _localId: f.id,
    titulo: f.titulo,
    preguntas: populatedPreguntas || f.preguntas, 
    isSynced: !!f.is_synced,
    createdAt: f.created_at || f.createdAt,
    updatedAt: f.updated_at || f.updatedAt,
  };
}

function normalizePregunta(p) {
  if (!p) return null;
  return {
    _id: p.mongo_id || p.id || p._id,
    _localId: p.id,
    detalles: p.detalles,
    isSynced: !!p.is_synced,
    createdAt: p.created_at || p.createdAt,
    updatedAt: p.updated_at || p.updatedAt,
  };
}

function populatePreguntas(preguntaIds) {
  if (!preguntaIds) return [];
  const ids = Array.isArray(preguntaIds) ? preguntaIds : JSON.parse(preguntaIds);
  return ids.map((id) => {
    const p = PreguntaSQLite.findById(id) || PreguntaSQLite.findByMongoId(id);
    return p ? normalizePregunta(p) : { _id: id };
  });
}

// ────────────────────────────────────────────
// CONTROLADORES
// ────────────────────────────────────────────

exports.getPreguntasDisponibles = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      return res.json(PreguntaSQLite.findAll().map(normalizePregunta));
    }
    const preguntas = await req.db.Pregunta.find();
    res.json(preguntas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFormularios = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const forms = req.db.FormularioPersonalizada.findAll().map((f) => {
        return normalizeFormulario(f, populatePreguntas(f.preguntas));
      });
      return res.json(forms);
    }
    const forms = await req.db.FormularioPersonalizada.find().populate('preguntas');
    res.json(forms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createFormulario = async (req, res) => {
  try {
    const data = {
      titulo: req.body.titulo,
      preguntas: req.body.preguntas, 
    };

    if (req.db.mode === 'sqlite') {
      const form = req.db.FormularioPersonalizada.create(data);
      return res.status(201).json(normalizeFormulario(form, populatePreguntas(form.preguntas)));
    }

    const form = await req.db.FormularioPersonalizada.create(data);
    const populated = await req.db.FormularioPersonalizada.findById(form._id).populate('preguntas');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateFormulario = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const updated = req.db.FormularioPersonalizada.update(req.params.id, {
        titulo: req.body.titulo,
        preguntas: req.body.preguntas,
        is_synced: 0
      });
      if (!updated) return res.status(404).json({ message: 'No encontrado en local' });
      return res.json(normalizeFormulario(updated, populatePreguntas(updated.preguntas)));
    }

    const updated = await req.db.FormularioPersonalizada.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('preguntas');
    if (!updated) return res.status(404).json({ message: 'No encontrado en nube' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteFormulario = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const deleted = req.db.FormularioPersonalizada.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'No encontrado en local' });
      return res.json({ message: 'Eliminado de local' });
    }

    const deleted = await req.db.FormularioPersonalizada.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'No encontrado en nube' });
    res.json({ message: 'Eliminado de nube' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
