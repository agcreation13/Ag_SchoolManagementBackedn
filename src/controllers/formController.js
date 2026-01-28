const Form = require('../models/Form');
const mongoose = require('mongoose');

// Helper function to validate and sanitize student field
const sanitizeStudentField = (student) => {
  // If student is empty, null, or undefined, return null
  if (!student || student === '' || student === 'null' || student === 'undefined') {
    return null;
  }
  
  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(student)) {
    return student;
  }
  
  // Otherwise, return null (invalid value)
  return null;
};

// @desc    Create form
// @route   POST /api/forms
// @access  Private
exports.createForm = async (req, res, next) => {
  try {
    const formData = {
      ...req.body,
      submittedBy: req.user.id,
      student: sanitizeStudentField(req.body.student)
    };
    
    const form = await Form.create(formData);
    
    const populated = await Form.findById(form._id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email');
    
    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all forms
// @route   GET /api/forms
// @access  Private
exports.getForms = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { formType, status, studentId } = req.query;
    
    let query = {};
    
    // Students see forms assigned to them or to all students
    if (role === 'student') {
      query.$or = [
        { student: null }, // Forms assigned to all students
        { student: id }, // Forms assigned to this specific student
        { submittedBy: id } // Forms submitted by this student
      ];
    } else if (role === 'parent') {
      // Parents see forms assigned to all parents or to their children
      const User = require('../models/User');
      const user = await User.findById(id).select('children');
      const childrenIds = user?.children?.map(c => c.studentId) || [];
      
      if (childrenIds.length > 0) {
        query.$or = [
          { student: null }, // Forms assigned to all parents/students
          { student: { $in: childrenIds } } // Forms assigned to their children
        ];
      } else {
        // If parent has no children, only show forms assigned to all
        query.student = null;
      }
    } else {
      // For admin/teacher, allow filtering by studentId if provided
      if (studentId) {
        query.student = studentId;
      }
    }
    
    if (formType) query.formType = formType;
    if (status) query.status = status;
    
    const forms = await Form.find(query)
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName')
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

// @desc    Get form by ID
// @route   GET /api/forms/:id
// @access  Private
exports.getFormById = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    // Authorization check
    const { role, id } = req.user;
    if (role === 'student' && form.submittedBy.toString() !== id && form.student?.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this form'
      });
    }
    
    res.json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update form
// @route   PUT /api/forms/:id
// @access  Private
exports.updateForm = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    // Only submitter can update (and only if pending)
    if (form.submittedBy.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this form'
      });
    }
    
    if (form.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update form that has been reviewed'
      });
    }
    
    // Sanitize student field before update
    const updateData = {
      ...req.body,
      student: sanitizeStudentField(req.body.student)
    };
    
    const updated = await Form.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('submittedBy', 'firstName lastName email')
     .populate('student', 'firstName lastName email');
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete form
// @route   DELETE /api/forms/:id
// @access  Private
exports.deleteForm = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    // Only submitter or admin can delete
    if (form.submittedBy.toString() !== id && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this form'
      });
    }
    
    await Form.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit form
// @route   POST /api/forms/:id/submit
// @access  Private
exports.submitForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    // Only submitter can submit
    if (form.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this form'
      });
    }
    
    await form.submit();
    
    const updated = await Form.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve form
// @route   PUT /api/forms/:id/approve
// @access  Private (Admin)
exports.approveForm = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve forms'
      });
    }
    
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    const { comments } = req.body;
    await form.approve(req.user.id, comments);
    
    const updated = await Form.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Form approved successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject form
// @route   PUT /api/forms/:id/reject
// @access  Private (Admin)
exports.rejectForm = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject forms'
      });
    }
    
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }
    
    const { comments } = req.body;
    await form.reject(req.user.id, comments);
    
    const updated = await Form.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('student', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Form rejected',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get forms by type
// @route   GET /api/forms/type/:type
// @access  Private
exports.getFormsByType = async (req, res, next) => {
  try {
    const forms = await Form.findByType(req.params.type);
    
    res.json({
      success: true,
      count: forms.length,
      data: forms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get forms by status
// @route   GET /api/forms/status/:status
// @access  Private
exports.getFormsByStatus = async (req, res, next) => {
  try {
    const forms = await Form.findByStatus(req.params.status);
    
    res.json({
      success: true,
      count: forms.length,
      data: forms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending forms
// @route   GET /api/forms/pending
// @access  Private (Admin)
exports.getPendingForms = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const forms = await Form.findByStatus('pending');
    
    res.json({
      success: true,
      count: forms.length,
      data: forms
    });
  } catch (error) {
    next(error);
  }
};

