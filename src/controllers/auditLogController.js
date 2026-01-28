const AuditLog = require('../models/AuditLog');
const { createAuditLog } = require('../middleware/auditLog');

// @desc    Get audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const {
      performedBy,
      entity,
      entityId,
      action,
      role: userRole,
      startDate,
      endDate,
      status,
      limit = 100,
      skip = 0
    } = req.query;

    const logs = await AuditLog.getLogs({
      performedBy,
      entity,
      entityId,
      action,
      role: userRole,
      startDate,
      endDate,
      status,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const total = await AuditLog.countDocuments({
      ...(performedBy && { performedBy }),
      ...(entity && { entity }),
      ...(entityId && { entityId }),
      ...(action && { action }),
      ...(userRole && { role: userRole }),
      ...(status && { status }),
      ...(startDate || endDate ? {
        timestamp: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      } : {})
    });

    res.json({
      success: true,
      count: logs.length,
      total: total,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/statistics
// @access  Private (Admin)
exports.getAuditLogStatistics = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }

    // Actions by type
    const actionsByType = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Entities by type
    const entitiesByType = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$entity',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Activities by role
    const activitiesByRole = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Status distribution
    const statusDistribution = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Daily activity
    const dailyActivity = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        actionsByType,
        entitiesByType,
        activitiesByRole,
        statusDistribution,
        dailyActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export audit logs
// @route   GET /api/audit-logs/export
// @access  Private (Admin)
exports.exportAuditLogs = async (req, res, next) => {
  try {
    const { role } = req.user;
    
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const logs = await AuditLog.getLogs(req.query);
    const XLSX = require('xlsx');

    const data = logs.map(log => ({
      'Timestamp': log.timestamp,
      'User': log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'N/A',
      'Email': log.performedBy?.email || 'N/A',
      'Role': log.role,
      'Action': log.action,
      'Entity': log.entity,
      'Entity ID': log.entityId || 'N/A',
      'Status': log.status,
      'IP Address': log.ipAddress || 'N/A',
      'User Agent': log.userAgent || 'N/A',
      'Error': log.errorMessage || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

