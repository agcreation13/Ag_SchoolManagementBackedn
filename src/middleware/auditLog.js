const AuditLog = require('../models/AuditLog');

// Middleware to log actions
const auditLog = (action, entity) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function(data) {
      // Log the action after response is sent
      const logData = {
        action: action,
        entity: entity,
        entityId: req.params.id || req.body.id || null,
        performedBy: req.user?.id || null,
        role: req.user?.role || 'unknown',
        details: {
          method: req.method,
          path: req.path,
          body: sanitizeBody(req.body),
          params: req.params,
          query: req.query
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: data.success !== false ? 'success' : 'failure',
        errorMessage: data.message || null
      };

      // Log asynchronously (don't wait for it)
      AuditLog.log(logData).catch(err => {
        console.error('Failed to create audit log:', err);
      });

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Helper function to sanitize sensitive data from request body
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// Specific audit log functions for common actions
exports.logExamAction = auditLog('update', 'exam');
exports.logTimetableAction = auditLog('update', 'timetable');
exports.logMarksSubmission = auditLog('update', 'marks_submission');
exports.logResultPublish = auditLog('publish', 'result');
exports.logFormAction = auditLog('update', 'form');

// General audit log function
exports.auditLog = auditLog;

// Manual logging function
exports.createAuditLog = async (req, action, entity, entityId, details = {}, status = 'success') => {
  try {
    await AuditLog.log({
      action,
      entity,
      entityId,
      performedBy: req.user?.id || null,
      role: req.user?.role || 'unknown',
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// Export the main auditLog function as default
module.exports = exports;

