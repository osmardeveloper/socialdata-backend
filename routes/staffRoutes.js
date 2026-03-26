const express    = require('express');
const router     = express.Router();
const { getStaff, createStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');
const dbMiddleware = require('../middleware/dbMiddleware');

// Solo administradores pueden gestionar el staff
router.use(protect);
router.use(authorize('administrador'));
router.use(dbMiddleware);

router.route('/')
  .get(getStaff)
  .post(createStaff);

router.route('/:id')
  .put(updateStaff)
  .delete(deleteStaff);

module.exports = router;
