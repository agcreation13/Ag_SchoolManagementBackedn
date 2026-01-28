const Grade = require('../models/Grade');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');

// @desc    Generate marksheet PDF
// @route   GET /api/marksheet/:studentId
// @access  Private
exports.generateMarksheet = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { role, id } = req.user;
    const { academicYear, semester } = req.query;

    // Check access permissions
    if (role === 'student' && studentId !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own marksheet'
      });
    }

    // Get student information
    const student = await User.findById(studentId).select('firstName lastName email username');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build query for grades
    let gradeQuery = { student: studentId };
    if (academicYear) gradeQuery.academicYear = academicYear;
    if (semester) gradeQuery.semester = semester;

    // Get all grades
    const grades = await Grade.find(gradeQuery)
      .populate('class', 'name code subject')
      .populate('assignment', 'title')
      .populate('exam', 'title')
      .sort({ createdAt: 1 });

    // Get attendance statistics
    let attendanceQuery = { student: studentId };
    if (academicYear) attendanceQuery.academicYear = academicYear;
    if (semester) attendanceQuery.semester = semester;

    const attendanceRecords = await Attendance.find(attendanceQuery);
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => 
      a.status === 'present' || a.status === 'excused'
    ).length;
    const attendancePercentage = totalDays > 0
      ? Math.round((presentDays / totalDays) * 100 * 100) / 100
      : 0;

    // Calculate GPA and average
    let totalScore = 0;
    let totalMaxScore = 0;
    grades.forEach(grade => {
      totalScore += grade.score || 0;
      totalMaxScore += grade.maxScore || 0;
    });
    const averageMarks = totalMaxScore > 0
      ? Math.round((totalScore / totalMaxScore) * 100 * 100) / 100
      : 0;
    const gpa = averageMarks > 0
      ? Math.round((averageMarks / 100) * 4 * 100) / 100
      : 0;

    // Prepare marksheet data
    const marksheetData = {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        username: student.username
      },
      academicYear: academicYear || 'All Years',
      semester: semester || 'All Semesters',
      grades: grades.map(g => ({
        class: g.class?.name || 'N/A',
        subject: g.class?.subject || 'N/A',
        assignment: g.assignment?.title || g.exam?.title || 'N/A',
        score: g.score || 0,
        maxScore: g.maxScore || 0,
        percentage: g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100 * 100) / 100 : 0,
        letterGrade: g.letterGrade || 'N/A',
        date: g.createdAt
      })),
      statistics: {
        totalGrades: grades.length,
        averageMarks: averageMarks,
        gpa: gpa,
        attendancePercentage: attendancePercentage,
        totalAttendanceDays: totalDays,
        presentDays: presentDays
      }
    };

    res.json({
      success: true,
      data: marksheetData
    });
  } catch (error) {
    next(error);
  }
};

