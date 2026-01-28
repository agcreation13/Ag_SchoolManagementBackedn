const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(resourceController.getResources)
  .post(authorize('admin', 'teacher'), resourceController.createResource);

router.route('/:id')
  .get(resourceController.getResource)
  .put(authorize('admin', 'teacher'), resourceController.updateResource)
  .delete(authorize('admin', 'teacher'), resourceController.deleteResource);

module.exports = router;

