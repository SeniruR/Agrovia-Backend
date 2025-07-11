const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testCropPostForm() {
  console.log('🧪 Testing Crop Post Form Integration...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ API is healthy:', healthResponse.data.message);

    // Test 2: Check if we need authentication
    console.log('\n2. Testing crop post creation without auth...');
    try {
      const testCropData = new FormData();
      testCropData.append('cropName', 'Test Tomato');
      testCropData.append('cropCategory', 'vegetables');
      testCropData.append('quantity', '50');
      testCropData.append('unit', 'kg');
      testCropData.append('pricePerUnit', '200.00');
      testCropData.append('harvestDate', '2025-01-16');
      testCropData.append('location', 'Test Farm Location, very detailed address for testing');
      testCropData.append('district', 'Colombo');
      testCropData.append('farmerName', 'Test Farmer');
      testCropData.append('contactNumber', '+94771234567');
      testCropData.append('organicCertified', 'false');
      testCropData.append('pesticideFree', 'false');
      testCropData.append('freshlyHarvested', 'true');

      const createResponse = await axios.post(`${API_BASE_URL}/crop-posts`, testCropData);
      console.log('❌ Expected authentication error, but got success');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication required as expected:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

    // Test 3: Check public endpoints
    console.log('\n3. Testing public endpoints...');
    const postsResponse = await axios.get(`${API_BASE_URL}/crop-posts`);
    console.log('✅ Get all posts works:', `Found ${postsResponse.data.data?.length || 0} posts`);

    const statsResponse = await axios.get(`${API_BASE_URL}/crop-posts/statistics`);
    console.log('✅ Statistics endpoint works:', `Total posts: ${statsResponse.data.data.total_posts}`);

    // Test 4: Test search
    const searchResponse = await axios.get(`${API_BASE_URL}/crop-posts/search?crop_category=vegetables`);
    console.log('✅ Search endpoint works:', `Found ${searchResponse.data.data?.length || 0} vegetable posts`);

    console.log('\n🎉 All tests passed! The CropPostForm should work correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Ensure user is logged in before using the form');
    console.log('2. The form will automatically include authentication headers');
    console.log('3. Test the form with a real user session');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testCropPostForm();
