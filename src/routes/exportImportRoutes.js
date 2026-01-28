const express = require('express');
const router = express.Router();
const exportImportController = require('../controllers/exportImportController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

router.use(protect);
router.use(authorize('admin'));

router.route('/export/:entity')
  .get(exportImportController.exportData);

router.route('/import/:entity')
  .post(upload.single('file'), exportImportController.importData);

module.exports = router;

