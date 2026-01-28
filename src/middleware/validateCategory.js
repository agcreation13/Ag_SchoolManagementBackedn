const { body } = require('express-validator');

exports.validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID')
];

