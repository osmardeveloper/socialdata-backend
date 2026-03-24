const Pregunta = require('../models/Pregunta');

// @desc    Obtener lista de preguntas (y sus detalles)
// @route   GET /api/preguntas
// @access  Private
exports.getPreguntas = async (req, res) => {
  try {
    const preguntas = await Pregunta.find();
    res.json(preguntas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crear un nuevo conjunto de preguntas o agregar
// @route   POST /api/preguntas
// @access  Private
exports.createPregunta = async (req, res) => {
  try {
    const pregunta = await Pregunta.create(req.body);
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
    const pregunta = await Pregunta.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!pregunta) {
      return res.status(404).json({ message: 'Registro de pregunta no encontrado' });
    }

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
    const pregunta = await Pregunta.findById(req.params.id);

    if (!pregunta) {
      return res.status(404).json({ message: 'Pregunta no encontrada' });
    }

    await Pregunta.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Preguntas eliminadas correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
