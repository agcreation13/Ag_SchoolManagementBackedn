const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  },
  gradeType: {
    type: String,
    enum: ['assignment', 'exam', 'quiz', 'project', 'participation', 'final'],
    required: [true, 'Grade type is required']
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative']
  },
  maxScore: {
    type: Number,
    required: [true, 'Maximum score is required'],
    min: [0, 'Maximum score cannot be negative']
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'],
    default: null,
    required: false
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  gradedAt: {
    type: Date,
    default: Date.now
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required']
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer'],
    default: 'Fall'
  }
}, {
  timestamps: true
});

// Calculate percentage and letter grade before save
gradeSchema.pre('save', function(next) {
  if (this.maxScore > 0 && this.score !== undefined) {
    this.percentage = (this.score / this.maxScore) * 100;
    
    // Calculate letter grade
    if (this.percentage >= 97) this.letterGrade = 'A+';
    else if (this.percentage >= 93) this.letterGrade = 'A';
    else if (this.percentage >= 90) this.letterGrade = 'A-';
    else if (this.percentage >= 87) this.letterGrade = 'B+';
    else if (this.percentage >= 83) this.letterGrade = 'B';
    else if (this.percentage >= 80) this.letterGrade = 'B-';
    else if (this.percentage >= 77) this.letterGrade = 'C+';
    else if (this.percentage >= 73) this.letterGrade = 'C';
    else if (this.percentage >= 70) this.letterGrade = 'C-';
    else if (this.percentage >= 67) this.letterGrade = 'D+';
    else if (this.percentage >= 63) this.letterGrade = 'D';
    else if (this.percentage >= 60) this.letterGrade = 'D-';
    else if (this.percentage >= 0) this.letterGrade = 'F';
    else this.letterGrade = null;
  }
  next();
});

// Indexes
gradeSchema.index({ student: 1 });
gradeSchema.index({ class: 1 });
gradeSchema.index({ teacher: 1 });
gradeSchema.index({ academicYear: 1, semester: 1 });
gradeSchema.index({ gradeType: 1 });

module.exports = mongoose.model('Grade', gradeSchema);

