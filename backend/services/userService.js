
import axios from 'axios';

// Get shop owner details by user_id
// (move this into the userService object below)


const API_BASE_URL = 'http://localhost:5000/api/v1';

// Helper function to get the current user from localStorage
const getCurrentUserFromStorage = () => {
  try {
    const user = localStorage.getItem('user');
    if (!user || typeof user !== 'string' || user[0] !== '{') {
      // Not a valid JSON string, clear it
      localStorage.removeItem('user');
      return null;
    }
    return JSON.parse(user);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const userService = {
  // Get shop owner details by user_id
  getShopOwnerDetails: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/shop-owner-details`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shop owner details:', error);
      return { success: false, message: 'Failed to fetch shop owner details' };
    }
  },
  // Get current user details
  getCurrentUser: async () => {
    try {
      const currentUser = getCurrentUserFromStorage();
      
      if (!currentUser) {
        console.warn('No user logged in, using mock data');
        return {
          success: true,
          data: {
            id: 1,
            full_name: 'Demo User (Not Logged In)',
            email: 'demo@example.com',
            phone_number: '0771234567',
            district: 'Colombo',
            address: 'Demo Address - Please login to see your real data',
            user_type: 1
          }
        };
      }

      const response = await axios.get(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token || 'no-token'}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      
      const currentUser = getCurrentUserFromStorage();
      if (currentUser) {
        // If we have a logged-in user but API failed, use their basic info
        return {
          success: true,
          data: {
            id: currentUser.id || currentUser.user_id,
            full_name: currentUser.full_name || currentUser.name || 'User',
            email: currentUser.email || '',
            phone_number: currentUser.phone_number || currentUser.phone || '',
            district: currentUser.district || '',
            address: currentUser.address || '',
            user_type: currentUser.user_type || 1
          }
        };
      }
      
      // Fallback to mock data
      return {
        success: true,
        data: {
          id: 1,
          full_name: 'Demo User (API Error)',
          email: 'demo@example.com',
          phone_number: '0771234567',
          district: 'Colombo',
          address: 'Demo Address - API connection failed',
          user_type: 1
        }
      };
    }
  },

  // Get user's previous crop posts for auto-suggestions
  getUserCropHistory: async () => {
    try {
      const currentUser = getCurrentUserFromStorage();
      
      if (!currentUser) {
        return { success: false, data: [], message: 'No user logged in' };
      }

      const response = await axios.get(`${API_BASE_URL}/crop-posts/user`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token || 'no-token'}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching crop history:', error);
      return { success: false, data: [] };
    }
  },

  // Get all users (admin)
  getAllUsers: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/all`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { success: false, data: [], message: 'Failed to fetch users' };
    }
  },

  // Update user active status (activate/suspend)
  updateUserActiveStatus: async (userId, isActive) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/users/${userId}/active`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Error updating user active status:', error);
      return { success: false, message: 'Failed to update user status' };
    }
  },

  // Suspend user (admin action with proper case_id = 1)
  suspendUser: async (userId, reason = '') => {
    try {
      const response = await axios.put(`${API_BASE_URL}/users/${userId}/suspend`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error suspending user:', error);
      return { success: false, message: 'Failed to suspend user' };
    }
  },

  // Get farmer details by user_id
  getFarmerDetails: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/farmer-details`);
      return response.data;
    } catch (error) {
      console.error('Error fetching farmer details:', error);
      return { success: false, message: 'Failed to fetch farmer details' };
    }
  },

  // Get buyer details by user_id
  getBuyerDetails: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/buyer-details`);
      return response.data;
    } catch (error) {
      console.error('Error fetching buyer details:', error);
      return { success: false, message: 'Failed to fetch buyer details' };
    }
  }
};
