const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./config/database');

// Initialize Express app
const app = express();

// Disable ETag caching to ensure fresh responses (avoids 304 for auth/me)
app.disable('etag');

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'School Management System API is running!',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/grades', require('./routes/gradeRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/forms', require('./routes/formRoutes'));
app.use('/api/parent', require('./routes/parentRoutes'));
app.use('/api/examcell', require('./routes/examCellRoutes'));
app.use('/api/attendance-corrections', require('./routes/attendanceCorrectionRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/notices', require('./routes/noticeBoardRoutes'));
app.use('/api/marksheet', require('./routes/marksheetRoutes'));
app.use('/api/meeting-requests', require('./routes/meetingRequestRoutes'));
app.use('/api/export-import', require('./routes/exportImportRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

