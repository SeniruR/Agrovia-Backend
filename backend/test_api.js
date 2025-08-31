const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('Testing health endpoint...');
    const healthData = await makeRequest({
      hostname: '127.0.0.1', // Use IPv4 instead of localhost
      port: 5001,
      path: '/health',
      method: 'GET'
    });
    console.log('Health:', healthData);

    console.log('\nTesting available crops...');
    const cropsData = await makeRequest({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/crops',
      method: 'GET'
    });
    console.log('Available crops:', cropsData);

    console.log('\nTesting forecast endpoint...');
    const forecastData = await makeRequest({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/forecast',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      crop: 'tomato',
      timePeriod: '1w'
    });
    console.log('Forecast:', forecastData);

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
