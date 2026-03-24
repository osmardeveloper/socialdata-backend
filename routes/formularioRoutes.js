const express = require('express');
const router = express.Router();
const { getPreguntasDisponibles, createFormulario, getFormularios } = require('../controllers/formularioController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getFormularios)
  .post(createFormulario);

router.get('/preguntas', getPreguntasDisponibles); // Alias for convenience in front form-builder

module.exports = router;
