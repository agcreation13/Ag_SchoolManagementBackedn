const Message = require('../models/Message');

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const messageData = {
      ...req.body,
      sender: req.user.id
    };
    
    const message = await Message.create(messageData);
    
    const populated = await Message.findById(message._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { type, relatedTo } = req.query;
    
    let query = {
      $or: [
        { sender: id },
        { recipient: id }
      ],
      isArchived: false
    };
    
    if (type) query.messageType = type;
    if (relatedTo) query.relatedTo = relatedTo;
    
    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
exports.getMessageById = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('parentMessage')
      .populate('replies');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Authorization check
    const { id } = req.user;
    if (message.sender._id.toString() !== id && message.recipient._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message'
      });
    }
    
    // Mark as read if recipient
    if (message.recipient._id.toString() === id && !message.isRead) {
      await message.markAsRead();
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update message
// @route   PUT /api/messages/:id
// @access  Private
exports.updateMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only sender can update
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this message'
      });
    }
    
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('sender', 'firstName lastName email avatar')
     .populate('recipient', 'firstName lastName email avatar');
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Sender or recipient can delete
    if (message.sender.toString() !== req.user.id && message.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    await Message.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inbox
// @route   GET /api/messages/inbox
// @access  Private
exports.getInbox = async (req, res, next) => {
  try {
    const messages = await Message.getInbox(req.user.id);
    
    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sent messages
// @route   GET /api/messages/sent
// @access  Private
exports.getSent = async (req, res, next) => {
  try {
    const messages = await Message.getSent(req.user.id);
    
    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation
// @route   GET /api/messages/conversation/:userId
// @access  Private
exports.getConversation = async (req, res, next) => {
  try {
    const messages = await Message.findConversation(req.user.id, req.params.userId);
    
    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only recipient can mark as read
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await message.markAsRead();
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all messages as read
// @route   PUT /api/messages/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Message.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'All messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to message
// @route   POST /api/messages/:id/reply
// @access  Private
exports.replyToMessage = async (req, res, next) => {
  try {
    const parentMessage = await Message.findById(req.params.id);
    
    if (!parentMessage) {
      return res.status(404).json({
        success: false,
        message: 'Parent message not found'
      });
    }
    
    // Determine recipient (opposite of sender)
    const recipient = parentMessage.sender.toString() === req.user.id 
      ? parentMessage.recipient 
      : parentMessage.sender;
    
    const replyData = {
      ...req.body,
      sender: req.user.id,
      recipient: recipient,
      parentMessage: req.params.id,
      messageType: parentMessage.messageType
    };
    
    const reply = await Message.create(replyData);
    
    // Add reply to parent message
    parentMessage.replies.push(reply._id);
    await parentMessage.save();
    
    const populated = await Message.findById(reply._id)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('parentMessage');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.id,
      isRead: false,
      isArchived: false
    });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};

