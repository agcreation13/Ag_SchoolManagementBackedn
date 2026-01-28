const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: null
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    answer: String,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
examAttemptSchema.index({ exam: 1 });
examAttemptSchema.index({ user: 1 });
examAttemptSchema.index({ submittedAt: -1 });
examAttemptSchema.index({ isPassed: 1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);

