const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'create', 'update', 'delete', 'view', 'export', 'publish', 'verify',
      'approve', 'reject', 'login', 'logout', 'access_denied'
    ]
  },
  entity: {
    type: String,
    required: [true, 'Entity is required'],
    enum: [
      'exam', 'timetable', 'marks_submission', 'result', 'form', 'user',
      'class', 'attendance', 'fee', 'assignment', 'grade', 'notification'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performed by is required']
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'teacher', 'student', 'parent', 'examcell']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ role: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

// Static method: Create audit log
auditLogSchema.statics.log = async function(data) {
  return await this.create(data);
};

// Static method: Get audit logs with filters
auditLogSchema.statics.getLogs = async function(filters = {}) {
  const {
    performedBy,
    entity,
    entityId,
    action,
    role,
    startDate,
    endDate,
    status,
    limit = 100,
    skip = 0
  } = filters;

  const query = {};

  if (performedBy) query.performedBy = performedBy;
  if (entity) query.entity = entity;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (role) query.role = role;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return await this.find(query)
    .populate('performedBy', 'firstName lastName email username')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

