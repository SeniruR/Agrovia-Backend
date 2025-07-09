// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API service for crop posts
class CropPostAPI {
  // Helper method to get auth token
  static getAuthToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  // Helper method to create headers
  static getHeaders(isFormData = false) {
    const headers = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Create a new crop post
  static async createCropPost(cropData, images = []) {
    try {
      const formData = new FormData();
      
      // Append crop data
      Object.keys(cropData).forEach(key => {
        if (cropData[key] !== null && cropData[key] !== undefined) {
          formData.append(key, cropData[key]);
        }
      });
      
      // Append images
      images.forEach((image, index) => {
        formData.append('images', image);
      });

      const response = await fetch(`${API_BASE_URL}/crop-posts`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create crop post');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating crop post:', error);
      throw error;
    }
  }

  // Get all crop posts with filtering
  static async getAllCropPosts(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const url = `${API_BASE_URL}/crop-posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch crop posts');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching crop posts:', error);
      throw error;
    }
  }

  // Get crop post by ID
  static async getCropPostById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/crop-posts/${id}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch crop post');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching crop post:', error);
      throw error;
    }
  }

  // Get farmer's crop posts (updated endpoint to match backend route)
  static async getFarmerCropPosts(page = 1, limit = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/crop-posts/user/my-posts?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch farmer crop posts');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching farmer crop posts:', error);
      throw error;
    }
  }

  // Update crop post
  static async updateCropPost(id, cropData, images = []) {
    try {
      const formData = new FormData();
      
      // Append crop data
      Object.keys(cropData).forEach(key => {
        if (cropData[key] !== null && cropData[key] !== undefined) {
          formData.append(key, cropData[key]);
        }
      });
      
      // Append images
      images.forEach((image, index) => {
        formData.append('images', image);
      });

      const response = await fetch(`${API_BASE_URL}/crop-posts/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update crop post');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating crop post:', error);
      throw error;
    }
  }

  // Delete crop post
  static async deleteCropPost(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/crop-posts/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete crop post');
      }
      
      return data;
    } catch (error) {
      console.error('Error deleting crop post:', error);
      throw error;
    }
  }

  // Search crop posts
  static async searchCropPosts(query, filters = {}) {
    try {
      const queryParams = new URLSearchParams({ q: query });
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/crop-posts/search?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to search crop posts');
      }
      
      return data;
    } catch (error) {
      console.error('Error searching crop posts:', error);
      throw error;
    }
  }

  // Get crop statistics
  static async getCropStatistics() {
    try {
      const response = await fetch(`${API_BASE_URL}/crop-posts/statistics`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch statistics');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

export default CropPostAPI;
