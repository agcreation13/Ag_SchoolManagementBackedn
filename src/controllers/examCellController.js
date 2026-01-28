const ExamTimetable = require('../models/ExamTimetable');
const MarksSubmission = require('../models/MarksSubmission');
const Exam = require('../models/Exam');
const Grade = require('../models/Grade');
const ExamAttempt = require('../models/ExamAttempt');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { createAuditLog } = require('../middleware/auditLog');

// @desc    Get exam cell dashboard stats
// @route   GET /api/examcell/dashboard
// @access  Private (Exam Cell)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const now = new Date();
    const totalExams = await Exam.countDocuments();
    const activeExams = await Exam.countDocuments({ isActive: true });
    
    // Ongoing exams (started but not ended)
    const ongoingExams = await Exam.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: { $gte: now } },
        { endDate: null }
      ]
    }).select('title startDate endDate').sort({ startDate: 1 });
    
    // Upcoming exams (not started yet)
    const upcomingExams = await Exam.find({
      isActive: true,
      startDate: { $gte: now }
    }).select('title startDate endDate').sort({ startDate: 1 });
    
    const marksSubmissions = await MarksSubmission.find();
    const totalSubmissions = marksSubmissions.length;
    const submitted = marksSubmissions.filter(m => m.status === 'submitted' || m.status === 'verified').length;
    const pending = marksSubmissions.filter(m => m.status === 'pending').length;
    const late = marksSubmissions.filter(m => m.status === 'late').length;
    
    // Exams pending result publication
    const examsWithVerifiedMarks = await MarksSubmission.distinct('exam', { status: 'verified' });
    const allActiveExams = await Exam.find({ isActive: true }).select('_id');
    const examsPendingPublication = allActiveExams.filter(e => 
      !examsWithVerifiedMarks.includes(e._id.toString())
    ).length;
    
    // Pass/Fail Rate and Average Marks
    const examAttempts = await ExamAttempt.find()
      .populate('exam', 'passingScore');
    const totalAttempts = examAttempts.length;
    const passed = examAttempts.filter(a => 
      a.score >= (a.exam?.passingScore || 0)
    ).length;
    const failed = totalAttempts - passed;
    const passRate = totalAttempts > 0 
      ? Math.round((passed / totalAttempts) * 100 * 100) / 100 
      : 0;
    const averageMarks = totalAttempts > 0
      ? examAttempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
      : 0;
    
    const publishedTimetables = await ExamTimetable.countDocuments({ isPublished: true });
    const unpublishedTimetables = await ExamTimetable.countDocuments({ isPublished: false });
    
    res.json({
      success: true,
      data: {
        totalExams,
        activeExams,
        ongoingExams: ongoingExams.map(e => ({
          id: e._id,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate
        })),
        upcomingExams: upcomingExams.map(e => ({
          id: e._id,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate
        })),
        marksSubmissions: {
          total: totalSubmissions,
          submitted,
          pending,
          late,
          submittedPercentage: totalSubmissions > 0 ? Math.round((submitted / totalSubmissions) * 100 * 100) / 100 : 0
        },
        timetables: {
          published: publishedTimetables,
          unpublished: unpublishedTimetables
        },
        performance: {
          passRate: passRate,
          failRate: totalAttempts > 0 ? Math.round((failed / totalAttempts) * 100 * 100) / 100 : 0,
          averageMarks: Math.round(averageMarks * 100) / 100,
          totalAttempts: totalAttempts,
          passed: passed,
          failed: failed
        },
        examsPendingPublication: examsPendingPublication
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create exam timetable
// @route   POST /api/examcell/timetable
// @access  Private (Exam Cell)
exports.createExamTimetable = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const timetable = await ExamTimetable.create(req.body);
    
    const populated = await ExamTimetable.findById(timetable._id)
      .populate('exam', 'title')
      .populate('invigilator', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam timetables
// @route   GET /api/examcell/timetable
// @access  Private (Exam Cell)
exports.getExamTimetables = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const { examId, date, isPublished, academicYear, semester } = req.query;
    let query = {};
    
    if (examId) query.exam = examId;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const timetables = await ExamTimetable.find(query)
      .populate('exam', 'title')
      .populate('invigilator', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });
    
    res.json({
      success: true,
      count: timetables.length,
      data: timetables
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update exam timetable
// @route   PUT /api/examcell/timetable/:id
// @access  Private (Exam Cell)
exports.updateExamTimetable = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const timetable = await ExamTimetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('exam', 'title')
      .populate('invigilator', 'firstName lastName');
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    // Audit log
    await createAuditLog(req, 'update', 'timetable', timetable._id, {
      changes: req.body
    });
    
    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    await createAuditLog(req, 'update', 'timetable', req.params.id, {}, 'error');
    next(error);
  }
};

// @desc    Delete exam timetable
// @route   DELETE /api/examcell/timetable/:id
// @access  Private (Exam Cell)
exports.deleteExamTimetable = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const timetable = await ExamTimetable.findById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    await ExamTimetable.findByIdAndDelete(req.params.id);
    
    // Audit log
    await createAuditLog(req, 'delete', 'timetable', req.params.id, {
      exam: timetable.exam,
      date: timetable.date
    });
    
    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    await createAuditLog(req, 'delete', 'timetable', req.params.id, {}, 'error');
    next(error);
  }
};

// @desc    Publish timetable
// @route   PUT /api/examcell/timetable/:id/publish
// @access  Private (Exam Cell)
exports.publishTimetable = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const timetable = await ExamTimetable.findByIdAndUpdate(
      req.params.id,
      {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: req.user.id
      },
      { new: true }
    ).populate('exam', 'title')
     .populate('invigilator', 'firstName lastName');
    
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }
    
    // Audit log
    await createAuditLog(req, 'publish', 'timetable', timetable._id, {
      exam: timetable.exam,
      date: timetable.date
    });
    
    res.json({
      success: true,
      message: 'Timetable published successfully',
      data: timetable
    });
  } catch (error) {
    await createAuditLog(req, 'publish', 'timetable', req.params.id, {}, 'error');
    next(error);
  }
};

