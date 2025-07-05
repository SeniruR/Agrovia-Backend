const CropPost = require('../models/CropPost');
const path = require('path');
const fs = require('fs');

class CropPostController {
  // Create a new crop post
  static async createCropPost(req, res) {
    try {

      const {
        cropName,
        cropCategory,
        variety,
        quantity,
        unit,
        pricePerUnit,
        harvestDate,
        expiryDate,
        location,
        district,
        description,
        farmerName,
        contactNumber,
        email,
        organicCertified,
        pesticideFree,
        freshlyHarvested
      } = req.body;

      // Get farmer ID from authenticated user or create a farmer entry
      const farmerId = req.user ? req.user.id : null;
      
      if (!farmerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to post crops'
        });
      }

      // Handle uploaded images
      let imageFiles = [];
      if (req.files && req.files.length > 0) {
        imageFiles = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size
        }));
      }

      const cropData = {
        farmer_id: farmerId,
        crop_name: cropName,
        crop_category: cropCategory,
        variety,
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(pricePerUnit),
        harvest_date: harvestDate,
        expiry_date: expiryDate,
        location,
        district,
        description,
        organic_certified: organicCertified === 'true' || organicCertified === true,
        pesticide_free: pesticideFree === 'true' || pesticideFree === true,
        freshly_harvested: freshlyHarvested === 'true' || freshlyHarvested === true,
        contact_number: contactNumber,
        email,
        images: imageFiles
      };

      const newPost = await CropPost.create(cropData);

      res.status(201).json({
        success: true,
        message: 'Crop post created successfully',
        data: newPost
      });

    } catch (error) {
      console.error('Error creating crop post:', error);
      
      // Clean up uploaded files if there was an error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get all crop posts with filtering and pagination
  static async getAllCropPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        crop_category,
        district,
        crop_name,
        min_price,
        max_price,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      const filters = {};
      if (crop_category) filters.crop_category = crop_category;
      if (district) filters.district = district;
      if (crop_name) filters.crop_name = crop_name;
      if (min_price) filters.min_price = min_price;
      if (max_price) filters.max_price = max_price;

      const result = await CropPost.getAll(
        parseInt(page),
        parseInt(limit),
        filters
      );

      res.json({
        success: true,
        message: 'Crop posts retrieved successfully',
        data: result.posts,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error fetching crop posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop posts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop post by ID
  static async getCropPostById(req, res) {
    try {
      const { id } = req.params;

      const post = await CropPost.getById(id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      res.json({
        success: true,
        message: 'Crop post retrieved successfully',
        data: post
      });

    } catch (error) {
      console.error('Error fetching crop post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop posts by farmer (authenticated user's posts)
  static async getFarmerCropPosts(req, res) {
    try {
      const farmerId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const result = await CropPost.getByFarmerId(
        farmerId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        message: 'Farmer crop posts retrieved successfully',
        data: result.posts,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error fetching farmer crop posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve farmer crop posts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update crop post
  static async updateCropPost(req, res) {
    try {

      const { id } = req.params;
      const farmerId = req.user.id;

      const {
        cropName,
        cropCategory,
        variety,
        quantity,
        unit,
        pricePerUnit,
        harvestDate,
        expiryDate,
        location,
        district,
        description,
        contactNumber,
        email,
        organicCertified,
        pesticideFree,
        freshlyHarvested
      } = req.body;

      // Handle uploaded images
      let imageFiles = [];
      if (req.files && req.files.length > 0) {
        imageFiles = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size
        }));
      }

      const updateData = {
        crop_name: cropName,
        crop_category: cropCategory,
        variety,
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(pricePerUnit),
        harvest_date: harvestDate,
        expiry_date: expiryDate,
        location,
        district,
        description,
        organic_certified: organicCertified === 'true' || organicCertified === true,
        pesticide_free: pesticideFree === 'true' || pesticideFree === true,
        freshly_harvested: freshlyHarvested === 'true' || freshlyHarvested === true,
        contact_number: contactNumber,
        email,
        images: imageFiles
      };

      const updated = await CropPost.update(id, farmerId, updateData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found or you do not have permission to update it'
        });
      }

      res.json({
        success: true,
        message: 'Crop post updated successfully'
      });

    } catch (error) {
      console.error('Error updating crop post:', error);
      
      // Clean up uploaded files if there was an error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete crop post
  static async deleteCropPost(req, res) {
    try {
      const { id } = req.params;
      const farmerId = req.user.id;

      const deleted = await CropPost.delete(id, farmerId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found or you do not have permission to delete it'
        });
      }

      res.json({
        success: true,
        message: 'Crop post deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting crop post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete crop post',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get crop statistics (admin only)
  static async getCropStatistics(req, res) {
    try {
      const stats = await CropPost.getStatistics();

      res.json({
        success: true,
        message: 'Crop statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error fetching crop statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update crop post status (admin only)
  static async updateCropPostStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'pending', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Allowed values: active, inactive, pending, rejected'
        });
      }

      const updated = await CropPost.updateStatus(id, status);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Crop post not found'
        });
      }

      res.json({
        success: true,
        message: `Crop post status updated to ${status}`
      });

    } catch (error) {
      console.error('Error updating crop post status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update crop post status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Search crop posts
  static async searchCropPosts(req, res) {
    try {
      const { q, category, district, min_price, max_price } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const filters = {
        crop_name: q.trim()
      };

      if (category) filters.crop_category = category;
      if (district) filters.district = district;
      if (min_price) filters.min_price = min_price;
      if (max_price) filters.max_price = max_price;

      const result = await CropPost.getAll(1, 50, filters);

      res.json({
        success: true,
        message: 'Search results retrieved successfully',
        data: result.posts,
        total: result.pagination.total_items
      });

    } catch (error) {
      console.error('Error searching crop posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search crop posts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = CropPostController;
