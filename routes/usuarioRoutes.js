const express = require('express');
const router = express.Router();
const { getUsuarios, buscarPorDocumento, createUsuario, updateUsuario, deleteUsuario } = require('../controllers/usuarioController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Búsqueda por número de documento (debe ir ANTES de /:id)
router.get('/buscar', buscarPorDocumento);

router.route('/')
  .get(getUsuarios)
  .post(createUsuario);

router.route('/:id')
  .put(updateUsuario)
  .delete(deleteUsuario);

module.exports = router;