// @desc    Get marks submissions
// @route   GET /api/examcell/marks-submissions
// @access  Private (Exam Cell)
exports.getMarksSubmissions = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const { examId, teacherId, classId, status } = req.query;
    let query = {};
    
    if (examId) query.exam = examId;
    if (teacherId) query.teacher = teacherId;
    if (classId) query.class = classId;
    if (status) query.status = status;
    
    const submissions = await MarksSubmission.find(query)
      .populate('exam', 'title')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name code')
      .sort({ dueDate: 1 });
    
    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get marks submission by ID
// @route   GET /api/examcell/marks-submissions/:id
// @access  Private (Exam Cell)
exports.getMarksSubmissionById = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const submission = await MarksSubmission.findById(req.params.id)
      .populate('exam', 'title')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name code')
      .populate('marksData.student', 'firstName lastName email');
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Marks submission not found'
      });
    }
    
    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify marks submission
// @route   PUT /api/examcell/marks-submissions/:id/verify
// @access  Private (Exam Cell)
exports.verifyMarksSubmission = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const { comments } = req.body;
    const submission = await MarksSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Marks submission not found'
      });
    }
    
    await submission.verify(req.user.id, comments);
    
    // Audit log
    await createAuditLog(req, 'verify', 'marks_submission', submission._id, {
      exam: submission.exam,
      teacher: submission.teacher,
      comments: comments
    });
    
    // Notify teacher
    await Notification.create({
      recipient: submission.teacher,
      sender: req.user.id,
      title: 'Marks Submission Verified',
      message: `Your marks submission for ${submission.subject} has been verified by the exam cell.`,
      type: 'marks_verification',
      relatedEntity: 'marks_submission',
      relatedEntityId: submission._id
    });
    
    const updated = await MarksSubmission.findById(req.params.id)
      .populate('exam', 'title')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name code');
    
    res.json({
      success: true,
      message: 'Marks submission verified',
      data: updated
    });
  } catch (error) {
    await createAuditLog(req, 'verify', 'marks_submission', req.params.id, {}, 'error');
    next(error);
  }
};

