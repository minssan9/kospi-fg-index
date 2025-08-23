// End-to-end connectivity test between frontend and backend
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:8083';

// Test configuration
const testConfig = {
  timeout: 5000,
  retries: 3
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to make requests with retry logic
async function makeRequest(url, options = {}) {
  const config = {
    timeout: testConfig.timeout,
    validateStatus: () => true, // Accept all status codes
    ...options
  };
  
  for (let attempt = 1; attempt <= testConfig.retries; attempt++) {
    try {
      return await axios(url, config);
    } catch (error) {
      if (attempt === testConfig.retries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Test function wrapper
async function test(name, testFn) {
  testResults.total++;
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    await testFn();
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Assertion helper
function expect(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Main test suite
async function runConnectivityTests() {
  console.log('🚀 Starting End-to-End Connectivity Tests\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);

  // Test 1: Backend Health Check
  await test('Backend Health Check', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    expect(response.status, 200, 'Health endpoint should return 200');
    expect(response.data.status, 'OK', 'Health status should be OK');
  });

  // Test 2: Backend API - Fear & Greed Latest
  await test('Backend API - Fear & Greed Latest', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/fear-greed/latest`);
    expect(response.status, 200, 'Fear & Greed endpoint should return 200');
    expect(typeof response.data, 'object', 'Response should be an object');
    expect(response.data.success !== undefined, true, 'Response should have success property');
  });

  // Test 3: Backend API - System Status
  await test('Backend API - System Status', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/system/status`);
    expect(response.status, 200, 'System status endpoint should return 200');
    expect(response.data.success, true, 'System status should be successful');
    expect(typeof response.data.data, 'object', 'System data should be an object');
    expect(typeof response.data.data.system, 'object', 'System info should be an object');
  });

  // Test 4: Backend API - History Data
  await test('Backend API - History Data', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/fear-greed/history?days=7`);
    expect(response.status, 200, 'History endpoint should return 200');
    expect(typeof response.data, 'object', 'Response should be an object');
    expect(response.data.success !== undefined, true, 'Response should have success property');
  });

  // Test 5: Backend API - KOSPI Data
  await test('Backend API - KOSPI Data', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/market/kospi/latest`);
    expect(response.status, 200, 'KOSPI endpoint should return 200');
    expect(typeof response.data, 'object', 'Response should be an object');
    expect(response.data.success !== undefined, true, 'Response should have success property');
  });

  // Test 6: Frontend Accessibility
  await test('Frontend Accessibility', async () => {
    const response = await makeRequest(FRONTEND_URL);
    expect(response.status, 200, 'Frontend should be accessible');
    expect(response.data.includes('<html'), true, 'Frontend should return HTML');
  });

  // Test 7: Backend CORS Headers
  await test('Backend CORS Headers', async () => {
    const response = await makeRequest(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });
    expect(response.status, 200, 'CORS preflight should succeed');
    
    // Check if CORS headers are present (they should be if CORS is enabled)
    if (response.headers['access-control-allow-origin']) {
      console.log('   CORS headers detected');
    } else {
      console.log('   CORS headers not present (may be disabled in development)');
    }
  });

  // Test 8: API Response Format Consistency
  await test('API Response Format Consistency', async () => {
    const endpoints = [
      '/api/system/status',
      '/api/fear-greed/history?days=1',
      '/api/system/collection-status?days=1'
    ];

    for (const endpoint of endpoints) {
      const response = await makeRequest(`${BACKEND_URL}${endpoint}`);
      expect(response.status, 200, `${endpoint} should return 200`);
      expect(typeof response.data.success, 'boolean', `${endpoint} should have success property`);
      
      if (response.data.success) {
        expect(response.data.data !== undefined, true, `${endpoint} should have data property when successful`);
      }
    }
  });

  // Test 9: Error Handling
  await test('API Error Handling', async () => {
    const response = await makeRequest(`${BACKEND_URL}/api/invalid-endpoint`);
    expect(response.status, 404, 'Invalid endpoint should return 404');
    expect(typeof response.data, 'object', 'Error response should be an object');
    expect(response.data.success, false, 'Error response should have success: false');
  });

  // Test 10: Admin Authentication Structure
  await test('Admin Authentication Structure', async () => {
    // Test login endpoint without credentials
    const loginResponse = await makeRequest(`${BACKEND_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {}
    });
    expect(loginResponse.status, 400, 'Login without credentials should return 400');
    expect(loginResponse.data.success, false, 'Login failure should have success: false');
    expect(loginResponse.data.code, 'MISSING_CREDENTIALS', 'Should return proper error code');

    // Test protected endpoint without auth
    const protectedResponse = await makeRequest(`${BACKEND_URL}/api/admin/system-health`);
    expect(protectedResponse.status, 401, 'Protected endpoint should return 401 without auth');
  });

  // Print test results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Total tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  console.log('\n🎯 Integration Status:');
  if (testResults.failed === 0) {
    console.log('✅ All tests passed - Backend and Frontend are fully integrated!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed - Integration may have issues');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
runConnectivityTests().catch((error) => {
  console.error('\n💥 Test suite failed:', error.message);
  process.exit(1);
});