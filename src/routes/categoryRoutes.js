const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { validateCategory } = require('../middleware/validateCategory');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', protect, authorize('admin'), validateCategory, categoryController.createCategory);
router.put('/:id', protect, authorize('admin'), validateCategory, categoryController.updateCategory);
router.delete('/:id', protect, authorize('admin'), categoryController.deleteCategory);

module.exports = router;

