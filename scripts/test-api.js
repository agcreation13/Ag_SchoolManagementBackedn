#!/usr/bin/env node

/**
 * API Testing Script
 * Tests all main endpoints using Node.js built-in modules
 */

const http = require('http');

const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

let authToken = null;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${testName}...`, 'yellow');
}

function logSuccess(message) {
  log(`   ✅ ${message}`, 'green');
}

function logError(message) {
  log(`   ❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`   ${message}`, 'gray');
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testServerHealth() {
  logTest('1. Testing Server Health');
  try {
    const response = await makeRequest(BASE_URL);
    if (response.status === 200) {
      logSuccess('Server is running!');
      logInfo(`Response: ${response.data.message || 'OK'}`);
      return true;
    } else {
      logError(`Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Server not responding: ${error.message}`);
    return false;
  }
}

async function testAdminLogin() {
  logTest('2. Testing Admin Login');
  try {
    const response = await makeRequest(`${API_URL}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@example.com',
        password: 'Admin1234'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      authToken = response.data.token;
      logSuccess('Login successful!');
      logInfo(`User: ${response.data.user.email} (${response.data.user.role})`);
      logInfo(`Token: ${authToken.substring(0, 30)}...`);
      return true;
    } else {
      logError(`Login failed: ${response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    return false;
  }
}

async function testGetCurrentUser() {
  logTest('3. Testing Get Current User (Protected Route)');
  if (!authToken) {
    logError('No token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status === 200 && response.data.success) {
      logSuccess('Protected route works!');
      logInfo(`Username: ${response.data.user.username}`);
      logInfo(`Email: ${response.data.user.email}`);
      logInfo(`Role: ${response.data.user.role}`);
      return true;
    } else {
      logError(`Failed: ${response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function testGetPosts() {
  logTest('4. Testing Get All Posts');
  try {
    const response = await makeRequest(`${API_URL}/posts`);
    if (response.status === 200 && response.data.success) {
      logSuccess('Posts API works!');
      logInfo(`Total posts: ${response.data.total}`);
      logInfo(`Posts returned: ${response.data.count}`);
      if (response.data.data && response.data.data.length > 0) {
        logInfo(`Sample post: ${response.data.data[0].title}`);
      }
      return true;
    } else {
      logError(`Failed: ${response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function testGetCategories() {
  logTest('5. Testing Get All Categories');
  try {
    const response = await makeRequest(`${API_URL}/categories`);
    if (response.status === 200 && response.data.success) {
      logSuccess('Categories API works!');
      logInfo(`Total categories: ${response.data.count}`);
      if (response.data.data && response.data.data.length > 0) {
        logInfo('Categories:');
        response.data.data.forEach(cat => {
          logInfo(`  - ${cat.name}`);
        });
      }
      return true;
    } else {
      logError(`Failed: ${response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function testGetUsers() {
  logTest('6. Testing Get All Users (Admin Only)');
  if (!authToken) {
    logError('No token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status === 200 && response.data.success) {
      logSuccess('Users API works!');
      logInfo(`Total users: ${response.data.total}`);
      logInfo(`Users returned: ${response.data.count}`);
      return true;
    } else {
      logError(`Failed: ${response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function testUserRegistration() {
  logTest('7. Testing User Registration');
  const randomNum = Math.floor(Math.random() * 10000);
  try {
    const response = await makeRequest(`${API_URL}/auth/register`, {
      method: 'POST',
      body: {
        username: `testuser${randomNum}`,
        email: `test${randomNum}@test.com`,
        password: 'Test1234',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    if (response.status === 201 && response.data.success) {
      logSuccess('Registration works!');
      logInfo(`New user: ${response.data.user.email}`);
      logInfo(`Username: ${response.data.user.username}`);
      return true;
    } else {
      logError(`Failed: ${response.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function testGetSinglePost() {
  logTest('8. Testing Get Single Post');
  try {
    // First get all posts to get an ID
    const postsResponse = await makeRequest(`${API_URL}/posts`);
    if (postsResponse.data.success && postsResponse.data.data && postsResponse.data.data.length > 0) {
      const postId = postsResponse.data.data[0]._id;
      const response = await makeRequest(`${API_URL}/posts/${postId}`);
      if (response.status === 200 && response.data.success) {
        logSuccess('Get single post works!');
        logInfo(`Post: ${response.data.data.title}`);
        logInfo(`Views: ${response.data.data.views}`);
        return true;
      } else {
        logError(`Failed: ${response.data.message || 'Unknown error'}`);
        return false;
      }
    } else {
      logInfo('No posts available to test');
      return true;
    }
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  🧪 API TESTING SUITE', 'cyan');
  log('═══════════════════════════════════════════════════════\n', 'cyan');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Run tests
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Get Current User', fn: testGetCurrentUser },
    { name: 'Get All Posts', fn: testGetPosts },
    { name: 'Get Single Post', fn: testGetSinglePost },
    { name: 'Get All Categories', fn: testGetCategories },
    { name: 'Get All Users', fn: testGetUsers },
    { name: 'User Registration', fn: testUserRegistration }
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        results.passed++;
        results.tests.push({ name: test.name, status: 'PASSED' });
      } else {
        results.failed++;
        results.tests.push({ name: test.name, status: 'FAILED' });
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: test.name, status: 'ERROR', error: error.message });
    }
  }

  // Print summary
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  📊 TEST SUMMARY', 'cyan');
  log('═══════════════════════════════════════════════════════\n', 'cyan');
  
  log(`Total Tests: ${tests.length}`, 'cyan');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  log('\nTest Details:', 'cyan');
  results.tests.forEach(test => {
    if (test.status === 'PASSED') {
      log(`  ✅ ${test.name}`, 'green');
    } else {
      log(`  ❌ ${test.name}`, 'red');
      if (test.error) {
        log(`     Error: ${test.error}`, 'gray');
      }
    }
  });

  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  🔗 API Endpoints Ready:', 'yellow');
  log('═══════════════════════════════════════════════════════\n', 'cyan');
  
  log('  • Authentication: http://localhost:5000/api/auth', 'gray');
  log('  • Users: http://localhost:5000/api/users', 'gray');
  log('  • Posts: http://localhost:5000/api/posts', 'gray');
  log('  • Categories: http://localhost:5000/api/categories', 'gray');
  log('  • Comments: http://localhost:5000/api/comments', 'gray');
  log('  • Exams: http://localhost:5000/api/exams', 'gray');
  log('  • Notifications: http://localhost:5000/api/notifications', 'gray');
  log('  • File Upload: http://localhost:5000/api/upload', 'gray');
  
  log('\n📚 See TESTING_GUIDE.md for detailed API documentation\n', 'cyan');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
