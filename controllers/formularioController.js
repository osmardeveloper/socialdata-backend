const FormularioPersonalizada = require('../models/FormularioPersonalizada');
const Pregunta = require('../models/Pregunta');

// @desc    Obtener todas las preguntas disponibles para el constructor
// @route   GET /api/formularios/preguntas
// @access  Private
exports.getPreguntasDisponibles = async (req, res) => {
  try {
    const preguntas = await Pregunta.find();
    res.json(preguntas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crear un formulario personalizado seleccionando 'preguntas'
// @route   POST /api/formularios
// @access  Private
exports.createFormulario = async (req, res) => {
  try {
    const data = {
      titulo: req.body.titulo,
      preguntas: req.body.preguntas
    };
    const form = await FormularioPersonalizada.create(data);
    res.status(201).json(form);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtener lista de formularios personalizados
// @route   GET /api/formularios
// @access  Private
exports.getFormularios = async (req, res) => {
  try {
    const forms = await FormularioPersonalizada.find().populate('preguntas');
    res.json(forms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
