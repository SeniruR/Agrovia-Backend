// Simple forecast test using existing CSV crops
console.log('Testing forecast for Tomato...');

// First test crops endpoint
fetch('http://localhost:5001/crops')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Available crops:', data);
    
    // Now test forecast for a crop that exists in CSV
    return fetch('http://localhost:5001/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop: 'tomato', timePeriod: '1w' })
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Forecast response:', data);
    
    if (data.success && data.forecast) {
      console.log(`✅ Got ${data.forecast.length} predictions`);
      console.log('First prediction:', data.forecast[0]);
    } else {
      console.log('❌ No forecast data:', data);
    }
  })
  .catch(err => {
    console.error('❌ Test failed:', err.message);
  });
