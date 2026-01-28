const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), settingsController.getSettings);
router.get('/:key', protect, authorize('admin'), settingsController.getSetting);
router.put('/', protect, authorize('admin'), settingsController.updateSettings);
router.put('/:key', protect, authorize('admin'), settingsController.updateSetting);
router.post('/reset', protect, authorize('admin'), settingsController.resetSettings);

module.exports = router;

