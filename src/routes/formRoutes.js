const express = require('express');
const router = express.Router();
const {
  createForm,
  getForms,
  getFormById,
  updateForm,
  deleteForm,
  submitForm,
  approveForm,
  rejectForm,
  getFormsByType,
  getFormsByStatus,
  getPendingForms
} = require('../controllers/formController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(authorize('admin', 'teacher'), createForm)
  .get(getForms);

router.route('/pending')
  .get(getPendingForms);

router.route('/type/:type')
  .get(getFormsByType);

router.route('/status/:status')
  .get(getFormsByStatus);

router.route('/:id')
  .get(getFormById)
  .put(authorize('admin', 'teacher'), updateForm)
  .delete(authorize('admin', 'teacher'), deleteForm);

router.route('/:id/submit')
  .post(submitForm);

router.route('/:id/approve')
  .put(approveForm);

router.route('/:id/reject')
  .put(rejectForm);

module.exports = router;

