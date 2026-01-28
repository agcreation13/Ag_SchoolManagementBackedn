const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(analyticsController.getAdvancedAnalytics);

router.route('/summary')
  .get(analyticsController.getAnalyticsSummary);

module.exports = router;

