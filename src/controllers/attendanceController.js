const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { classId, studentId, date } = req.query;
    let query = {};

    if (classId) query.class = classId;
    if (studentId) query.student = studentId;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Students see only their attendance
    if (role === 'student') {
      query.student = id;
    } else if (role === 'parent') {
      // Parents see only their children's attendance
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

    const attendance = await Attendance.find(query)
      .populate('student', 'firstName lastName email username')
      .populate('class', 'name code')
      .select('-markedBy')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: attendance.length,
      data: attendance || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark attendance
// @route   POST /api/attendance
// @access  Private (Teacher, Admin)
exports.markAttendance = async (req, res, next) => {
  try {
    req.body.markedBy = req.user.id;
    
    // Check if attendance already exists for this student, class, and date
    const existing = await Attendance.findOne({
      student: req.body.student,
      class: req.body.class,
      date: new Date(req.body.date).setHours(0, 0, 0, 0)
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this date'
      });
    }

    const attendance = await Attendance.create(req.body);

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this date'
      });
    }
    next(error);
  }
};

// @desc    Update attendance
// @route   PUT /api/attendance/:id
// @access  Private (Teacher, Admin)
exports.updateAttendance = async (req, res, next) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('student', 'firstName lastName email username')
      .populate('class', 'name code')
      .select('-markedBy');

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attendance
// @route   DELETE /api/attendance/:id
// @access  Private (Admin only)
exports.deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await attendance.deleteOne();

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark bulk attendance
// @route   POST /api/attendance/bulk
// @access  Private (Teacher, Admin)
exports.markBulkAttendance = async (req, res, next) => {
  try {
    const { classId, date, attendanceList, academicYear, semester } = req.body;
    
    if (!classId || !date || !attendanceList || !Array.isArray(attendanceList)) {
      return res.status(400).json({
        success: false,
        message: 'Class ID, date, and attendance list are required'
      });
    }

    const markedBy = req.user.id;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(attendanceDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Check for existing attendance records
    const existingRecords = await Attendance.find({
      class: classId,
      date: { $gte: attendanceDate, $lt: nextDate }
    }).select('student');

    const existingStudentIds = existingRecords.map(r => r.student.toString());
    
    // Prepare bulk attendance records
    const attendanceRecords = [];
    const errors = [];

    for (const item of attendanceList) {
      if (existingStudentIds.includes(item.studentId)) {
        errors.push({
          studentId: item.studentId,
          message: 'Attendance already marked for this date'
        });
        continue;
      }

      attendanceRecords.push({
        student: item.studentId,
        class: classId,
        date: attendanceDate,
        status: item.status || 'present',
        markedBy: markedBy,
        notes: item.notes || '',
        academicYear: academicYear || new Date().getFullYear().toString(),
        semester: semester || 'Fall'
      });
    }

    if (attendanceRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No new attendance records to create',
        errors: errors
      });
    }

    // Insert bulk attendance
    const created = await Attendance.insertMany(attendanceRecords, { ordered: false });

    res.status(201).json({
      success: true,
      count: created.length,
      data: created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Some attendance records already exist'
      });
    }
    next(error);
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats/:studentId
// @access  Private
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { classId, academicYear, semester } = req.query;

    let query = { student: studentId };
    if (classId) query.class = classId;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const attendance = await Attendance.find(query);
    
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      excused: attendance.filter(a => a.status === 'excused').length,
      attendanceRate: 0
    };

    if (stats.total > 0) {
      stats.attendanceRate = ((stats.present + stats.excused) / stats.total) * 100;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

