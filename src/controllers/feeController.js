const Fee = require('../models/Fee');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Create fee
// @route   POST /api/fees
// @access  Private (Admin only)
exports.createFee = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create fees'
      });
    }
    
    const { student, feeType, amount, dueDate, academicYear, semester, description } = req.body;
    
    // Validate student is an ObjectId
    if (!student || !mongoose.Types.ObjectId.isValid(student)) {
      return res.status(400).json({
        success: false,
        message: 'Valid student ID is required'
      });
    }
    
    // Check if student exists
    const studentExists = await User.findById(student);
    if (!studentExists || studentExists.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    const feeData = {
      student,
      feeType,
      amount,
      dueDate,
      academicYear,
      semester,
      description,
      createdBy: req.user.id
    };
    
    const fee = await Fee.create(feeData);
    
    res.status(201).json({
      success: true,
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all fees
// @route   GET /api/fees
// @access  Private
exports.getFees = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId, status, feeType, academicYear, semester } = req.query;
    
    let query = {};
    
    // Students can only see their own fees
    if (role === 'student') {
      query.student = id;
    } else if (role === 'parent') {
      // Parents see their children's fees
      const user = await User.findById(id).select('children');
      const childrenIds = user?.children?.map(c => c.studentId) || [];
      query.student = { $in: childrenIds };
    }
    
    if (studentId) query.student = studentId;
    if (status) query.status = status;
    if (feeType) query.feeType = feeType;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const fees = await Fee.find(query)
      .populate('student', 'firstName lastName email username')
      .populate('createdBy', 'firstName lastName')
      .sort({ dueDate: 1 });
    
    res.json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fee by ID
// @route   GET /api/fees/:id
// @access  Private
exports.getFeeById = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student', 'firstName lastName email username')
      .populate('createdBy', 'firstName lastName');
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }
    
    // Check authorization
    const { role, id } = req.user;
    if (role === 'student' && fee.student._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this fee'
      });
    }
    
    res.json({
      success: true,
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fee
// @route   PUT /api/fees/:id
// @access  Private (Admin only)
exports.updateFee = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update fees'
      });
    }
    
    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('student', 'firstName lastName email');
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }
    
    res.json({
      success: true,
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete fee
// @route   DELETE /api/fees/:id
// @access  Private (Admin only)
exports.deleteFee = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete fees'
      });
    }
    
    const fee = await Fee.findByIdAndDelete(req.params.id);
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Fee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fees by student
// @route   GET /api/fees/student/:studentId
// @access  Private
exports.getFeesByStudent = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    // Authorization check
    if (role === 'student' && studentId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const fees = await Fee.findByStudent(studentId)
      .populate('createdBy', 'firstName lastName');
    
    res.json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overdue fees
// @route   GET /api/fees/overdue
// @access  Private (Admin, Parent)
exports.getOverdueFees = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    let overdueFees = await Fee.findOverdue();
    
    // Parents see only their children's overdue fees
    if (role === 'parent') {
      const user = await User.findById(id).select('children');
      const childrenIds = user?.children?.map(c => c.studentId) || [];
      overdueFees = overdueFees.filter(fee => 
        childrenIds.includes(fee.student._id.toString())
      );
    }
    
    res.json({
      success: true,
      count: overdueFees.length,
      data: overdueFees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process payment
// @route   POST /api/fees/:id/payment
// @access  Private
exports.processPayment = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { amount, paymentMethod, transactionId, receiptNumber, notes } = req.body;
    
    // Validate paymentMethod
    if (!paymentMethod || !['cash', 'online', 'cheque', 'bank_transfer'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment method is required (cash, online, cheque, bank_transfer)'
      });
    }
    
    const fee = await Fee.findById(req.params.id);
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }
    
    // Authorization check
    if (role === 'student' && fee.student.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay this fee'
      });
    }
    
    // Process payment
    if (amount && amount < fee.amount) {
      // Partial payment
      await fee.addPayment({
        amount,
        paymentMethod,
        transactionId,
        receiptNumber,
        notes
      });
    } else {
      // Full payment
      await fee.markAsPaid({
        paymentMethod,
        transactionId,
        receiptNumber,
        notes
      });
    }
    
    const updatedFee = await Fee.findById(req.params.id)
      .populate('student', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: updatedFee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get fee statistics
// @route   GET /api/fees/statistics
// @access  Private (Admin)
exports.getFeeStatistics = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const { academicYear, semester } = req.query;
    const stats = await Fee.getFeeStatistics(academicYear, semester);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate fee receipt
// @route   GET /api/fees/:id/receipt
// @access  Private
exports.generateFeeReceipt = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee not found'
      });
    }
    
    // TODO: Implement PDF generation
    // For now, return receipt data
    res.json({
      success: true,
      data: {
        fee,
        receiptNumber: fee.paymentHistory[fee.paymentHistory.length - 1]?.receiptNumber || `FEE-${fee._id}`,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

