const express = require('express');
const router = express.Router();
const marksheetController = require('../controllers/marksheetController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/:studentId')
  .get(marksheetController.generateMarksheet);

module.exports = router;

