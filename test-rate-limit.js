#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const API_URL = 'https://backend-api-production-03aa.up.railway.app/api';
const TEST_ENDPOINT = '/companies/validate/test-firma';

async function makeRequest(index) {
  try {
    const { stdout, stderr } = await execAsync(`curl -s -w "%{http_code}" "${API_URL}${TEST_ENDPOINT}"`);
    const httpCode = stdout.slice(-3);
    const body = stdout.slice(0, -3);
    
    return {
      success: httpCode === '200',
      status: parseInt(httpCode),
      index,
      body: body.substring(0, 50) + '...' // Truncate for display
    };
  } catch (error) {
    return {
      success: false,
      status: 'ERROR',
      message: error.message,
      index
    };
  }
}

async function testRateLimit() {
  console.log('🧪 Testing rate limit...');
  console.log(`📡 API URL: ${API_URL}${TEST_ENDPOINT}`);
  
  const promises = [];
  const startTime = Date.now();
  
  // Send 20 concurrent requests (reduced for curl)
  for (let i = 0; i < 20; i++) {
    promises.push(makeRequest(i));
  }
  
  console.log('⏳ Sending 20 concurrent requests...');
  
  try {
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successful = results.filter(r => r.success).length;
    const rateLimited = results.filter(r => r.status === 429).length;
    const errors = results.filter(r => !r.success && r.status !== 429).length;
    
    console.log('\n📊 Results:');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`🚫 Rate limited (429): ${rateLimited}`);
    console.log(`❌ Other errors: ${errors}`);
    
    if (rateLimited > 0) {
      console.log('\n🔍 Rate limited requests:');
      results
        .filter(r => r.status === 429)
        .slice(0, 5) // Show first 5
        .forEach(r => console.log(`  Request ${r.index}: ${r.message}`));
    }
    
    if (successful > 15) {
      console.log('\n🎉 Rate limit seems to be working well - most requests succeeded!');
    } else if (rateLimited > 10) {
      console.log('\n⚠️  Many requests were rate limited - might need to increase limit for development');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRateLimit();
