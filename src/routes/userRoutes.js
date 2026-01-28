const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'teacher'), userController.getUsers);
router.get('/stats', protect, authorize('admin'), userController.getUserStats);
router.post('/', protect, authorize('admin', 'teacher'), userController.createUser);
router.get('/:id', protect, userController.getUser);
router.put('/:id', protect, userController.updateUser);
router.put('/:id/password', protect, userController.changePassword);
router.delete('/:id', protect, authorize('admin'), userController.deleteUser);

module.exports = router;

