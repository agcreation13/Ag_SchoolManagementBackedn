const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const Assignment = require('../models/Assignment');
const Exam = require('../models/Exam');
const XLSX = require('xlsx');
const { createAuditLog } = require('../middleware/auditLog');

// @desc    Export data to CSV/Excel
// @route   GET /api/export/:entity
// @access  Private (Admin)
exports.exportData = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { entity } = req.params;
    const { format = 'excel' } = req.query;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    let data = [];
    let filename = '';

    switch (entity) {
      case 'users':
        const users = await User.find().select('-password').lean();
        data = users.map(u => ({
          'First Name': u.firstName,
          'Last Name': u.lastName,
          'Email': u.email,
          'Username': u.username,
          'Role': u.role,
          'Phone': u.phone || '',
          'Is Active': u.isActive,
          'Created At': u.createdAt
        }));
        filename = 'users';
        break;

      case 'students':
        const students = await User.find({ role: 'student' }).select('-password').lean();
        data = students.map(s => ({
          'First Name': s.firstName,
          'Last Name': s.lastName,
          'Email': s.email,
          'Username': s.username,
          'Phone': s.phone || '',
          'Is Active': s.isActive,
          'Created At': s.createdAt
        }));
        filename = 'students';
        break;

      case 'attendance':
        const attendance = await Attendance.find()
          .populate('student', 'firstName lastName email')
          .populate('class', 'name code')
          .lean();
        data = attendance.map(a => ({
          'Student': a.student ? `${a.student.firstName} ${a.student.lastName}` : 'N/A',
          'Email': a.student?.email || 'N/A',
          'Class': a.class?.name || 'N/A',
          'Date': a.date,
          'Status': a.status,
          'Academic Year': a.academicYear || '',
          'Semester': a.semester || ''
        }));
        filename = 'attendance';
        break;

      case 'grades':
        const grades = await Grade.find()
          .populate('student', 'firstName lastName email')
          .populate('class', 'name code')
          .lean();
        data = grades.map(g => ({
          'Student': g.student ? `${g.student.firstName} ${g.student.lastName}` : 'N/A',
          'Email': g.student?.email || 'N/A',
          'Class': g.class?.name || 'N/A',
          'Score': g.score,
          'Max Score': g.maxScore,
          'Percentage': g.percentage,
          'Grade': g.letterGrade,
          'Grade Type': g.gradeType,
          'Date': g.createdAt
        }));
        filename = 'grades';
        break;

      case 'fees':
        const fees = await Fee.find()
          .populate('student', 'firstName lastName email')
          .lean();
        data = fees.map(f => ({
          'Student': f.student ? `${f.student.firstName} ${f.student.lastName}` : 'N/A',
          'Email': f.student?.email || 'N/A',
          'Fee Type': f.feeType,
          'Amount': f.amount,
          'Paid Amount': f.paidAmount,
          'Due Date': f.dueDate,
          'Status': f.status,
          'Academic Year': f.academicYear,
          'Semester': f.semester
        }));
        filename = 'fees';
        break;

      case 'classes':
        const classes = await Class.find()
          .populate('teacher', 'firstName lastName')
          .lean();
        data = classes.map(c => ({
          'Name': c.name,
          'Code': c.code || '',
          'Subject': c.subject || '',
          'Teacher': c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'N/A',
          'Academic Year': c.academicYear || '',
          'Semester': c.semester || '',
          'Is Active': c.isActive
        }));
        filename = 'classes';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid entity type'
        });
    }

    // Audit log
    await createAuditLog(req, 'export', entity, null, {
      format: format,
      recordCount: data.length
    });

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.csv`);
      res.send(csv);
      } else {
      // Convert to Excel
      if (!XLSX) {
        return res.status(500).json({
          success: false,
          message: 'Excel export not available. Please install xlsx package.'
        });
      }
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, entity);
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.xlsx`);
      res.send(buffer);
    }
  } catch (error) {
    await createAuditLog(req, 'export', req.params.entity, null, {}, 'error');
    next(error);
  }
};

// @desc    Import data from CSV/Excel
// @route   POST /api/import/:entity
// @access  Private (Admin)
exports.importData = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { entity } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let imported = 0;
    let errors = [];

    switch (entity) {
      case 'users':
        for (const row of data) {
          try {
            const userData = {
              firstName: row['First Name'] || row['firstName'],
              lastName: row['Last Name'] || row['lastName'],
              email: row['Email'] || row['email'],
              username: row['Username'] || row['username'],
              role: row['Role'] || row['role'] || 'student',
              phone: row['Phone'] || row['phone'],
              password: row['Password'] || row['password'] || 'defaultPassword123',
              isActive: row['Is Active'] !== undefined ? row['Is Active'] : true
            };

            // Check if user exists
            const existing = await User.findOne({ 
              $or: [
                { email: userData.email },
                { username: userData.username }
              ]
            });

            if (!existing) {
              await User.create(userData);
              imported++;
            } else {
              errors.push(`User ${userData.email} already exists`);
            }
          } catch (error) {
            errors.push(`Error importing user: ${error.message}`);
          }
        }
        break;

      case 'attendance':
        for (const row of data) {
          try {
            const student = await User.findOne({ 
              email: row['Email'] || row['email']
            });

            if (!student) {
              errors.push(`Student not found: ${row['Email'] || row['email']}`);
              continue;
            }

            const classData = await Class.findOne({ 
              name: row['Class'] || row['class']
            });

            if (!classData) {
              errors.push(`Class not found: ${row['Class'] || row['class']}`);
              continue;
            }

            await Attendance.create({
              student: student._id,
              class: classData._id,
              date: new Date(row['Date'] || row['date']),
              status: row['Status'] || row['status'] || 'present',
              academicYear: row['Academic Year'] || row['academicYear'],
              semester: row['Semester'] || row['semester']
            });
            imported++;
          } catch (error) {
            errors.push(`Error importing attendance: ${error.message}`);
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Import not supported for this entity'
        });
    }

    // Audit log
    await createAuditLog(req, 'import', entity, null, {
      imported: imported,
      errors: errors.length
    });

    res.json({
      success: true,
      message: `Imported ${imported} records`,
      imported: imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await createAuditLog(req, 'import', req.params.entity, null, {}, 'error');
    next(error);
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape commas and quotes
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

