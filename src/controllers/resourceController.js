const Resource = require('../models/Resource');
const Class = require('../models/Class');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
exports.getResources = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { classId, resourceType, teacherId } = req.query;
    
    let query = { isPublic: true };
    
    if (classId) query.class = classId;
    if (resourceType) query.resourceType = resourceType;
    if (teacherId) query.teacher = teacherId;
    
    // Teachers can see their own private resources
    if (role === 'teacher') {
      query.$or = [
        { isPublic: true },
        { teacher: id }
      ];
    }
    
    const resources = await Resource.find(query)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single resource
// @route   GET /api/resources/:id
// @access  Private
exports.getResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName');
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Increment view count
    resource.viewCount += 1;
    await resource.save();
    
    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create resource
// @route   POST /api/resources
// @access  Private (Teacher, Admin)
exports.createResource = async (req, res, next) => {
  try {
    req.body.teacher = req.user.id;
    
    const resource = await Resource.create(req.body);
    
    const populated = await Resource.findById(resource._id)
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

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private (Teacher, Admin)
exports.updateResource = async (req, res, next) => {
  try {
    let resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Check ownership
    if (req.user.role === 'teacher' && resource.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own resources'
      });
    }
    
    resource = await Resource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName');
    
    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private (Teacher, Admin)
exports.deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Check ownership
    if (req.user.role === 'teacher' && resource.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own resources'
      });
    }
    
    await resource.deleteOne();
    
    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

