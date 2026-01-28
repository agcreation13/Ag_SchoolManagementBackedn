const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an exam title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  duration: {
    type: Number,
    required: [true, 'Please provide exam duration'],
    min: [1, 'Duration must be at least 1 minute']
  },
  totalQuestions: {
    type: Number,
    required: false,
    default: 0,
    min: [0, 'Total questions cannot be negative']
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  passingScore: {
    type: Number,
    required: true,
    default: 60,
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
examSchema.index({ createdBy: 1 });
examSchema.index({ isActive: 1 });
examSchema.index({ startDate: 1 });
examSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Exam', examSchema);

