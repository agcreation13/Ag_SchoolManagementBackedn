#!/usr/bin/env node

/**
 * Create Database Indexes
 * Run: node scripts/createIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const createIndexes = require('../src/config/dbIndexes');

const run = async () => {
  try {
    await connectDB();
    await createIndexes();
    console.log('✅ Index creation completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

run();

