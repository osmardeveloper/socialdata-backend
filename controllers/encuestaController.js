const EncuestaRealizada = require('../models/EncuestaRealizada');

// @desc    Guardar una nueva caracterización completada
// @route   POST /api/encuestas
// @access  Private (Encuestador idealmente)
exports.createEncuesta = async (req, res) => {
  try {
    const data = {
      formulario_id: req.body.formulario_id,
      usuario_id: req.body.usuario_id,
      encuestador_id: req.user._id, // Autenticado por token
      respuestas: req.body.respuestas
    };

    const encuesta = await EncuestaRealizada.create(data);
    res.status(201).json(encuesta);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtener todas las encuestas realizadas
// @route   GET /api/encuestas
// @access  Private
exports.getEncuestas = async (req, res) => {
  try {
    const encuestas = await EncuestaRealizada.find()
      .populate('formulario_id', 'titulo')
      .populate('usuario_id', 'nombre apellido correo tipo_documento numero_documento')
      .populate('encuestador_id', 'nombre usuario rol');
    res.json(encuestas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
