const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: [true, 'Attendance record is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  requestedDate: {
    type: Date,
    required: [true, 'Requested date is required']
  },
  currentStatus: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  requestedStatus: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: [true, 'Requested status is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  supportingDocuments: [{
    filename: String,
    url: String,
    fileType: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Review comments cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes
attendanceCorrectionSchema.index({ student: 1, status: 1 });
attendanceCorrectionSchema.index({ attendance: 1 });
attendanceCorrectionSchema.index({ class: 1, status: 1 });
attendanceCorrectionSchema.index({ status: 1, createdAt: -1 });

// Instance method: Approve correction
attendanceCorrectionSchema.methods.approve = async function(reviewerId, comments = '') {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  
  // Update the attendance record
  const Attendance = require('./Attendance');
  await Attendance.findByIdAndUpdate(this.attendance, {
    status: this.requestedStatus
  });
  
  await this.save();
  return this;
};

// Instance method: Reject correction
attendanceCorrectionSchema.methods.reject = async function(reviewerId, comments = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  await this.save();
  return this;
};

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);

