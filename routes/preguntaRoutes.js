const express = require('express');
const router = express.Router();
const { getPreguntas, createPregunta, updatePregunta, deletePregunta } = require('../controllers/preguntaController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getPreguntas)
  .post(createPregunta);

router.route('/:id')
  .put(updatePregunta)
  .delete(deletePregunta);

module.exports = router;
