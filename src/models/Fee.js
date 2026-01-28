const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  feeType: {
    type: String,
    enum: ['tuition', 'library', 'lab', 'sports', 'transport', 'hostel', 'other'],
    required: [true, 'Fee type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'cheque', 'bank_transfer', null],
    default: null,
    required: false
  },
  transactionId: {
    type: String,
    default: null
  },
  paymentDate: {
    type: Date,
    default: null
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required']
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer'],
    default: 'Fall'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentHistory: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online', 'cheque', 'bank_transfer'],
      required: true
    },
    transactionId: String,
    receiptNumber: String,
    notes: String
  }]
}, {
  timestamps: true
});

// Instance method: Calculate remaining amount
feeSchema.methods.calculateRemainingAmount = function() {
  return Math.max(0, this.amount - this.paidAmount);
};

// Instance method: Mark as paid
feeSchema.methods.markAsPaid = async function(paymentData) {
  this.paidAmount = this.amount;
  this.status = 'paid';
  this.paymentDate = new Date();
  this.paymentMethod = paymentData.paymentMethod || 'cash';
  this.transactionId = paymentData.transactionId || null;
  
  // Add to payment history
  this.paymentHistory.push({
    amount: this.amount,
    paymentDate: this.paymentDate,
    paymentMethod: this.paymentMethod,
    transactionId: this.transactionId,
    receiptNumber: paymentData.receiptNumber || null,
    notes: paymentData.notes || null
  });
  
  await this.save();
  return this;
};

// Instance method: Add payment
feeSchema.methods.addPayment = async function(paymentData) {
  const paymentAmount = paymentData.amount || 0;
  
  if (paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }
  
  if (this.paidAmount + paymentAmount > this.amount) {
    throw new Error('Payment amount exceeds total fee amount');
  }
  
  this.paidAmount += paymentAmount;
  
  // Update status
  if (this.paidAmount >= this.amount) {
    this.status = 'paid';
    this.paymentDate = new Date();
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  }
  
  this.paymentMethod = paymentData.paymentMethod || this.paymentMethod;
  this.transactionId = paymentData.transactionId || this.transactionId;
  
  // Add to payment history
  this.paymentHistory.push({
    amount: paymentAmount,
    paymentDate: new Date(),
    paymentMethod: paymentData.paymentMethod || 'cash',
    transactionId: paymentData.transactionId || null,
    receiptNumber: paymentData.receiptNumber || null,
    notes: paymentData.notes || null
  });
  
  await this.save();
  return this;
};

// Static method: Find by student
feeSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId }).sort({ dueDate: 1 });
};

// Static method: Find overdue fees
feeSchema.statics.findOverdue = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.find({
    dueDate: { $lt: today },
    status: { $in: ['pending', 'partial'] }
  }).populate('student', 'firstName lastName email');
};

// Static method: Get fee statistics
feeSchema.statics.getFeeStatistics = async function(academicYear, semester) {
  const matchStage = {};
  if (academicYear) matchStage.academicYear = academicYear;
  if (semester) matchStage.semester = semester;
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalPaid: { $sum: '$paidAmount' }
      }
    }
  ]);
  
  const totalFees = await this.countDocuments(matchStage);
  const totalAmount = await this.aggregate([
    { $match: matchStage },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalPaid = await this.aggregate([
    { $match: matchStage },
    { $group: { _id: null, total: { $sum: '$paidAmount' } } }
  ]);
  
  return {
    totalFees,
    totalAmount: totalAmount[0]?.total || 0,
    totalPaid: totalPaid[0]?.total || 0,
    totalPending: (totalAmount[0]?.total || 0) - (totalPaid[0]?.total || 0),
    byStatus: stats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount,
        totalPaid: item.totalPaid
      };
      return acc;
    }, {})
  };
};

// Pre-save middleware: Update status based on due date
feeSchema.pre('save', function(next) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (this.dueDate < today && this.status !== 'paid') {
    this.status = 'overdue';
  }
  
  next();
});

// Indexes
feeSchema.index({ student: 1, academicYear: 1 });
feeSchema.index({ dueDate: 1 });
feeSchema.index({ status: 1 });
feeSchema.index({ feeType: 1 });

module.exports = mongoose.model('Fee', feeSchema);

