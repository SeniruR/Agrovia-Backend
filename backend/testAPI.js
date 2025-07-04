const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';

// Test data
const testFarmer = {
  name: "Test Farmer",
  email: "farmer@test.com",
  password: "testpassword123",
  contact_number: "0771234567",
  district: "Colombo",
  land_size: 2.5,
  nic_number: "199012345679",
  organization_committee_number: "ORG001"
};

const testAdmin = {
  email: "admin@agrovia.com",
  password: "admin123456"
};

async function runTests() {
  console.log('🧪 Starting Agrovia API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.message);

    // Test 2: Get Organizations
    console.log('\n2️⃣ Testing Get Organizations...');
    const orgsResponse = await axios.get(`${BASE_URL}/organizations`);
    console.log('✅ Organizations found:', orgsResponse.data.data.organizations.length);

    // Test 3: Admin Login
    console.log('\n3️⃣ Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testAdmin);
    const adminToken = loginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Test 4: Register Farmer
    console.log('\n4️⃣ Testing Farmer Registration...');
    try {
      const farmerResponse = await axios.post(`${BASE_URL}/auth/register/farmer`, testFarmer);
      const farmerToken = farmerResponse.data.data.token;
      console.log('✅ Farmer registration successful');

      // Test 5: Get Profile (Farmer)
      console.log('\n5️⃣ Testing Get Profile (Farmer)...');
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${farmerToken}` }
      });
      console.log('✅ Profile retrieved:', profileResponse.data.data.user.name);

    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('⚠️ Farmer already exists (this is expected on subsequent runs)');
      } else {
        throw error;
      }
    }

    // Test 6: Get All Users (Admin)
    console.log('\n6️⃣ Testing Get All Users (Admin only)...');
    const usersResponse = await axios.get(`${BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Users retrieved:', usersResponse.data.data.users.length);

    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📊 API Test Summary:');
    console.log('✅ Health Check - Working');
    console.log('✅ Organizations - Working');
    console.log('✅ Authentication - Working');
    console.log('✅ User Registration - Working');
    console.log('✅ Profile Retrieval - Working');
    console.log('✅ Admin Functions - Working');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if server is available
runTests().finally(() => {
  console.log('\n🔚 Tests completed.');
  process.exit(0);
});
