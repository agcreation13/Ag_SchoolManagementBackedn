const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: [true, 'Day is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  room: {
    type: String,
    trim: true
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
  recurring: {
    type: Boolean,
    default: true
  },
  exceptions: [{
    date: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    isCancelled: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Static method: Get today's schedule
timetableSchema.statics.getTodaySchedule = function(classId = null) {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = dayNames[today.getDay()];
  
  const query = {
    day: todayDay,
    isActive: true,
    $or: [
      { exceptions: { $size: 0 } },
      {
        exceptions: {
          $not: {
            $elemMatch: {
              date: {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999))
              },
              isCancelled: true
            }
          }
        }
      }
    ]
  };
  
  if (classId) {
    query.class = classId;
  }
  
  return this.find(query)
    .populate('class', 'name code')
    .populate('teacher', 'firstName lastName')
    .sort({ startTime: 1 });
};

// Static method: Get weekly schedule
timetableSchema.statics.getWeeklySchedule = function(classId, weekStart = null) {
  const query = {
    isActive: true,
    class: classId
  };
  
  if (weekStart) {
    // Filter exceptions for the week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    query.$or = [
      { exceptions: { $size: 0 } },
      {
        exceptions: {
          $not: {
            $elemMatch: {
              date: { $gte: weekStart, $lt: weekEnd },
              isCancelled: true
            }
          }
        }
      }
    ];
  }
  
  return this.find(query)
    .populate('class', 'name code')
    .populate('teacher', 'firstName lastName')
    .sort({ day: 1, startTime: 1 });
};

// Static method: Find by class
timetableSchema.statics.findByClass = function(classId) {
  return this.find({ class: classId, isActive: true })
    .populate('teacher', 'firstName lastName')
    .sort({ day: 1, startTime: 1 });
};

// Static method: Find by teacher
timetableSchema.statics.findByTeacher = function(teacherId) {
  return this.find({ teacher: teacherId, isActive: true })
    .populate('class', 'name code')
    .sort({ day: 1, startTime: 1 });
};

// Static method: Find by day
timetableSchema.statics.findByDay = function(day, classId = null) {
  const query = { day, isActive: true };
  if (classId) {
    query.class = classId;
  }
  return this.find(query)
    .populate('class', 'name code')
    .populate('teacher', 'firstName lastName')
    .sort({ startTime: 1 });
};

// Indexes
timetableSchema.index({ class: 1, day: 1 });
timetableSchema.index({ teacher: 1, day: 1 });
timetableSchema.index({ academicYear: 1, semester: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);

