const NoticeBoard = require('../models/NoticeBoard');
const Class = require('../models/Class');

// @desc    Get all notices
// @route   GET /api/notices
// @access  Private
exports.getNotices = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { classId, category, priority } = req.query;
    
    let query = { isActive: true };
    
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    // Filter by class or show school-wide notices
    if (classId) {
      query.$or = [
        { class: classId },
        { class: null } // School-wide notices
      ];
    } else if (role === 'student') {
      // Students see notices for their classes and school-wide
      const student = await require('../models/User').findById(id).populate('classes');
      const studentClassIds = student.classes?.map(c => c._id) || [];
      query.$or = [
        { class: { $in: studentClassIds } },
        { class: null }
      ];
    } else if (role === 'teacher') {
      // Teachers see notices for their classes and school-wide
      const teacherClasses = await Class.find({ teacher: id }).select('_id');
      query.$or = [
        { class: { $in: teacherClasses.map(c => c._id) } },
        { class: null }
      ];
    }
    
    // Check expiration
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gte: new Date() } }
    ];
    
    const notices = await NoticeBoard.find(query)
      .populate('postedBy', 'firstName lastName')
      .populate('class', 'name code')
      .sort({ isPinned: -1, createdAt: -1 });
    
    res.json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
// @access  Private
exports.getNotice = async (req, res, next) => {
  try {
    const notice = await NoticeBoard.findById(req.params.id)
      .populate('postedBy', 'firstName lastName')
      .populate('class', 'name code');
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    // Increment view count
    notice.viewCount += 1;
    await notice.save();
    
    res.json({
      success: true,
      data: notice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notice
// @route   POST /api/notices
// @access  Private (Teacher, Admin)
exports.createNotice = async (req, res, next) => {
  try {
    req.body.postedBy = req.user.id;
    
    const notice = await NoticeBoard.create(req.body);
    
    const populated = await NoticeBoard.findById(notice._id)
      .populate('postedBy', 'firstName lastName')
      .populate('class', 'name code');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private (Teacher, Admin)
exports.updateNotice = async (req, res, next) => {
  try {
    let notice = await NoticeBoard.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    // Check ownership
    if (req.user.role === 'teacher' && notice.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own notices'
      });
    }
    
    notice = await NoticeBoard.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('postedBy', 'firstName lastName')
      .populate('class', 'name code');
    
    res.json({
      success: true,
      data: notice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Teacher, Admin)
exports.deleteNotice = async (req, res, next) => {
  try {
    const notice = await NoticeBoard.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    // Check ownership
    if (req.user.role === 'teacher' && notice.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own notices'
      });
    }
    
    await notice.deleteOne();
    
    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

