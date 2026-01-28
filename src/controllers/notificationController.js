const Notification = require('../models/Notification');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const emailService = require('../utils/emailService');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { isRead, type, recipient } = req.query;
    
    // Admins can see all notifications or filter by recipient
    // Regular users only see their own notifications
    const query = {};
    
    if (req.user.role === 'admin') {
      // Admin can see all notifications or filter by specific recipient
      if (recipient) {
        query.recipient = recipient;
      }
    } else {
      // Regular users only see their own notifications
      query.recipient = req.user.id;
    }
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('recipient', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate unread count based on user role
    const unreadQuery = req.user.role === 'admin' 
      ? (recipient ? { recipient, isRead: false } : { isRead: false })
      : { recipient: req.user.id, isRead: false };
    
    const unreadCount = await Notification.countDocuments(unreadQuery);

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notification (Admin/System)
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, message, type, recipient, link, metadata } = req.body;

    const notification = await Notification.create({
      title,
      message,
      type: type || 'info',
      recipient,
      link,
      metadata: metadata || {}
    });

    // Send email notification if enabled
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
      try {
        const recipientUser = await User.findById(recipient);
        if (recipientUser && recipientUser.email) {
          await emailService.sendNotificationEmail(recipientUser.email, {
            title,
            message,
            link: link ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}${link}` : null
          });
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification (Admin)
// @route   PUT /api/notifications/:id
// @access  Private/Admin
exports.updateNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const { title, message, type, recipient, link, metadata } = req.body;

    if (title) notification.title = title;
    if (message) notification.message = message;
    if (type) notification.type = type;
    if (recipient) notification.recipient = recipient;
    if (link !== undefined) notification.link = link;
    if (metadata) notification.metadata = metadata;

    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

