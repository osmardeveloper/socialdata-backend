/**
 * controllers/preguntaController.js  (DUAL: MongoDB / SQLite)
 */

function normalizeSQLite(p) {
  if (!p) return null;
  return {
    _id: p.mongo_id || p.id,
    _localId: p.id,
    detalles: p.detalles,
    isSynced: !!p.is_synced,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// @desc    Obtener lista de preguntas
// @route   GET /api/preguntas
// @access  Private
exports.getPreguntas = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      return res.json(req.db.Pregunta.findAll().map(normalizeSQLite));
    }
    const preguntas = await req.db.Pregunta.find();
    res.json(preguntas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crear un nuevo conjunto de preguntas
// @route   POST /api/preguntas
// @access  Private
exports.createPregunta = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      const nueva = req.db.Pregunta.create(req.body);
      return res.status(201).json(normalizeSQLite(nueva));
    }
    const pregunta = await req.db.Pregunta.create(req.body);
    res.status(201).json(pregunta);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Actualizar preguntas
// @route   PUT /api/preguntas/:id
// @access  Private
exports.updatePregunta = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      let p = req.db.Pregunta.findById(req.params.id);
      if (!p) p = req.db.Pregunta.findByMongoId(req.params.id);
      if (!p) return res.status(404).json({ message: 'Registro de pregunta no encontrado' });

      const updated = req.db.Pregunta.update(p.id, { ...req.body, is_synced: 0 });
      return res.json(normalizeSQLite(updated));
    }

    const pregunta = await req.db.Pregunta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!pregunta) return res.status(404).json({ message: 'Registro de pregunta no encontrado' });
    res.json(pregunta);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Eliminar pregunta
// @route   DELETE /api/preguntas/:id
// @access  Private
exports.deletePregunta = async (req, res) => {
  try {
    if (req.db.mode === 'sqlite') {
      let p = req.db.Pregunta.findById(req.params.id);
      if (!p) p = req.db.Pregunta.findByMongoId(req.params.id);
      if (!p) return res.status(404).json({ message: 'Pregunta no encontrada' });
      req.db.Pregunta.delete(p.id);
      return res.json({ id: req.params.id, message: 'Preguntas eliminadas correctamente' });
    }

    const pregunta = await req.db.Pregunta.findById(req.params.id);
    if (!pregunta) return res.status(404).json({ message: 'Pregunta no encontrada' });
    await req.db.Pregunta.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Preguntas eliminadas correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
