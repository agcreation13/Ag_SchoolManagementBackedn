const Settings = require('../models/Settings');
const { validationResult } = require('express-validator');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
exports.getSettings = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};

    const settings = await Settings.find(query).sort({ category: 1, key: 1 });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      count: settings.length,
      data: grouped,
      raw: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single setting
// @route   GET /api/settings/:key
// @access  Private/Admin
exports.getSetting = async (req, res, next) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = req.body; // Object with key-value pairs

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Please provide settings as key-value pairs'
      });
    }

    const updated = [];
    const errors = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await Settings.findOneAndUpdate(
          { key },
          {
            value,
            updatedBy: req.user.id
          },
          {
            new: true,
            upsert: true,
            runValidators: true
          }
        );
        updated.push(setting);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      message: `Updated ${updated.length} setting(s)`,
      data: updated,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single setting
// @route   PUT /api/settings/:key
// @access  Private/Admin
exports.updateSetting = async (req, res, next) => {
  try {
    const { value, category, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a value'
      });
    }

    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      {
        value,
        category: category || 'general',
        description,
        updatedBy: req.user.id
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset settings to defaults
// @route   POST /api/settings/reset
// @access  Private/Admin
exports.resetSettings = async (req, res, next) => {
  try {
    const defaultSettings = {
      'school.name': 'School Management System',
      'school.address': '',
      'school.phone': '',
      'school.email': '',
      'academic.year': new Date().getFullYear().toString(),
      'academic.semester': 'Fall',
      'assignment.allowLateSubmission': true,
      'assignment.latePenalty': 10,
      'exam.defaultDuration': 60,
      'exam.defaultPassingScore': 60,
      'notification.emailEnabled': false,
      'notification.pushEnabled': false
    };

    const updated = [];

    for (const [key, value] of Object.entries(defaultSettings)) {
      const category = key.split('.')[0];
      const setting = await Settings.findOneAndUpdate(
        { key },
        {
          value,
          category,
          updatedBy: req.user.id
        },
        {
          new: true,
          upsert: true
        }
      );
      updated.push(setting);
    }

    res.json({
      success: true,
      message: 'Settings reset to defaults',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

