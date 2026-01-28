const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const User = require('../models/User');

// @desc    Create timetable entry
// @route   POST /api/timetable
// @access  Private (Admin, Teacher)
exports.createTimetable = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    // Teachers can only create timetables for their own classes
    if (role === 'teacher') {
      const classExists = await Class.findOne({ _id: req.body.class, teacher: id });
      if (!classExists) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create timetable for this class'
        });
      }
    }
    
    const timetable = await Timetable.create(req.body);
    
    const populated = await Timetable.findById(timetable._id)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all timetables
// @route   GET /api/timetable
// @access  Private
exports.getTimetables = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { classId, teacherId, day, academicYear, semester } = req.query;
    
    let query = {};
    
    if (classId) query.class = classId;
    if (teacherId) query.teacher = teacherId;
    if (day) query.day = day;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    // Teachers see only their timetables
    if (role === 'teacher') {
      query.teacher = id;
    } else if (role === 'student') {
      // Students see only timetables for their classes
      const classes = await Class.find({ students: id }).select('_id');
      const classIds = classes.map(c => c._id);
      
      if (classIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      query.class = { $in: classIds };
      query.isActive = true;
    }
    
    const timetables = await Timetable.find(query)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ day: 1, startTime: 1 });
    
    res.json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get timetable by ID
// @route   GET /api/timetable/:id
// @access  Private
exports.getTimetableById = async (req, res, next) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName');
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update timetable
// @route   PUT /api/timetable/:id
// @access  Private (Admin, Teacher)
exports.updateTimetable = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    const timetable = await Timetable.findById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    // Teachers can only update their own timetables
    if (role === 'teacher' && timetable.teacher.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this timetable'
      });
    }
    
    const updated = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('class', 'name code').populate('teacher', 'firstName lastName');
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete timetable
// @route   DELETE /api/timetable/:id
// @access  Private (Admin, Teacher)
exports.deleteTimetable = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    const timetable = await Timetable.findById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    // Teachers can only delete their own timetables
    if (role === 'teacher' && timetable.teacher.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this timetable'
      });
    }
    
    await Timetable.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's schedule
// @route   GET /api/timetable/today
// @access  Private
exports.getTodaySchedule = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { classId } = req.query;
    
    let schedule;
    
    if (role === 'teacher') {
      // Get teacher's classes
      const classes = await Class.find({ teacher: id }).select('_id');
      const classIds = classes.map(c => c._id);
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[today.getDay()];
      
      schedule = await Timetable.find({
        day: todayDay,
        isActive: true,
        class: { $in: classIds }
      })
        .populate('class', 'name code')
        .populate('teacher', 'firstName lastName')
        .sort({ startTime: 1 });
    } else if (role === 'student') {
      // Get student's classes
      const classes = await Class.find({ students: id }).select('_id');
      const classIds = classes.map(c => c._id);
      
      if (classIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[today.getDay()];
      
      schedule = await Timetable.find({
        day: todayDay,
        isActive: true,
        class: { $in: classIds }
      })
        .populate('class', 'name code')
        .populate('teacher', 'firstName lastName')
        .sort({ startTime: 1 });
    } else {
      schedule = await Timetable.getTodaySchedule(classId);
    }
    
    res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly schedule
// @route   GET /api/timetable/weekly
// @access  Private
exports.getWeeklySchedule = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { classId, weekStart } = req.query;
    
    let schedule;
    
    if (role === 'teacher') {
      const classes = await Class.find({ teacher: id }).select('_id');
      const classIds = classes.map(c => c._id);
      schedule = await Timetable.find({ class: { $in: classIds }, isActive: true })
        .populate('class', 'name code')
        .populate('teacher', 'firstName lastName')
        .sort({ day: 1, startTime: 1 });
    } else if (role === 'student') {
      const classes = await Class.find({ students: id }).select('_id');
      const classIds = classes.map(c => c._id);
      
      if (classIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      schedule = await Timetable.find({ class: { $in: classIds }, isActive: true })
        .populate('class', 'name code')
        .populate('teacher', 'firstName lastName')
        .sort({ day: 1, startTime: 1 });
    } else {
      schedule = await Timetable.getWeeklySchedule(classId, weekStart ? new Date(weekStart) : null);
    }
    
    res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get schedule by class
// @route   GET /api/timetable/class/:classId
// @access  Private
exports.getScheduleByClass = async (req, res, next) => {
  try {
    const schedule = await Timetable.findByClass(req.params.classId);
    
    res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get schedule by teacher
// @route   GET /api/timetable/teacher/:teacherId
// @access  Private
exports.getScheduleByTeacher = async (req, res, next) => {
  try {
    const schedule = await Timetable.findByTeacher(req.params.teacherId);
    
    res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get schedule by student
// @route   GET /api/timetable/student/:studentId
// @access  Private
exports.getScheduleByStudent = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    // Authorization check
    if (role === 'student' && studentId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Get student's classes
    const classes = await Class.find({ students: studentId }).select('_id');
    const classIds = classes.map(c => c._id);
    
    const schedule = await Timetable.find({ class: { $in: classIds }, isActive: true })
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ day: 1, startTime: 1 });
    
    res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

