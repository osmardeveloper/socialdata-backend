const express    = require('express');
const router     = express.Router();
const { 
  getPreguntasDisponibles, 
  createFormulario, 
  getFormularios,
  updateFormulario,
  deleteFormulario
} = require('../controllers/formularioController');
const { protect }  = require('../middleware/authMiddleware');
const dbMiddleware = require('../middleware/dbMiddleware');

router.use(protect);
router.use(dbMiddleware);

router.get('/preguntas', getPreguntasDisponibles);

router.route('/')
  .get(getFormularios)
  .post(createFormulario);

router.route('/:id')
  .put(updateFormulario)
  .delete(deleteFormulario);

module.exports = router;
