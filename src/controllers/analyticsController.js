const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const User = require('../models/User');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');

// @desc    Get advanced analytics
// @route   GET /api/analytics
// @access  Private (Admin)
exports.getAdvancedAnalytics = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { startDate, endDate, academicYear, semester } = req.query;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Attendance Trends
    const attendanceTrends = await Attendance.aggregate([
      {
        $match: {
          ...dateFilter,
          ...(academicYear && { academicYear }),
          ...(semester && { semester })
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$date' }
          },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Grade Trends
    const gradeTrends = await Grade.aggregate([
      {
        $match: {
          ...dateFilter,
          ...(academicYear && { academicYear }),
          ...(semester && { semester })
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          averageScore: { $avg: '$percentage' },
          count: { $sum: 1 },
          maxScore: { $max: '$percentage' },
          minScore: { $min: '$percentage' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fee Collection Trends
    const feeTrends = await Fee.aggregate([
      {
        $match: {
          ...dateFilter,
          ...(academicYear && { academicYear }),
          ...(semester && { semester })
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Student Performance by Class
    const classPerformance = await Grade.aggregate([
      {
        $match: {
          ...dateFilter,
          ...(academicYear && { academicYear }),
          ...(semester && { semester })
        }
      },
      {
        $group: {
          _id: '$class',
          averageScore: { $avg: '$percentage' },
          studentCount: { $addToSet: '$student' },
          totalGrades: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $unwind: '$classInfo'
      },
      {
        $project: {
          className: '$classInfo.name',
          averageScore: { $round: ['$averageScore', 2] },
          studentCount: { $size: '$studentCount' },
          totalGrades: 1
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Exam Performance Analysis
    const examPerformance = await ExamAttempt.aggregate([
      {
        $match: dateFilter
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'exam',
          foreignField: '_id',
          as: 'examInfo'
        }
      },
      {
        $unwind: '$examInfo'
      },
      {
        $group: {
          _id: '$exam',
          examTitle: { $first: '$examInfo.title' },
          averageScore: { $avg: '$score' },
          passRate: {
            $avg: {
              $cond: [
                { $gte: ['$score', { $ifNull: ['$examInfo.passingScore', 0] }] },
                1,
                0
              ]
            }
          },
          totalAttempts: { $sum: 1 },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' }
        }
      },
      {
        $project: {
          examTitle: 1,
          averageScore: { 
            $round: [
              {
                $cond: [
                  { $gt: ['$totalAttempts', 0] },
                  { $divide: [{ $multiply: ['$averageScore', 100] }, { $max: ['$maxScore', 1] }] },
                  0
                ]
              },
              2
            ]
          },
          passRate: { $round: [{ $multiply: ['$passRate', 100] }, 2] },
          totalAttempts: 1,
          maxScore: 1,
          minScore: 1
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    // Predictive Analytics - Attendance Prediction
    const recentAttendance = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          presentRate: {
            $avg: {
              $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate trend
    let attendanceTrend = 'stable';
    if (recentAttendance.length >= 2) {
      const recent = recentAttendance.slice(-7).reduce((sum, a) => sum + a.presentRate, 0) / 7;
      const previous = recentAttendance.slice(-14, -7).reduce((sum, a) => sum + a.presentRate, 0) / 7;
      if (recent > previous + 0.05) attendanceTrend = 'improving';
      else if (recent < previous - 0.05) attendanceTrend = 'declining';
    }

    // Student Growth Analysis
    const studentGrowth = await User.aggregate([
      {
        $match: {
          role: 'student',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        attendanceTrends,
        gradeTrends,
        feeTrends,
        classPerformance,
        examPerformance,
        attendancePrediction: {
          trend: attendanceTrend,
          recentAverage: recentAttendance.length > 0
            ? Math.round(recentAttendance.slice(-7).reduce((sum, a) => sum + a.presentRate, 0) / 7 * 100)
            : 0
        },
        studentGrowth
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard analytics summary
// @route   GET /api/analytics/summary
// @access  Private (Admin)
exports.getAnalyticsSummary = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Current vs Last Month Attendance
    const currentMonthAttendance = await Attendance.countDocuments({
      date: {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: now
      }
    });

    const lastMonthAttendance = await Attendance.countDocuments({
      date: {
        $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
        $lte: lastMonth
      }
    });

    // Current vs Last Year Student Growth
    const currentYearStudents = await User.countDocuments({
      role: 'student',
      createdAt: {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lte: now
      }
    });

    const lastYearStudents = await User.countDocuments({
      role: 'student',
      createdAt: {
        $gte: new Date(lastYear.getFullYear(), 0, 1),
        $lte: lastYear
      }
    });

    // Fee Collection Comparison
    const currentMonthFees = await Fee.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: now
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' }
        }
      }
    ]);

    const lastMonthFees = await Fee.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            $lte: lastMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        attendance: {
          current: currentMonthAttendance,
          previous: lastMonthAttendance,
          change: lastMonthAttendance > 0
            ? Math.round(((currentMonthAttendance - lastMonthAttendance) / lastMonthAttendance) * 100)
            : 0
        },
        students: {
          current: currentYearStudents,
          previous: lastYearStudents,
          change: lastYearStudents > 0
            ? Math.round(((currentYearStudents - lastYearStudents) / lastYearStudents) * 100)
            : 0
        },
        fees: {
          current: currentMonthFees[0]?.total || 0,
          previous: lastMonthFees[0]?.total || 0,
          change: lastMonthFees[0]?.total > 0
            ? Math.round(((currentMonthFees[0]?.total - lastMonthFees[0]?.total) / lastMonthFees[0]?.total) * 100)
            : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

