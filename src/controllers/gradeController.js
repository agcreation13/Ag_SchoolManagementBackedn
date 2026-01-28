const Grade = require('../models/Grade');
const Class = require('../models/Class');

// @desc    Get all grades
// @route   GET /api/grades
// @access  Private
exports.getGrades = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let query = {};

    // Students see only their grades, Teachers see grades for their classes
    if (role === 'student') {
      query.student = id;
    } else if (role === 'parent') {
      // Parents see only their children's grades
      const User = require('../models/User');
      const user = await User.findById(id).select('children');
      const childrenIds = user?.children?.map(c => c.studentId) || [];
      
      if (childrenIds.length === 0) {
        // No children linked, return empty result
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      query.student = { $in: childrenIds };
    } else if (role === 'teacher') {
      const teacherClasses = await Class.find({ teacher: id }).select('_id');
      query.class = { $in: teacherClasses.map(c => c._id) };
    }

    const grades = await Grade.find(query)
      .populate('student', 'firstName lastName email username')
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName email')
      .populate('assignment', 'title')
      .populate('exam', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get grades for a student
// @route   GET /api/grades/student/:studentId
// @access  Private (Teacher, Admin, Parent - own child)
exports.getStudentGrades = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { role, id } = req.user;

    // Students can only see their own grades
    if (role === 'student' && studentId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view other students\' grades'
      });
    }

    // Parents can only see their own children's grades
    if (role === 'parent') {
      const User = require('../models/User');
      const user = await User.findById(id).select('children');
      const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
      
      if (!isChild) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student\'s grades'
        });
      }
    }

    const grades = await Grade.find({ student: studentId })
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName email')
      .populate('assignment', 'title')
      .populate('exam', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get grades for a class
// @route   GET /api/grades/class/:classId
// @access  Private (Teacher, Admin)
exports.getClassGrades = async (req, res, next) => {
  try {
    const grades = await Grade.find({ class: req.params.classId })
      .populate('student', 'firstName lastName email username')
      .populate('teacher', 'firstName lastName email')
      .populate('assignment', 'title')
      .populate('exam', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create grade
// @route   POST /api/grades
// @access  Private (Teacher, Admin)
exports.createGrade = async (req, res, next) => {
  try {
    req.body.teacher = req.user.id;
    const grade = await Grade.create(req.body);

    res.status(201).json({
      success: true,
      data: grade
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update grade
// @route   PUT /api/grades/:id
// @access  Private (Teacher - own grades, Admin)
exports.updateGrade = async (req, res, next) => {
  try {
    let grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Teachers can only update their own grades
    if (req.user.role === 'teacher' && grade.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this grade'
      });
    }

    grade = await Grade.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('student', 'firstName lastName email username')
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName email');

    res.json({
      success: true,
      data: grade
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete grade
// @route   DELETE /api/grades/:id
// @access  Private (Admin only)
exports.deleteGrade = async (req, res, next) => {
  try {
    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    await grade.deleteOne();

    res.json({
      success: true,
      message: 'Grade deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

