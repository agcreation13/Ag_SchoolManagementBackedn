const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  messageType: {
    type: String,
    enum: ['direct', 'class', 'announcement'],
    default: 'direct'
  },
  relatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedToModel'
  },
  relatedToModel: {
    type: String,
    enum: ['Class', 'Assignment', 'Exam', null]
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
    },
    fileSize: {
      type: Number,
      required: true
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]
}, {
  timestamps: true
});

// Instance method: Mark as read
messageSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

// Instance method: Mark as unread
messageSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  await this.save();
  return this;
};

// Instance method: Archive
messageSchema.methods.archive = async function() {
  this.isArchived = true;
  await this.save();
  return this;
};

// Static method: Find conversation
messageSchema.statics.findConversation = function(senderId, recipientId) {
  return this.find({
    $or: [
      { sender: senderId, recipient: recipientId },
      { sender: recipientId, recipient: senderId }
    ],
    isArchived: false
  })
    .populate('sender', 'firstName lastName email avatar')
    .populate('recipient', 'firstName lastName email avatar')
    .sort({ createdAt: 1 });
};

// Static method: Find unread messages
messageSchema.statics.findUnread = function(userId) {
  return this.find({
    recipient: userId,
    isRead: false,
    isArchived: false
  })
    .populate('sender', 'firstName lastName email avatar')
    .sort({ createdAt: -1 });
};

// Static method: Get inbox
messageSchema.statics.getInbox = function(userId) {
  return this.find({
    recipient: userId,
    isArchived: false
  })
    .populate('sender', 'firstName lastName email avatar')
    .sort({ createdAt: -1 });
};

// Static method: Get sent messages
messageSchema.statics.getSent = function(userId) {
  return this.find({
    sender: userId,
    isArchived: false
  })
    .populate('recipient', 'firstName lastName email avatar')
    .sort({ createdAt: -1 });
};

// Indexes
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ parentMessage: 1 });

module.exports = mongoose.model('Message', messageSchema);

