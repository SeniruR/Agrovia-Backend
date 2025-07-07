const Joi = require('joi');

const cropPostSchema = Joi.object({
  crop_category: Joi.string().valid('vegetables', 'grains').required(),
  crop_name: Joi.string().min(2).max(100).required(),
  variety: Joi.string().max(100).optional().allow(''),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().valid('kg', 'g', 'tons', 'bags', 'pieces', 'bunches').required(),
  price_per_unit: Joi.number().positive().required(),
  harvest_date: Joi.date().required(),
  expiry_date: Joi.date().optional().allow(null),
  location: Joi.string().min(10).max(500).required(),
  district: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(1000).optional().allow(''),
  farmer_name: Joi.string().min(2).max(100).required(),
  contact_number: Joi.string().pattern(/^\+?[0-9\s\-\(\)]{10,20}$/).required(),
  email: Joi.string().email().optional().allow(''),
  organic_certified: Joi.boolean().optional(),
  pesticide_free: Joi.boolean().optional(),
  freshly_harvested: Joi.boolean().optional()
});

const updateCropPostSchema = Joi.object({
  crop_category: Joi.string().valid('vegetables', 'grains').optional(),
  crop_name: Joi.string().min(2).max(100).optional(),
  variety: Joi.string().max(100).optional().allow(''),
  quantity: Joi.number().positive().optional(),
  unit: Joi.string().valid('kg', 'g', 'tons', 'bags', 'pieces', 'bunches').optional(),
  price_per_unit: Joi.number().positive().optional(),
  harvest_date: Joi.date().optional(),
  expiry_date: Joi.date().optional().allow(null),
  location: Joi.string().min(10).max(500).optional(),
  district: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  farmer_name: Joi.string().min(2).max(100).optional(),
  contact_number: Joi.string().pattern(/^\+?[0-9\s\-\(\)]{10,20}$/).optional(),
  email: Joi.string().email().optional().allow(''),
  organic_certified: Joi.boolean().optional(),
  pesticide_free: Joi.boolean().optional(),
  freshly_harvested: Joi.boolean().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'sold', 'available').optional()
});

const validateCropPost = (req, res, next) => {
  // Make validation optional for testing
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Validation bypassed for development');
    return next();
  }
  
  const { error } = cropPostSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  next();
};

const validateCropPostUpdate = (req, res, next) => {
  const { error } = updateCropPostSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  next();
};

module.exports = {
  validateCropPost,
  validateCropPostUpdate
};
