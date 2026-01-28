const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const type = file.mimetype.startsWith('image/') ? 'images' : 'documents';
    const dir = path.join(uploadPath, type);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const allowedDocs = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (file.mimetype.startsWith('image/')) {
    if (allowedImages.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only JPEG, PNG, and GIF are allowed.'), false);
    }
  } else {
    if (allowedDocs.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document type. Only PDF and DOC/DOCX are allowed.'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// @desc    Upload image
// @route   POST /api/upload/image
// @access  Private
exports.uploadImage = [
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload an image file'
        });
      }

      const file = await File.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/images/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: {
          id: file._id,
          filename: file.filename,
          originalName: file.originalName,
          url: `${req.protocol}://${req.get('host')}${file.path}`,
          size: file.size,
          mimeType: file.mimeType
        }
      });
    } catch (error) {
      next(error);
    }
  }
];

// @desc    Upload document
// @route   POST /api/upload/document
// @access  Private
exports.uploadDocument = [
  upload.single('document'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a document file'
        });
      }

      const file = await File.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/documents/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: {
          id: file._id,
          filename: file.filename,
          originalName: file.originalName,
          url: `${req.protocol}://${req.get('host')}${file.path}`,
          size: file.size,
          mimeType: file.mimeType
        }
      });
    } catch (error) {
      next(error);
    }
  }
];

// @desc    Get file
// @route   GET /api/files/:id
// @access  Private
exports.getFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership or admin
    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file'
      });
    }

    // Delete physical file
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', file.path.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await file.deleteOne();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

