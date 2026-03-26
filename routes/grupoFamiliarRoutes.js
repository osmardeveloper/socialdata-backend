const express    = require('express');
const router     = express.Router();
const { getGrupos, createGrupo, updateGrupo, deleteGrupo } = 
  require('../controllers/grupoFamiliarController');
const { protect }  = require('../middleware/authMiddleware');
const dbMiddleware = require('../middleware/dbMiddleware');

router.use(protect);
router.use(dbMiddleware);

router.route('/')
  .get(getGrupos)
  .post(createGrupo);

router.route('/:id')
  .put(updateGrupo)
  .delete(deleteGrupo);

module.exports = router;
