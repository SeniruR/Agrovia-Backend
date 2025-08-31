// Test the API integration with a crop that exists in our data

async function testIntegration() {
  try {
    console.log('Testing tomato forecast...');
    
    const response = await fetch('http://localhost:5001/forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crop: 'tomato',
        timePeriod: '1w'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.success && data.forecast && data.forecast.length > 0) {
      console.log('\n✅ Integration successful!');
      console.log(`✅ Got ${data.forecast.length} predictions for ${data.crop}`);
      console.log(`✅ Price range: $${Math.min(...data.forecast.map(f => f.price)).toFixed(2)} - $${Math.max(...data.forecast.map(f => f.price)).toFixed(2)}`);
      console.log(`✅ Confidence range: ${Math.min(...data.forecast.map(f => f.confidence))}% - ${Math.max(...data.forecast.map(f => f.confidence))}%`);
      
      // Test first prediction
      const first = data.forecast[0];
      console.log(`✅ Sample prediction: ${first.date} - $${first.price.toFixed(2)} (${first.confidence}% confidence)`);
    } else {
      console.log('❌ Integration failed - no forecast data returned');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testIntegration();
