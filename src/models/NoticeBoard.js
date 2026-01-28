const mongoose = require('mongoose');

const noticeBoardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null // null means all classes (school-wide)
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['announcement', 'reminder', 'event', 'academic', 'general'],
    default: 'general'
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
noticeBoardSchema.index({ class: 1, isActive: 1, createdAt: -1 });
noticeBoardSchema.index({ postedBy: 1 });
noticeBoardSchema.index({ isPinned: 1, createdAt: -1 });
noticeBoardSchema.index({ expiresAt: 1 });
noticeBoardSchema.index({ category: 1 });

module.exports = mongoose.model('NoticeBoard', noticeBoardSchema);

