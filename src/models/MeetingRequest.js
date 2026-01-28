const mongoose = require('mongoose');

const meetingRequestSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Parent is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  preferredDates: [{
    type: Date,
    required: true
  }],
  preferredTime: {
    type: String,
    required: [true, 'Preferred time is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'scheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  scheduledTime: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null,
    trim: true
  },
  meetingType: {
    type: String,
    enum: ['in_person', 'online', 'phone'],
    default: 'in_person'
  },
  meetingLink: {
    type: String,
    default: null
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  },
  responseNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Response notes cannot exceed 500 characters']
  },
  meetingNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Meeting notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes
meetingRequestSchema.index({ parent: 1, status: 1 });
meetingRequestSchema.index({ teacher: 1, status: 1 });
meetingRequestSchema.index({ student: 1 });
meetingRequestSchema.index({ status: 1, createdAt: -1 });
meetingRequestSchema.index({ scheduledDate: 1 });

// Instance method: Approve meeting
meetingRequestSchema.methods.approve = async function(teacherId, scheduledDate, scheduledTime, location, notes = '') {
  this.status = 'approved';
  this.respondedBy = teacherId;
  this.respondedAt = new Date();
  this.scheduledDate = scheduledDate;
  this.scheduledTime = scheduledTime;
  this.location = location;
  this.responseNotes = notes;
  await this.save();
  return this;
};

// Instance method: Schedule meeting
meetingRequestSchema.methods.schedule = async function(scheduledDate, scheduledTime, location, meetingType, meetingLink = null) {
  this.status = 'scheduled';
  this.scheduledDate = scheduledDate;
  this.scheduledTime = scheduledTime;
  this.location = location;
  this.meetingType = meetingType;
  this.meetingLink = meetingLink;
  await this.save();
  return this;
};

// Instance method: Reject meeting
meetingRequestSchema.methods.reject = async function(teacherId, notes = '') {
  this.status = 'rejected';
  this.respondedBy = teacherId;
  this.respondedAt = new Date();
  this.responseNotes = notes;
  await this.save();
  return this;
};

module.exports = mongoose.model('MeetingRequest', meetingRequestSchema);

