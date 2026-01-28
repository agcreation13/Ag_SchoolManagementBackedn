const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

router.post('/image', protect, uploadController.uploadImage);
router.post('/document', protect, uploadController.uploadDocument);
router.get('/files/:id', protect, uploadController.getFile);
router.delete('/files/:id', protect, uploadController.deleteFile);

module.exports = router;

