const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  questionText: {
    type: String,
    required: [true, 'Please provide question text'],
    trim: true,
    minlength: [10, 'Question must be at least 10 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['multiple_choice', 'true_false', 'short_answer']
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: String,
    required: [true, 'Please provide correct answer']
  },
  points: {
    type: Number,
    required: true,
    default: 1,
    min: [1, 'Points must be at least 1']
  },
  explanation: {
    type: String,
    maxlength: [500, 'Explanation cannot exceed 500 characters']
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
questionSchema.index({ examId: 1 });
questionSchema.index({ order: 1 });

module.exports = mongoose.model('Question', questionSchema);

