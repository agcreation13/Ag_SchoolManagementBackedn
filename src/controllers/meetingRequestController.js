const MeetingRequest = require('../models/MeetingRequest');
const User = require('../models/User');
const Class = require('../models/Class');

// @desc    Get all meeting requests
// @route   GET /api/meeting-requests
// @access  Private
exports.getMeetingRequests = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { status } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    
    // Filter by role
    if (role === 'parent') {
      query.parent = id;
    } else if (role === 'teacher') {
      query.teacher = id;
    }
    
    const requests = await MeetingRequest.find(query)
      .populate('parent', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('respondedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create meeting request
// @route   POST /api/meeting-requests
// @access  Private (Parent)
exports.createMeetingRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can create meeting requests'
      });
    }
    
    req.body.parent = req.user.id;
    
    // Verify student is child of parent
    const user = await User.findById(req.user.id).select('children');
    const isChild = user?.children?.some(c => 
      c.studentId.toString() === req.body.student
    );
    
    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'You can only request meetings for your own children'
      });
    }
    
    const meetingRequest = await MeetingRequest.create(req.body);
    
    const populated = await MeetingRequest.findById(meetingRequest._id)
      .populate('parent', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name code');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve meeting request
// @route   PUT /api/meeting-requests/:id/approve
// @access  Private (Teacher, Admin)
exports.approveMeetingRequest = async (req, res, next) => {
  try {
    const meetingRequest = await MeetingRequest.findById(req.params.id)
      .populate('teacher');
    
    if (!meetingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Meeting request not found'
      });
    }
    
    // Check if teacher owns the request
    if (req.user.role === 'teacher' && meetingRequest.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve your own meeting requests'
      });
    }
    
    const { scheduledDate, scheduledTime, location, responseNotes } = req.body;
    
    await meetingRequest.approve(req.user.id, scheduledDate, scheduledTime, location, responseNotes);
    
    const updated = await MeetingRequest.findById(meetingRequest._id)
      .populate('parent', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('respondedBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: updated,
      message: 'Meeting request approved'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule meeting
// @route   PUT /api/meeting-requests/:id/schedule
// @access  Private (Teacher, Admin)
exports.scheduleMeeting = async (req, res, next) => {
  try {
    const meetingRequest = await MeetingRequest.findById(req.params.id);
    
    if (!meetingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Meeting request not found'
      });
    }
    
    const { scheduledDate, scheduledTime, location, meetingType, meetingLink } = req.body;
    
    await meetingRequest.schedule(scheduledDate, scheduledTime, location, meetingType, meetingLink);
    
    const updated = await MeetingRequest.findById(meetingRequest._id)
      .populate('parent', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name code');
    
    res.json({
      success: true,
      data: updated,
      message: 'Meeting scheduled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject meeting request
// @route   PUT /api/meeting-requests/:id/reject
// @access  Private (Teacher, Admin)
exports.rejectMeetingRequest = async (req, res, next) => {
  try {
    const meetingRequest = await MeetingRequest.findById(req.params.id);
    
    if (!meetingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Meeting request not found'
      });
    }
    
    // Check if teacher owns the request
    if (req.user.role === 'teacher' && meetingRequest.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject your own meeting requests'
      });
    }
    
    const { responseNotes } = req.body;
    await meetingRequest.reject(req.user.id, responseNotes);
    
    const updated = await MeetingRequest.findById(meetingRequest._id)
      .populate('parent', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name code')
      .populate('respondedBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: updated,
      message: 'Meeting request rejected'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update meeting notes
// @route   PUT /api/meeting-requests/:id/notes
// @access  Private (Teacher, Admin)
exports.updateMeetingNotes = async (req, res, next) => {
  try {
    const meetingRequest = await MeetingRequest.findById(req.params.id);
    
    if (!meetingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Meeting request not found'
      });
    }
    
    const { meetingNotes } = req.body;
    meetingRequest.meetingNotes = meetingNotes;
    meetingRequest.status = 'completed';
    await meetingRequest.save();
    
    const updated = await MeetingRequest.findById(meetingRequest._id)
      .populate('parent', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('teacher', 'firstName lastName email')
      .populate('class', 'name code');
    
    res.json({
      success: true,
      data: updated,
      message: 'Meeting notes updated'
    });
  } catch (error) {
    next(error);
  }
};

