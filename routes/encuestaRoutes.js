const express = require('express');
const router = express.Router();
const { createEncuesta, getEncuestas } = require('../controllers/encuestaController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createEncuesta)
  .get(getEncuestas);

module.exports = router;
