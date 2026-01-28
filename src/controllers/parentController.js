const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');

// @desc    Get all children
// @route   GET /api/parent/children
// @access  Private (Parent)
exports.getChildren = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const user = await User.findById(id).select('children').populate('children.studentId', 'firstName lastName email username avatar role');
    
    if (!user || !user.children || user.children.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    res.json({
      success: true,
      count: user.children.length,
      data: user.children
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child profile
// @route   GET /api/parent/children/:studentId
// @access  Private (Parent)
exports.getChildProfile = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this student'
      });
    }
    
    const student = await User.findById(studentId)
      .select('firstName lastName email username avatar phone role isActive');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child attendance
// @route   GET /api/parent/children/:studentId/attendance
// @access  Private (Parent)
exports.getChildAttendance = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    const { startDate, endDate, academicYear, semester } = req.query;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    let query = { student: studentId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const attendance = await Attendance.find(query)
      .populate('class', 'name code subject')
      .sort({ date: -1 });
    
    // Calculate attendance percentage
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    
    res.json({
      success: true,
      count: attendance.length,
      data: attendance,
      statistics: {
        total,
        present,
        absent: attendance.filter(a => a.status === 'absent').length,
        late: attendance.filter(a => a.status === 'late').length,
        excused: attendance.filter(a => a.status === 'excused').length,
        percentage: Math.round(percentage * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child grades
// @route   GET /api/parent/children/:studentId/grades
// @access  Private (Parent)
exports.getChildGrades = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const grades = await Grade.find({ student: studentId })
      .populate('class', 'name code subject')
      .populate('assignment', 'title')
      .populate('exam', 'title')
      .populate('teacher', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Calculate GPA
    const validGrades = grades.filter(g => g.percentage !== null && g.percentage !== undefined);
    const totalPercentage = validGrades.reduce((sum, g) => sum + g.percentage, 0);
    const gpa = validGrades.length > 0 ? totalPercentage / validGrades.length : 0;
    
    res.json({
      success: true,
      count: grades.length,
      data: grades,
      statistics: {
        gpa: Math.round(gpa * 100) / 100,
        totalGrades: grades.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child fees
// @route   GET /api/parent/children/:studentId/fees
// @access  Private (Parent)
exports.getChildFees = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const fees = await Fee.findByStudent(studentId);
    
    const totalDue = fees
      .filter(f => f.status !== 'paid')
      .reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);
    
    res.json({
      success: true,
      count: fees.length,
      data: fees,
      statistics: {
        totalDue,
        pendingCount: fees.filter(f => f.status === 'pending').length,
        overdueCount: fees.filter(f => f.status === 'overdue').length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child assignments
// @route   GET /api/parent/children/:studentId/assignments
// @access  Private (Parent)
exports.getChildAssignments = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Get student's classes
    const Class = require('../models/Class');
    const classes = await Class.find({ students: studentId }).select('_id');
    const classIds = classes.map(c => c._id);
    
    const assignments = await Assignment.find({ class: { $in: classIds } })
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ dueDate: 1 });
    
    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child notifications
// @route   GET /api/parent/children/:studentId/notifications
// @access  Private (Parent)
exports.getChildNotifications = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const notifications = await Notification.find({ recipient: studentId })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child notices
// @route   GET /api/parent/children/:studentId/notices
// @access  Private (Parent)
exports.getChildNotices = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const NoticeBoard = require('../models/NoticeBoard');
    const Class = require('../models/Class');
    
    // Get student's classes
    const classes = await Class.find({ students: studentId }).select('_id');
    const classIds = classes.map(c => c._id);
    
    // Get notices for student's classes or school-wide
    const notices = await NoticeBoard.find({
      isActive: true,
      $or: [
        { class: { $in: classIds } },
        { class: null }
      ],
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } }
      ]
    }).lean()
      .populate('postedBy', 'firstName lastName')
      .populate('class', 'name code')
      .sort({ isPinned: -1, createdAt: -1 });
    
    const unreadCount = notices.filter(n => !n.viewCount || n.viewCount === 0).length;
    
    res.json({
      success: true,
      count: notices.length,
      unreadCount: unreadCount,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child fee payment history
// @route   GET /api/parent/children/:studentId/fees/history
// @access  Private (Parent)
exports.getChildFeeHistory = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const fees = await Fee.findByStudent(studentId);
    
    // Extract payment history from all fees
    const paymentHistory = [];
    fees.forEach(fee => {
      if (fee.paymentHistory && fee.paymentHistory.length > 0) {
        fee.paymentHistory.forEach(payment => {
          paymentHistory.push({
            feeId: fee._id,
            feeType: fee.feeType,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            receiptNumber: payment.receiptNumber,
            notes: payment.notes
          });
        });
      }
    });
    
    // Sort by payment date (newest first)
    paymentHistory.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    
    res.json({
      success: true,
      count: paymentHistory.length,
      data: paymentHistory
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child attendance breakdown (daily/monthly)
// @route   GET /api/parent/children/:studentId/attendance/breakdown
// @access  Private (Parent)
exports.getChildAttendanceBreakdown = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    const { period = 'monthly' } = req.query; // 'daily' or 'monthly'
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const attendance = await Attendance.find({ student: studentId })
      .populate('class', 'name code subject')
      .sort({ date: -1 });
    
    let breakdown = [];
    
    if (period === 'daily') {
      // Daily breakdown (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyData = await Attendance.aggregate([
        {
          $match: {
            student: new mongoose.Types.ObjectId(studentId),
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
            },
            absent: {
              $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
            },
            late: {
              $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
            },
            total: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      breakdown = dailyData.map(item => ({
        date: item._id,
        present: item.present,
        absent: item.absent,
        late: item.late,
        total: item.total,
        percentage: item.total > 0 ? Math.round((item.present / item.total) * 100 * 100) / 100 : 0
      }));
    } else {
      // Monthly breakdown
      const monthlyData = await Attendance.aggregate([
        {
          $match: {
            student: new mongoose.Types.ObjectId(studentId)
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
            },
            absent: {
              $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
            },
            late: {
              $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
            },
            total: { $sum: 1 }
          }
        },
        {
          $sort: { _id: -1 }
        }
      ]);
      
      breakdown = monthlyData.map(item => ({
        month: item._id,
        present: item.present,
        absent: item.absent,
        late: item.late,
        total: item.total,
        percentage: item.total > 0 ? Math.round((item.present / item.total) * 100 * 100) / 100 : 0
      }));
    }
    
    res.json({
      success: true,
      period: period,
      count: breakdown.length,
      data: breakdown
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get child alerts (low attendance, upcoming exams)
// @route   GET /api/parent/children/:studentId/alerts
// @access  Private (Parent)
exports.getChildAlerts = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify parent-child relationship
    const user = await User.findById(id).select('children');
    const isChild = user?.children?.some(c => c.studentId.toString() === studentId);
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const alerts = [];
    
    // Check for low attendance
    const attendance = await Attendance.find({ student: studentId });
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => 
      a.status === 'present' || a.status === 'excused'
    ).length;
    const attendancePercentage = totalDays > 0
      ? (presentDays / totalDays) * 100
      : 0;
    
    if (attendancePercentage < 75 && totalDays > 0) {
      alerts.push({
        type: 'low_attendance',
        severity: 'high',
        title: 'Low Attendance Alert',
        message: `Your child's attendance is ${attendancePercentage.toFixed(1)}%, which is below the 75% threshold.`,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      });
    }
    
    // Check for upcoming exams (next 7 days)
    const Exam = require('../models/Exam');
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const now = new Date();
    
    const upcomingExams = await Exam.find({
      isActive: true,
      startDate: {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    }).select('title startDate endDate').sort({ startDate: 1 });
    
    if (upcomingExams.length > 0) {
      alerts.push({
        type: 'upcoming_exam',
        severity: 'medium',
        title: 'Upcoming Exams',
        message: `${upcomingExams.length} exam(s) scheduled in the next 7 days.`,
        exams: upcomingExams.map(e => ({
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate
        }))
      });
    }
    
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Link child to parent
// @route   POST /api/parent/children/link
// @access  Private (Parent, Admin)
exports.linkChild = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId, relationship } = req.body;
    
    if (role !== 'parent' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    const user = await User.findById(id);
    
    // Check if already linked
    const alreadyLinked = user.children?.some(c => c.studentId.toString() === studentId);
    if (alreadyLinked) {
      return res.status(400).json({
        success: false,
        message: 'Child already linked'
      });
    }
    
    // Add child
    if (!user.children) {
      user.children = [];
    }
    
    user.children.push({
      studentId: studentId,
      relationship: relationship || 'ward',
      isPrimary: user.children.length === 0
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Child linked successfully',
      data: user.children
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unlink child from parent
// @route   DELETE /api/parent/children/:studentId/unlink
// @access  Private (Parent, Admin)
exports.unlinkChild = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { studentId } = req.params;
    
    if (role !== 'parent' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user.children || user.children.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No children linked'
      });
    }
    
    user.children = user.children.filter(c => c.studentId.toString() !== studentId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Child unlinked successfully'
    });
  } catch (error) {
    next(error);
  }
};

