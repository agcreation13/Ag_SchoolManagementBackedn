const AttendanceCorrection = require('../models/AttendanceCorrection');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

// @desc    Get all attendance correction requests
// @route   GET /api/attendance-corrections
// @access  Private
exports.getAttendanceCorrections = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { status, classId } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (classId) query.class = classId;
    
    // Students see only their requests
    if (role === 'student') {
      query.student = id;
    } else if (role === 'teacher') {
      // Teachers see requests for their classes
      const teacherClasses = await Class.find({ teacher: id }).select('_id');
      query.class = { $in: teacherClasses.map(c => c._id) };
    }
    
    const corrections = await AttendanceCorrection.find(query)
      .populate('student', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('attendance', 'date status')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: corrections.length,
      data: corrections
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create attendance correction request
// @route   POST /api/attendance-corrections
// @access  Private (Student)
exports.createAttendanceCorrection = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can request attendance corrections'
      });
    }
    
    const { attendanceId, requestedStatus, reason, supportingDocuments } = req.body;
    
    // Get the attendance record
    const attendance = await Attendance.findById(attendanceId)
      .populate('class');
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    // Check if student owns this attendance record
    if (attendance.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only request corrections for your own attendance'
      });
    }
    
    // Check if request already exists
    const existing = await AttendanceCorrection.findOne({
      attendance: attendanceId,
      status: 'pending'
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A pending correction request already exists for this attendance record'
      });
    }
    
    const correction = await AttendanceCorrection.create({
      student: req.user.id,
      attendance: attendanceId,
      class: attendance.class._id,
      requestedDate: attendance.date,
      currentStatus: attendance.status,
      requestedStatus: requestedStatus,
      reason: reason,
      supportingDocuments: supportingDocuments || []
    });
    
    const populated = await AttendanceCorrection.findById(correction._id)
      .populate('student', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('attendance', 'date status');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve attendance correction
// @route   PUT /api/attendance-corrections/:id/approve
// @access  Private (Teacher, Admin)
exports.approveCorrection = async (req, res, next) => {
  try {
    const correction = await AttendanceCorrection.findById(req.params.id)
      .populate('class');
    
    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction request not found'
      });
    }
    
    // Check if teacher owns the class
    if (req.user.role === 'teacher' && correction.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve corrections for your own classes'
      });
    }
    
    const { reviewComments } = req.body;
    await correction.approve(req.user.id, reviewComments);
    
    const updated = await AttendanceCorrection.findById(correction._id)
      .populate('student', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('attendance', 'date status')
      .populate('reviewedBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: updated,
      message: 'Attendance correction approved and attendance record updated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject attendance correction
// @route   PUT /api/attendance-corrections/:id/reject
// @access  Private (Teacher, Admin)
exports.rejectCorrection = async (req, res, next) => {
  try {
    const correction = await AttendanceCorrection.findById(req.params.id)
      .populate('class');
    
    if (!correction) {
      return res.status(404).json({
        success: false,
        message: 'Correction request not found'
      });
    }
    
    // Check if teacher owns the class
    if (req.user.role === 'teacher' && correction.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject corrections for your own classes'
      });
    }
    
    const { reviewComments } = req.body;
    await correction.reject(req.user.id, reviewComments);
    
    const updated = await AttendanceCorrection.findById(correction._id)
      .populate('student', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('attendance', 'date status')
      .populate('reviewedBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: updated,
      message: 'Attendance correction rejected'
    });
  } catch (error) {
    next(error);
  }
};

