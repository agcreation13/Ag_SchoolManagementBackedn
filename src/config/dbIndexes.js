const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Notification = require('../models/Notification');
const File = require('../models/File');

const createIndexes = async () => {
  try {
    console.log('📊 Creating database indexes...');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    console.log('✅ User indexes created');

    // Post indexes
    await Post.collection.createIndex({ slug: 1 }, { unique: true });
    await Post.collection.createIndex({ author: 1 });
    await Post.collection.createIndex({ category: 1 });
    await Post.collection.createIndex({ status: 1 });
    await Post.collection.createIndex({ publishedAt: -1 });
    await Post.collection.createIndex({ createdAt: -1 });
    await Post.collection.createIndex({ title: 'text', content: 'text' });
    console.log('✅ Post indexes created');

    // Category indexes
    await Category.collection.createIndex({ slug: 1 }, { unique: true });
    await Category.collection.createIndex({ name: 1 });
    await Category.collection.createIndex({ parentCategory: 1 });
    await Category.collection.createIndex({ isActive: 1 });
    console.log('✅ Category indexes created');

    // Comment indexes
    await Comment.collection.createIndex({ post: 1 });
    await Comment.collection.createIndex({ author: 1 });
    await Comment.collection.createIndex({ parentComment: 1 });
    await Comment.collection.createIndex({ createdAt: 1 });
    await Comment.collection.createIndex({ isApproved: 1 });
    console.log('✅ Comment indexes created');

    // Exam indexes
    await Exam.collection.createIndex({ createdBy: 1 });
    await Exam.collection.createIndex({ isActive: 1 });
    await Exam.collection.createIndex({ startDate: 1 });
    await Exam.collection.createIndex({ createdAt: -1 });
    console.log('✅ Exam indexes created');

    // Question indexes
    await Question.collection.createIndex({ examId: 1 });
    await Question.collection.createIndex({ order: 1 });
    console.log('✅ Question indexes created');

    // ExamAttempt indexes
    await ExamAttempt.collection.createIndex({ exam: 1 });
    await ExamAttempt.collection.createIndex({ user: 1 });
    await ExamAttempt.collection.createIndex({ submittedAt: -1 });
    await ExamAttempt.collection.createIndex({ isPassed: 1 });
    console.log('✅ ExamAttempt indexes created');

    // Notification indexes
    await Notification.collection.createIndex({ recipient: 1 });
    await Notification.collection.createIndex({ isRead: 1 });
    await Notification.collection.createIndex({ createdAt: -1 });
    await Notification.collection.createIndex({ type: 1 });
    console.log('✅ Notification indexes created');

    // File indexes
    await File.collection.createIndex({ uploadedBy: 1 });
    await File.collection.createIndex({ mimeType: 1 });
    await File.collection.createIndex({ createdAt: -1 });
    console.log('✅ File indexes created');

    console.log('✅ All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

module.exports = createIndexes;

