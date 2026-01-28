const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Notification = require('../models/Notification');
const Fee = require('../models/Fee');
const Form = require('../models/Form');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    // Base statistics (available to all)
    const stats = {
      totalStudents: 0,
      totalClasses: 0,
      totalAssignments: 0,
      totalExams: 0,
      totalAttendance: 0,
      pendingNotifications: 0,
      recentActivities: [],
      upcomingAssignments: [],
      upcomingExams: []
    };

    // Teacher-specific stats
    if (userRole === 'teacher') {
      // Get teacher's classes
      const teacherClasses = await Class.find({ teacher: userId }).select('_id students');
      const teacherClassIds = teacherClasses.map(c => c._id);
      const teacherStudentIds = teacherClasses.flatMap(c => c.students || []);
      
      // % Attendance Marked Today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      
      const totalStudentsInClasses = teacherStudentIds.length;
      const attendanceMarkedToday = await Attendance.countDocuments({
        class: { $in: teacherClassIds },
        date: { $gte: todayStart, $lt: todayEnd }
      });
      stats.attendanceMarkedTodayPercentage = totalStudentsInClasses > 0
        ? Math.round((attendanceMarkedToday / totalStudentsInClasses) * 100 * 100) / 100
        : 0;
      
      // Assignments Pending Grading
      const assignmentsWithSubmissions = await Assignment.find({
        teacher: userId,
        'submissions.status': 'submitted'
      }).select('submissions');
      
      let pendingGradingCount = 0;
      assignmentsWithSubmissions.forEach(assignment => {
        const ungraded = assignment.submissions.filter(s => s.status === 'submitted');
        pendingGradingCount += ungraded.length;
      });
      stats.assignmentsPendingGrading = pendingGradingCount;
      
      // Class Average Marks
      const grades = await Grade.find({
        class: { $in: teacherClassIds }
      }).select('score maxScore');
      
      if (grades.length > 0) {
        const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
        const totalMaxScore = grades.reduce((sum, g) => sum + (g.maxScore || 0), 0);
        stats.classAverageMarks = totalMaxScore > 0
          ? Math.round((totalScore / totalMaxScore) * 100 * 100) / 100
          : 0;
      } else {
        stats.classAverageMarks = 0;
      }
      
      // Students with Low Attendance Alert
      const studentAttendanceStats = await Attendance.aggregate([
        {
          $match: {
            student: { $in: teacherStudentIds },
            class: { $in: teacherClassIds }
          }
        },
        {
          $group: {
            _id: '$student',
            totalDays: { $sum: 1 },
            presentDays: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            attendancePercentage: {
              $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100]
            }
          }
        },
        {
          $match: {
            attendancePercentage: { $lt: 75 }
          }
        }
      ]);
      
      stats.studentsWithLowAttendance = studentAttendanceStats.length;
      
      // Get low attendance student details
      const lowAttendanceStudentIds = studentAttendanceStats.map(s => s._id);
      const lowAttendanceStudents = await User.find({
        _id: { $in: lowAttendanceStudentIds }
      }).select('firstName lastName email');
      
      stats.lowAttendanceStudentsList = lowAttendanceStudents.map(s => ({
        id: s._id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email
      }));
    }

    // Admin and Teacher see all stats
    if (userRole === 'admin' || userRole === 'teacher') {
      stats.totalStudents = await User.countDocuments({ role: 'student', isActive: true });
      stats.totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
      stats.totalClasses = await Class.countDocuments();
      stats.totalAssignments = await Assignment.countDocuments();
      stats.totalExams = await Exam.countDocuments({ isActive: true });
      stats.totalAttendance = await Attendance.countDocuments();

      // Departments count (using unique subjects from classes)
      const uniqueSubjects = await Class.distinct('subject');
      stats.totalDepartments = uniqueSubjects.length;

      // Today's attendance count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      stats.todayAttendance = await Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow }
      });

      // College attendance percentage
      const allAttendance = await Attendance.find();
      const totalAttendanceRecords = allAttendance.length;
      const presentCount = allAttendance.filter(a => a.status === 'present' || a.status === 'excused').length;
      stats.collegeAttendancePercentage = totalAttendanceRecords > 0 
        ? Math.round((presentCount / totalAttendanceRecords) * 100 * 100) / 100 
        : 0;

      // Pending tasks count (forms pending approval)
      stats.pendingTasks = await Form.countDocuments({ status: 'pending' });

      // Teacher attendance completion rate
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      
      const activeClasses = await Class.find({ isActive: true }).populate('teacher');
      const totalClassesToday = activeClasses.length;
      const classesWithAttendance = await Attendance.distinct('class', {
        date: { $gte: todayStart, $lt: todayEnd }
      });
      stats.teacherAttendanceCompletionRate = totalClassesToday > 0
        ? Math.round((classesWithAttendance.length / totalClassesToday) * 100 * 100) / 100
        : 0;

      // Missing student data count (students with incomplete profiles)
      const studentsWithMissingData = await User.countDocuments({
        role: 'student',
        isActive: true,
        $or: [
          { firstName: { $exists: false } },
          { firstName: '' },
          { lastName: { $exists: false } },
          { lastName: '' },
          { email: { $exists: false } },
          { email: '' },
          { phone: { $exists: false } },
          { phone: '' }
        ]
      });
      stats.missingStudentDataCount = studentsWithMissingData;

      // Alerts data
      const pendingForms = await Form.find({ status: 'pending' })
        .populate('submittedBy', 'firstName lastName')
        .populate('student', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('formType title submittedBy student priority createdAt');

      const pendingFees = await Fee.find({ 
        status: { $in: ['pending', 'overdue'] },
        dueDate: { $lte: new Date() }
      })
        .populate('student', 'firstName lastName')
        .sort({ dueDate: 1 })
        .limit(10)
        .select('student feeType amount dueDate status');

      const lowAttendanceStudents = await Attendance.aggregate([
        {
          $group: {
            _id: '$student',
            totalDays: { $sum: 1 },
            presentDays: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            attendancePercentage: {
              $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100]
            }
          }
        },
        {
          $match: {
            attendancePercentage: { $lt: 75 } // Less than 75% attendance
          }
        },
        {
          $limit: 10
        }
      ]);

      const lowAttendanceStudentIds = lowAttendanceStudents.map(s => s._id);
      const lowAttendanceStudentDetails = await User.find({ 
        _id: { $in: lowAttendanceStudentIds } 
      }).select('firstName lastName email');

      stats.alerts = {
        pendingForms: pendingForms.map(f => ({
          id: f._id,
          type: 'form',
          title: `${f.formType} - ${f.title}`,
          submittedBy: f.submittedBy ? `${f.submittedBy.firstName} ${f.submittedBy.lastName}` : 'Unknown',
          student: f.student ? `${f.student.firstName} ${f.student.lastName}` : null,
          priority: f.priority,
          createdAt: f.createdAt
        })),
        pendingFees: pendingFees.map(f => ({
          id: f._id,
          type: 'fee',
          title: `${f.feeType} - ${f.student ? `${f.student.firstName} ${f.student.lastName}` : 'Unknown'}`,
          amount: f.amount - (f.paidAmount || 0),
          dueDate: f.dueDate,
          status: f.status
        })),
        lowAttendance: lowAttendanceStudentDetails.map(s => ({
          id: s._id,
          type: 'attendance',
          title: `Low Attendance - ${s.firstName} ${s.lastName}`,
          student: `${s.firstName} ${s.lastName}`,
          email: s.email
        })),
        errors: [] // Can be populated with system errors if needed
      };

      // Attendance chart data (department-wise)
      const attendanceBySubject = await Attendance.aggregate([
        {
          $lookup: {
            from: 'classes',
            localField: 'class',
            foreignField: '_id',
            as: 'classInfo'
          }
        },
        {
          $unwind: '$classInfo'
        },
        {
          $group: {
            _id: '$classInfo.subject',
            total: { $sum: 1 },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            department: '$_id',
            total: 1,
            present: 1,
            percentage: {
              $multiply: [{ $divide: ['$present', '$total'] }, 100]
            }
          }
        },
        {
          $sort: { percentage: -1 }
        }
      ]);

      stats.attendanceChartData = attendanceBySubject.map(item => ({
        department: item.department || 'Unknown',
        present: item.present,
        absent: item.total - item.present,
        percentage: Math.round(item.percentage * 100) / 100
      }));

      // Overall attendance trend (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayAttendance = await Attendance.countDocuments({
          date: { $gte: date, $lt: nextDate }
        });
        const dayPresent = await Attendance.countDocuments({
          date: { $gte: date, $lt: nextDate },
          status: { $in: ['present', 'excused'] }
        });
        
        last7Days.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          present: dayPresent,
          total: dayAttendance,
          percentage: dayAttendance > 0 ? Math.round((dayPresent / dayAttendance) * 100 * 100) / 100 : 0
        });
      }
      stats.attendanceTrend = last7Days;

      // Recent activities
      const recentAssignments = await Assignment.find()
        .populate('class', 'name')
        .populate('teacher', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title class teacher createdAt status');

      const recentExams = await Exam.find()
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdBy createdAt isActive');

      stats.recentActivities = [
        ...recentAssignments.map(a => ({
          type: 'assignment',
          message: `${a.title} - ${a.class?.name || 'N/A'}`,
          time: a.createdAt,
          status: a.status
        })),
        ...recentExams.map(e => ({
          type: 'exam',
          message: e.title,
          time: e.createdAt,
          status: e.isActive ? 'active' : 'inactive'
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

      // Upcoming assignments
      const now = new Date();
      stats.upcomingAssignments = await Assignment.find({
        dueDate: { $gte: now },
        status: 'published'
      })
        .populate('class', 'name')
        .sort({ dueDate: 1 })
        .limit(5)
        .select('title class dueDate');

      // Upcoming exams
      stats.upcomingExams = await Exam.find({
        $or: [
          { startDate: { $gte: now } },
          { startDate: null, isActive: true }
        ]
      })
        .populate('createdBy', 'firstName lastName')
        .sort({ startDate: 1 })
        .limit(5)
        .select('title startDate endDate isActive');
    } else if (userRole === 'student') {
      // Students see their own stats
      const now = new Date();
      
      // Get student's classes
      const studentClasses = await Class.find({ students: userId }).select('_id');
      const classIds = studentClasses.map(c => c._id);
      
      if (classIds.length === 0) {
        // Student has no classes, return empty stats
        return res.json({
          success: true,
          data: {
            ...stats,
            attendancePercentage: 0,
            averageMarks: 0,
            gpa: 0,
            pendingTasksCount: 0,
            pendingAssignments: [],
            todaysTimetable: [],
            upcomingAssignments: [],
            upcomingExams: [],
            recentActivities: [],
            attendanceTrend: []
          }
        });
      }
      
      stats.totalAssignments = await Assignment.countDocuments({
        class: { $in: classIds },
        status: 'published'
      });
      stats.totalExams = await Exam.countDocuments({
        isActive: true,
        $or: [
          { startDate: { $lte: new Date() } },
          { startDate: null }
        ]
      });
      stats.totalAttendance = await Attendance.countDocuments({ student: userId });

      // Attendance Percentage & Trend
      const allAttendanceRecords = await Attendance.find({ student: userId });
      const totalAttendanceDays = allAttendanceRecords.length;
      const presentDays = allAttendanceRecords.filter(a => 
        a.status === 'present' || a.status === 'excused'
      ).length;
      stats.attendancePercentage = totalAttendanceDays > 0
        ? Math.round((presentDays / totalAttendanceDays) * 100 * 100) / 100
        : 0;

      // Attendance Trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const attendanceTrend = await Attendance.aggregate([
        {
          $match: {
            student: new mongoose.Types.ObjectId(userId),
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            present: {
              $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
            },
            total: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      stats.attendanceTrend = attendanceTrend.map(item => ({
        date: item._id,
        present: item.present,
        total: item.total,
        percentage: item.total > 0 ? Math.round((item.present / item.total) * 100 * 100) / 100 : 0
      }));

      // Pending Assignments (not submitted)
      const allStudentAssignments = await Assignment.find({
        class: { $in: classIds },
        status: 'published'
      }).populate('class', 'name').select('title class dueDate submissions');

      const pendingAssignments = allStudentAssignments.filter(assignment => {
        const submission = assignment.submissions?.find(s => 
          s.student?.toString() === userId
        );
        // Only include assignments that haven't been submitted yet
        return !submission;
      });

      stats.pendingAssignments = pendingAssignments.map(a => ({
        id: a._id,
        title: a.title,
        class: a.class?.name || 'N/A',
        dueDate: a.dueDate,
        isOverdue: new Date(a.dueDate) < new Date()
      }));

      // GPA / Average Marks Calculation
      const allGrades = await Grade.find({ student: userId }).select('score maxScore');
      if (allGrades.length > 0) {
        const totalScore = allGrades.reduce((sum, g) => sum + (g.score || 0), 0);
        const totalMaxScore = allGrades.reduce((sum, g) => sum + (g.maxScore || 0), 0);
        stats.averageMarks = totalMaxScore > 0
          ? Math.round((totalScore / totalMaxScore) * 100 * 100) / 100
          : 0;
        
        // Calculate GPA (assuming 4.0 scale)
        stats.gpa = stats.averageMarks > 0
          ? Math.round((stats.averageMarks / 100) * 4 * 100) / 100
          : 0;
      } else {
        stats.averageMarks = 0;
        stats.gpa = 0;
      }

      // Pending Tasks Count
      const pendingFormsCount = await Form.countDocuments({
        submittedBy: userId,
        status: 'pending'
      });
      stats.pendingTasksCount = pendingAssignments.length + pendingFormsCount;

      // Today's Timetable
      const today = new Date();
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
      const studentClassesForTimetable = await Class.find({
        students: userId,
        isActive: true
      }).populate('teacher', 'firstName lastName').select('name code subject schedule teacher');

      stats.todaysTimetable = studentClassesForTimetable
        .filter(c => c.schedule?.day === dayOfWeek)
        .map(c => ({
          id: c._id,
          name: c.name,
          code: c.code,
          subject: c.subject,
          startTime: c.schedule?.startTime || 'N/A',
          endTime: c.schedule?.endTime || 'N/A',
          room: c.schedule?.room || 'N/A',
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'N/A'
        }))
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      // Recent activities for student
      const studentAssignments = await Assignment.find({
        class: { $in: classIds }
      })
        .populate('class', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title class createdAt status dueDate');

      stats.recentActivities = studentAssignments.map(a => ({
        type: 'assignment',
        message: `${a.title} - ${a.class?.name || 'N/A'}`,
        time: a.createdAt,
        status: a.status,
        dueDate: a.dueDate
      }));

      // Upcoming assignments for student
      stats.upcomingAssignments = await Assignment.find({
        class: { $in: classIds },
        dueDate: { $gte: now },
        status: 'published'
      })
        .populate('class', 'name')
        .sort({ dueDate: 1 })
        .limit(5)
        .select('title class dueDate');

      // Upcoming exams
      stats.upcomingExams = await Exam.find({
        isActive: true,
        $or: [
          { startDate: { $gte: now } },
          { startDate: null }
        ]
      })
        .sort({ startDate: 1 })
        .limit(5)
        .select('title startDate endDate');
    } else if (userRole === 'parent') {
      // Parents see their children's stats
      const now = new Date();
      const user = await User.findById(userId).select('children');
      const childrenIds = user?.children?.map(c => c.studentId) || [];
      
      if (childrenIds.length > 0) {
        // Get first child's data (or aggregate for all children)
        const firstChildId = childrenIds[0];
        
        // Attendance summary
        const attendanceRecords = await Attendance.find({ student: { $in: childrenIds } });
        const totalAttendance = attendanceRecords.length;
        const presentCount = attendanceRecords.filter(a => 
          a.status === 'present' || a.status === 'excused'
        ).length;
        const attendancePercentage = totalAttendance > 0 
          ? Math.round((presentCount / totalAttendance) * 100 * 100) / 100 
          : 0;
        
        // Fee due status
        const fees = await Fee.find({ 
          student: { $in: childrenIds }, 
          status: { $in: ['pending', 'partial', 'overdue'] } 
        });
        const totalDue = fees.reduce((sum, f) => sum + (f.amount - f.paidAmount), 0);
        
        // Unread notices
        const NoticeBoard = require('../models/NoticeBoard');
        const Class = require('../models/Class');
        const studentClasses = await Class.find({ students: { $in: childrenIds } }).select('_id');
        const classIds = studentClasses.map(c => c._id);
        
        const allNotices = await NoticeBoard.find({
          isActive: true,
          $or: [
            { class: { $in: classIds } },
            { class: null }
          ],
          $or: [
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } }
          ]
        });
        
        const unreadNotices = allNotices.filter(n => !n.viewCount || n.viewCount === 0).length;
        
        // Upcoming exams
        stats.upcomingExams = await Exam.find({
          isActive: true,
          $or: [
            { startDate: { $gte: now } },
            { startDate: null }
          ]
        })
          .sort({ startDate: 1 })
          .limit(5)
          .select('title startDate endDate');
        
        // Low attendance alert
        const lowAttendanceThreshold = 75;
        const hasLowAttendance = attendancePercentage < lowAttendanceThreshold && totalAttendance > 0;
        
        // Upcoming exams alert (next 7 days)
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const upcomingExamsCount = await Exam.countDocuments({
          isActive: true,
          startDate: {
            $gte: now,
            $lte: sevenDaysFromNow
          }
        });
        
        stats.attendancePercentage = attendancePercentage;
        stats.totalDue = totalDue;
        stats.unreadNotices = unreadNotices;
        stats.childrenCount = childrenIds.length;
        stats.hasLowAttendanceAlert = hasLowAttendance;
        stats.upcomingExamsAlert = upcomingExamsCount > 0;
        stats.upcomingExamsCount = upcomingExamsCount;
      }
    }

    // Pending notifications count
    const unreadQuery = userRole === 'admin' 
      ? { isRead: false }
      : { recipient: userId, isRead: false };
    stats.pendingNotifications = await Notification.countDocuments(unreadQuery);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

