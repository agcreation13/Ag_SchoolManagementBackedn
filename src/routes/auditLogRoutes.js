const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(auditLogController.getAuditLogs);

router.route('/statistics')
  .get(auditLogController.getAuditLogStatistics);

router.route('/export')
  .get(auditLogController.exportAuditLogs);

module.exports = router;

