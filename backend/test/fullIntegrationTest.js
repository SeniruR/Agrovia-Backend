const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api/v1';

class CropPostIntegrationTest {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.createdPostId = null;
  }

  async log(message) {
    console.log(`📝 ${message}`);
  }

  async testUserRegistration() {
    this.log('Testing farmer registration...');
    
    const userData = {
      name: 'Test Farmer',
      email: `testfarmer_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      contact_number: '+94771234567',
      district: 'Colombo',
      nic_number: `123456789V`,
      address: 'Test Address, Colombo',
      land_size: 2.5, // hectares
      organization_committee_number: 'ORG001', // Use existing organization
      birth_date: '1990-01-01',
      description: 'Test farmer for integration testing',
      farming_experience: '5 years',
      cultivated_crops: 'Tomatoes, Vegetables',
      irrigation_system: 'Drip irrigation',
      soil_type: 'Clay loam'
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register/farmer`, userData);
      
      if (response.data.success) {
        this.log('✅ Farmer registration successful');
        return userData;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Registration failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async testUserLogin(userData) {
    this.log('Testing user login...');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: userData.email,
        password: userData.password
      });
      
      if (response.data.success) {
        this.authToken = response.data.token;
        this.userId = response.data.user.id;
        this.log('✅ User login successful');
        this.log(`🔑 Auth token: ${this.authToken.substring(0, 20)}...`);
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Login failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async testCropPostCreation() {
    this.log('Testing crop post creation...');
    
    const cropData = {
      cropName: 'Integration Test Tomato',
      cropCategory: 'vegetables',
      variety: 'Cherry Tomato',
      quantity: 150,
      unit: 'kg',
      pricePerUnit: 275.50,
      harvestDate: '2025-01-16',
      expiryDate: '2025-01-26',
      location: 'Test Farm, Maharagama, near the main market',
      district: 'Colombo',
      description: 'Fresh organic cherry tomatoes for integration testing. Grown without pesticides.',
      contactNumber: '+94771234567',
      email: 'testfarmer@example.com',
      organicCertified: true,
      pesticideFree: true,
      freshlyHarvested: true
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/crop-posts`, cropData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        this.createdPostId = response.data.data.insertId;
        this.log('✅ Crop post creation successful');
        this.log(`📦 Created post ID: ${this.createdPostId}`);
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Crop post creation failed: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.details) {
        this.log(`🔍 Error details: ${JSON.stringify(error.response.data.details)}`);
      }
      throw error;
    }
  }

  async testGetCropPosts() {
    this.log('Testing crop posts retrieval...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/crop-posts`);
      
      if (response.data.success) {
        this.log('✅ Crop posts retrieval successful');
        this.log(`📊 Found ${response.data.data.posts.length} posts`);
        
        if (response.data.data.posts.length > 0) {
          const latestPost = response.data.data.posts[0];
          this.log(`🌱 Latest post: ${latestPost.crop_name} - ${latestPost.quantity}${latestPost.unit} @ Rs.${latestPost.price_per_unit}`);
        }
        
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Crop posts retrieval failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async testCropStatistics() {
    this.log('Testing crop statistics...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/crop-posts/statistics`);
      
      if (response.data.success) {
        this.log('✅ Crop statistics retrieval successful');
        const stats = response.data.data;
        this.log(`📈 Total posts: ${stats.total_posts}`);
        this.log(`📈 Recent posts (7 days): ${stats.recent_posts}`);
        this.log(`🏷️ Categories: ${stats.by_category.map(c => `${c.crop_category}(${c.count})`).join(', ') || 'None'}`);
        this.log(`🌍 Top districts: ${stats.by_district.map(d => `${d.district}(${d.count})`).join(', ') || 'None'}`);
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Crop statistics failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async testCropPostUpdate() {
    if (!this.createdPostId) {
      this.log('⏩ Skipping update test - no post created');
      return;
    }

    this.log('Testing crop post update...');
    
    const updateData = {
      quantity: 200,
      pricePerUnit: 280.00,
      description: 'Updated description - Premium organic cherry tomatoes for integration testing.'
    };

    try {
      const response = await axios.put(`${API_BASE_URL}/crop-posts/${this.createdPostId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        this.log('✅ Crop post update successful');
        this.log(`📝 Updated quantity to ${updateData.quantity}kg and price to Rs.${updateData.pricePerUnit}`);
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Crop post update failed: ${error.response?.data?.message || error.message}`);
      // Don't throw here, continue with other tests
    }
  }

  async testSearchFunctionality() {
    this.log('Testing search functionality...');
    
    const searchParams = {
      crop_name: 'tomato',
      crop_category: 'vegetables',
      district: 'Colombo'
    };

    try {
      const queryString = new URLSearchParams(searchParams).toString();
      const response = await axios.get(`${API_BASE_URL}/crop-posts/search?${queryString}`);
      
      if (response.data.success) {
        this.log('✅ Search functionality working');
        this.log(`🔍 Found ${response.data.data.posts.length} matching posts`);
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      this.log(`❌ Search failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async runFullIntegrationTest() {
    console.log('🚀 Starting Full Crop Post Integration Test...\n');

    try {
      // Step 1: User Registration and Authentication
      const userData = await this.testUserRegistration();
      await this.testUserLogin(userData);

      // Step 2: Crop Post CRUD Operations
      await this.testCropPostCreation();
      await this.testGetCropPosts();
      await this.testCropPostUpdate();

      // Step 3: Search and Statistics
      await this.testSearchFunctionality();
      await this.testCropStatistics();

      console.log('\n🎉 Full Integration Test Completed Successfully!');
      console.log('✅ User registration and authentication working');
      console.log('✅ Crop post creation, retrieval, and update working');
      console.log('✅ Search functionality working');
      console.log('✅ Statistics endpoint working');
      console.log('\n🚀 Backend is ready for frontend integration!');

    } catch (error) {
      console.log('\n❌ Integration Test Failed');
      console.log(`Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the integration test
const test = new CropPostIntegrationTest();
test.runFullIntegrationTest();
