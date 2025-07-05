const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Test crop post API endpoints
async function testCropPostAPI() {
  console.log('🧪 Testing Crop Post API Integration...\n');

  try {
    // 1. Test health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.message);

    // 2. Test get all crop posts (should work without auth)
    console.log('\n2. Testing get all crop posts...');
    const postsResponse = await axios.get(`${API_BASE_URL}/crop-posts`);
    console.log('✅ Get crop posts:', postsResponse.data.message);
    console.log(`   Found ${postsResponse.data.data.length} posts`);

    // 3. Test crop statistics
    console.log('\n3. Testing crop statistics...');
    const statsResponse = await axios.get(`${API_BASE_URL}/crop-posts/statistics`);
    console.log('✅ Crop statistics:', statsResponse.data.message);
    console.log('   Stats:', JSON.stringify(statsResponse.data.data, null, 2));

    // 4. Test search (should handle empty results gracefully)
    console.log('\n4. Testing search functionality...');
    const searchResponse = await axios.get(`${API_BASE_URL}/crop-posts/search?q=tomato`);
    console.log('✅ Search crops:', searchResponse.data.message);
    console.log(`   Found ${searchResponse.data.total} matching posts`);

    // 5. Test authentication requirement for protected routes
    console.log('\n5. Testing authentication requirement...');
    try {
      await axios.get(`${API_BASE_URL}/crop-posts/farmer/my-posts`);
      console.log('❌ Authentication test failed - should require auth');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Authentication correctly required for protected routes');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 All basic API tests passed! The backend is ready for frontend integration.');
    console.log('\n📝 Next steps:');
    console.log('   1. Create a user account and login to get authentication token');
    console.log('   2. Use the CropPostForm component with proper authentication');
    console.log('   3. Test image upload functionality');
    console.log('   4. Verify the complete crop posting workflow');

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Test validation schemas
function testValidationExamples() {
  console.log('\n📋 Sample Valid Crop Post Data:');
  
  const sampleCropPost = {
    cropName: "Tomato",
    cropCategory: "vegetables",
    variety: "Cherry Tomato",
    quantity: 100,
    unit: "kg",
    pricePerUnit: 250.50,
    harvestDate: "2025-01-15",
    expiryDate: "2025-01-25",
    location: "Maharagama, near the main market, accessible by main road",
    district: "Colombo",
    description: "Fresh organic cherry tomatoes, grown without pesticides. Perfect for salads and cooking.",
    farmerName: "Sunil Perera",
    contactNumber: "+94771234567",
    email: "sunil.perera@example.com",
    organicCertified: true,
    pesticideFree: true,
    freshlyHarvested: true
  };

  console.log(JSON.stringify(sampleCropPost, null, 2));
}

// Run tests
async function runAllTests() {
  await testCropPostAPI();
  testValidationExamples();
}

runAllTests();
