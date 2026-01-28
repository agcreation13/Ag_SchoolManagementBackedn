const express = require('express');
const router = express.Router();
const {
  createFee,
  getFees,
  getFeeById,
  updateFee,
  deleteFee,
  getFeesByStudent,
  getOverdueFees,
  processPayment,
  getFeeStatistics,
  generateFeeReceipt
} = require('../controllers/feeController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createFee)
  .get(getFees);

router.route('/:id')
  .get(getFeeById)
  .put(updateFee)
  .delete(deleteFee);

router.route('/student/:studentId')
  .get(getFeesByStudent);

router.route('/overdue')
  .get(getOverdueFees);

router.route('/:id/payment')
  .post(processPayment);

router.route('/statistics')
  .get(getFeeStatistics);

router.route('/:id/receipt')
  .get(generateFeeReceipt);

module.exports = router;

