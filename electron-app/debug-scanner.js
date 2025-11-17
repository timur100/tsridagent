// Debug-Script um Scanner-Status direkt zu testen
const https = require('https');

// Disable SSL certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const scannerUrls = [
  'https://localhost/Regula.SDK.Api',
  'https://localhost:443/Regula.SDK.Api',
  'https://localhost:88/Regula.SDK.Api',
  'https://localhost:8080/Regula.SDK.Api'
];

console.log('🔍 Testing Regula Scanner Service...\n');

async function testUrl(url) {
  return new Promise((resolve) => {
    const fullUrl = `${url}/Methods/GetServiceVersion`;
    console.log(`Testing: ${fullUrl}`);
    
    const req = https.request(fullUrl, {
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 3000
    }, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ SUCCESS! Scanner found at: ${url}`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Version: ${body}\n`);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ FAILED: ${error.message}\n`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ TIMEOUT: No response\n`);
      resolve(false);
    });
    
    req.end();
  });
}

async function testAllUrls() {
  let foundScanner = false;
  
  for (const url of scannerUrls) {
    const success = await testUrl(url);
    if (success) {
      foundScanner = true;
      break;
    }
  }
  
  if (!foundScanner) {
    console.log('❌ Scanner service not found on any URL!');
    console.log('\nTroubleshooting:');
    console.log('1. Is Regula SDK Service running?');
    console.log('   - Check Task Manager for "Regula"');
    console.log('2. Try opening in browser:');
    console.log('   - https://localhost/Regula.SDK.Api.Documentation/index');
    console.log('3. Check Windows Services:');
    console.log('   - Look for "Regula" service');
  }
}

testAllUrls();
