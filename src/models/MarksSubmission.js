const mongoose = require('mongoose');

const marksSubmissionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  submittedAt: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'late', 'verified'],
    default: 'pending'
  },
  marksData: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    marks: {
      type: Number,
      required: true,
      min: 0
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters']
    }
  }],
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verificationComments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Verification comments cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Pre-save middleware: Update status based on submission
marksSubmissionSchema.pre('save', function(next) {
  if (this.submittedAt) {
    if (this.submittedAt > this.dueDate) {
      this.status = 'late';
    } else {
      this.status = 'submitted';
    }
  }
  next();
});

// Instance method: Verify submission
marksSubmissionSchema.methods.verify = async function(verifiedBy, comments = '') {
  this.status = 'verified';
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  this.verificationComments = comments;
  await this.save();
  return this;
};

// Indexes
marksSubmissionSchema.index({ exam: 1, teacher: 1 });
marksSubmissionSchema.index({ exam: 1, class: 1 });
marksSubmissionSchema.index({ status: 1, dueDate: 1 });
marksSubmissionSchema.index({ teacher: 1, status: 1 });

module.exports = mongoose.model('MarksSubmission', marksSubmissionSchema);

