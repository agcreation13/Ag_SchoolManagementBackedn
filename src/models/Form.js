const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: ['admission', 'leave', 'feedback', 'complaint', 'suggestion'],
    required: [true, 'Form type is required']
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitted by is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  fields: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'date', 'select', 'file', 'number', 'email', 'phone'],
      required: true
    },
    value: mongoose.Schema.Types.Mixed,
    required: {
      type: Boolean,
      default: false
    },
    label: String,
    options: [String] // For select type
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_progress'],
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
    maxlength: [1000, 'Review comments cannot exceed 1000 characters']
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Instance method: Submit form
formSchema.methods.submit = async function() {
  this.status = 'pending';
  await this.save();
  return this;
};

// Instance method: Approve form
formSchema.methods.approve = async function(reviewerId, comments = '') {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  await this.save();
  return this;
};

// Instance method: Reject form
formSchema.methods.reject = async function(reviewerId, comments = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  await this.save();
  return this;
};

// Static method: Find by type
formSchema.statics.findByType = function(formType) {
  return this.find({ formType })
    .populate('submittedBy', 'firstName lastName email')
    .populate('student', 'firstName lastName email')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method: Find by status
formSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('submittedBy', 'firstName lastName email')
    .populate('student', 'firstName lastName email')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method: Find by student
formSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId })
    .populate('submittedBy', 'firstName lastName email')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Indexes
formSchema.index({ formType: 1, status: 1 });
formSchema.index({ submittedBy: 1, createdAt: -1 });
formSchema.index({ student: 1, createdAt: -1 });
formSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('Form', formSchema);