// @desc    Publish results
// @route   POST /api/examcell/results/publish
// @access  Private (Exam Cell)
exports.publishResults = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { examId } = req.body;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Verify all marks are submitted and verified
    const submissions = await MarksSubmission.find({ exam: examId });
    const allVerified = submissions.every(s => s.status === 'verified');
    
    if (!allVerified) {
      return res.status(400).json({
        success: false,
        message: 'Not all marks submissions are verified'
      });
    }
    
    // Update exam status
    await Exam.findByIdAndUpdate(examId, { isActive: false });
    
    // Audit log
    await createAuditLog(req, 'publish', 'result', examId, {
      examTitle: exam.title,
      submissionsCount: submissions.length
    });
    
    // Notify all students who took the exam
    const examAttempts = await ExamAttempt.find({ exam: examId }).distinct('user');
    const notifications = examAttempts.map(studentId => ({
      recipient: studentId,
      sender: req.user.id,
      title: 'Exam Results Published',
      message: `Results for ${exam.title} have been published. You can now view your results.`,
      type: 'result_published',
      relatedEntity: 'exam',
      relatedEntityId: examId
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    res.json({
      success: true,
      message: 'Results published successfully'
    });
  } catch (error) {
    await createAuditLog(req, 'publish', 'result', req.body.examId, {}, 'error');
    next(error);
  }
};

// @desc    Get pending submissions
// @route   GET /api/examcell/marks-submissions/pending
// @access  Private (Exam Cell)
exports.getPendingSubmissions = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const submissions = await MarksSubmission.find({ status: 'pending' })
      .populate('exam', 'title')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name code')
      .sort({ dueDate: 1 });
    
    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get late submissions
// @route   GET /api/examcell/marks-submissions/late
// @access  Private (Exam Cell)
exports.getLateSubmissions = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const submissions = await MarksSubmission.find({ status: 'late' })
      .populate('exam', 'title')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name code')
      .sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam statistics
// @route   GET /api/examcell/statistics
// @access  Private (Exam Cell)
exports.getExamStatistics = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { examId, academicYear, semester } = req.query;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    let query = {};
    if (examId) query.exam = examId;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const attempts = await ExamAttempt.find(query)
      .populate('student', 'firstName lastName')
      .populate('exam', 'title passingScore');
    
    const totalAttempts = attempts.length;
    const passed = attempts.filter(a => a.score >= (a.exam?.passingScore || 0)).length;
    const failed = totalAttempts - passed;
    const averageScore = attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
      : 0;
    
    res.json({
      success: true,
      data: {
        totalAttempts,
        passed,
        failed,
        passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
        averageScore: Math.round(averageScore * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam calendar
// @route   GET /api/examcell/calendar
// @access  Private (Exam Cell)
exports.getExamCalendar = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { startDate, endDate } = req.query;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    let query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const timetables = await ExamTimetable.find(query)
      .populate('exam', 'title')
      .populate('invigilator', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });
    
    // Group by date
    const calendarData = {};
    timetables.forEach(timetable => {
      const dateKey = timetable.date.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push({
        id: timetable._id,
        exam: timetable.exam?.title || 'N/A',
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        venue: timetable.venue || 'N/A',
        invigilator: timetable.invigilator ? 
          `${timetable.invigilator.firstName} ${timetable.invigilator.lastName}` : 'N/A'
      });
    });
    
    res.json({
      success: true,
      data: calendarData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance charts data
// @route   GET /api/examcell/performance-charts
// @access  Private (Exam Cell)
exports.getPerformanceCharts = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { examId, academicYear, semester } = req.query;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    let query = {};
    if (examId) query.exam = examId;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const attempts = await ExamAttempt.find(query)
      .populate('exam', 'title passingScore')
      .populate('student', 'firstName lastName');
    
    // Grade distribution
    const gradeDistribution = {
      'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
    };
    
    attempts.forEach(attempt => {
      const percentage = attempt.exam?.maxScore > 0 
        ? (attempt.score / attempt.exam.maxScore) * 100 
        : 0;
      
      if (percentage >= 90) gradeDistribution['A+']++;
      else if (percentage >= 80) gradeDistribution['A']++;
      else if (percentage >= 75) gradeDistribution['B+']++;
      else if (percentage >= 70) gradeDistribution['B']++;
      else if (percentage >= 65) gradeDistribution['C+']++;
      else if (percentage >= 60) gradeDistribution['C']++;
      else if (percentage >= 50) gradeDistribution['D']++;
      else gradeDistribution['F']++;
    });
    
    // Performance by exam
    const examPerformance = await ExamAttempt.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$exam',
          averageScore: { $avg: '$score' },
          totalAttempts: { $sum: 1 },
          passed: {
            $sum: {
              $cond: [
                { $gte: ['$score', { $ifNull: ['$passingScore', 0] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: '_id',
          foreignField: '_id',
          as: 'examInfo'
        }
      },
      {
        $unwind: '$examInfo'
      },
      {
        $project: {
          examTitle: '$examInfo.title',
          averageScore: { $round: ['$averageScore', 2] },
          totalAttempts: 1,
          passed: 1,
          passRate: {
            $round: [
              { $multiply: [{ $divide: ['$passed', '$totalAttempts'] }, 100] },
              2
            ]
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        gradeDistribution: Object.entries(gradeDistribution).map(([grade, count]) => ({
          grade,
          count
        })),
        examPerformance: examPerformance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export marksheet
// @route   GET /api/examcell/export/marksheet
// @access  Private (Exam Cell)
exports.exportMarksheet = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { examId, format = 'json' } = req.query;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const submissions = await MarksSubmission.find({ exam: examId, status: 'verified' })
      .populate('marksData.student', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('exam', 'title');
    
    // Format marksheet data
    const marksheetData = {
      exam: submissions[0]?.exam?.title || 'N/A',
      generatedAt: new Date(),
      students: []
    };
    
    submissions.forEach(submission => {
      submission.marksData.forEach(mark => {
        const score = mark.marks || mark.score || 0;
        const maxScore = mark.maxMarks || mark.maxScore || 0;
        marksheetData.students.push({
          studentId: mark.student?._id,
          studentName: mark.student ? 
            `${mark.student.firstName} ${mark.student.lastName}` : 'N/A',
          email: mark.student?.email || 'N/A',
          class: submission.class?.name || 'N/A',
          score: score,
          maxScore: maxScore,
          percentage: maxScore > 0 
            ? Math.round((score / maxScore) * 100 * 100) / 100 
            : 0,
          grade: mark.grade || 'N/A'
        });
      });
    });
    
    res.json({
      success: true,
      data: marksheetData,
      format: format
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam forms
// @route   GET /api/examcell/forms
// @access  Private (Exam Cell)
exports.getExamForms = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'examcell' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const Form = require('../models/Form');
    const forms = await Form.find({
      formType: { $in: ['revaluation', 'backlog'] }
    })
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: forms.length,
      data: forms
    });
  } catch (error) {
    next(error);
  }
};

