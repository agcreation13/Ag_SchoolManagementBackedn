const Class = require('../models/Class');
const User = require('../models/User');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let query = { isActive: true };

    // Teachers see only their classes, Admins see all
    if (role === 'teacher') {
      query.teacher = id;
    }

    const classes = await Class.find(query)
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName email username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: classes.length,
      data: classes || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClass = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName email username');

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.json({
      success: true,
      data: classItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private (Admin, Teacher)
exports.createClass = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    // Set teacher to current user if role is teacher
    if (role === 'teacher') {
      req.body.teacher = id;
    }

    const classItem = await Class.create(req.body);

    res.status(201).json({
      success: true,
      data: classItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private (Admin, Teacher - own classes)
exports.updateClass = async (req, res, next) => {
  try {
    let classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Teachers can only update their own classes
    if (req.user.role === 'teacher' && classItem.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this class'
      });
    }

    classItem = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName email username');

    res.json({
      success: true,
      data: classItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private (Admin only)
exports.deleteClass = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Soft delete
    classItem.isActive = false;
    await classItem.save();

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add student to class
// @route   POST /api/classes/:id/students
// @access  Private (Admin, Teacher)
exports.addStudent = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    // Check if student already in class
    if (classItem.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student already in class'
      });
    }

    // Check class capacity
    if (classItem.currentStudents >= classItem.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Class is full'
      });
    }

    classItem.students.push(studentId);
    await classItem.save();

    res.json({
      success: true,
      data: classItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove student from class
// @route   DELETE /api/classes/:id/students/:studentId
// @access  Private (Admin, Teacher)
exports.removeStudent = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    classItem.students = classItem.students.filter(
      id => id.toString() !== req.params.studentId
    );
    await classItem.save();

    res.json({
      success: true,
      data: classItem
    });
  } catch (error) {
    next(error);
  }
};

