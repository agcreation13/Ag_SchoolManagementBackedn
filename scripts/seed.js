#!/usr/bin/env node

/**
 * Database Seeder Script
 * Run: node scripts/seed.js
 */

require('dotenv').config();
const seedData = require('../src/config/dbSeeder');

seedData();

