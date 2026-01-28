const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [100, 'Class name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Class code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Class code cannot exceed 20 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  gradeLevel: {
    type: String,
    required: [true, 'Grade level is required'],
    enum: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
  },
  schedule: {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: String,
    endTime: String,
    room: String
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
  isActive: {
    type: Boolean,
    default: true
  },
  maxStudents: {
    type: Number,
    default: 30
  },
  currentStudents: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
classSchema.index({ code: 1 }, { unique: true });
classSchema.index({ teacher: 1 });
classSchema.index({ academicYear: 1 });
classSchema.index({ isActive: 1 });

// Update currentStudents count before save
classSchema.pre('save', function(next) {
  if (this.isModified('students')) {
    this.currentStudents = this.students.length;
  }
  next();
});

module.exports = mongoose.model('Class', classSchema);

