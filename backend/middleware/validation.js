const Joi = require('joi');

// User registration validation schemas
const registerFarmerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).required(),
  district: Joi.string().min(2).max(100).required(),
  land_size: Joi.number().positive().precision(2).required(),
  nic_number: Joi.string().pattern(/^[0-9]{9}[VXvx]$|^[0-9]{12}$/).required(),
  organization_id: Joi.number().integer().positive().allow(null, '').optional(),
  address: Joi.string().allow('').max(500),
  profile_image: Joi.any(),
  birth_date: Joi.string().allow(''),
  description: Joi.string().allow('').max(1000),
  division_gramasewa_number: Joi.string().allow('').max(100),
  farming_experience: Joi.string().allow('').max(100),
  cultivated_crops: Joi.string().allow('').max(100),
  irrigation_system: Joi.string().allow('').max(100),
  soil_type: Joi.string().allow('').max(100),
  farming_certifications: Joi.string().allow('').max(255),
  user_type: Joi.string().valid('1', '1.1').optional()
});

const registerCommitteeMemberSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).required(),
  district: Joi.string().min(2).max(100).required(),
  nic_number: Joi.string().pattern(/^[0-9]{9}[VXvx]$|^[0-9]{12}$/).required(),
  organization_committee_number: Joi.string().min(1).max(50).required()
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

// Organization validation schema
const organizationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  committee_number: Joi.string().min(1).max(50).required(),
  district: Joi.string().min(2).max(100).required()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    next();
  };
};

// Buyer registration validation schema (no organization_committee_number required)
const registerBuyerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  contact_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).required(),
  district: Joi.string().min(2).max(100).required(),
  nic_number: Joi.string().pattern(/^[0-9]{9}[VXvx]$|^[0-9]{12}$/).required(),
  company_name: Joi.string().min(2).max(255).allow('').optional(),
  company_type: Joi.string().min(2).max(100).allow('').optional(),
  company_address: Joi.string().allow('').max(500),
  profile_image: Joi.any(),
  payment_offer: Joi.string().allow('').max(100)
});

// Crop Post validation schemas
const createCropPostSchema = Joi.object({
  cropName: Joi.string().min(2).max(100).required()
    .messages({
      'string.empty': 'Crop name is required',
      'string.min': 'Crop name must be at least 2 characters',
      'string.max': 'Crop name cannot exceed 100 characters'
    }),
  
  cropCategory: Joi.string().valid('vegetables', 'grains').required()
    .messages({
      'any.only': 'Crop category must be either vegetables or grains',
      'any.required': 'Crop category is required'
    }),
  
  variety: Joi.string().max(100).allow('').optional(),
  
  quantity: Joi.number().positive().precision(2).required()
    .messages({
      'number.positive': 'Quantity must be greater than 0',
      'any.required': 'Quantity is required'
    }),
  
  unit: Joi.string().valid('kg', 'g', 'tons', 'bags', 'pieces', 'bunches').required()
    .messages({
      'any.only': 'Invalid unit type',
      'any.required': 'Unit is required'
    }),
  
  pricePerUnit: Joi.number().positive().precision(2).required()
    .messages({
      'number.positive': 'Price must be greater than 0',
      'any.required': 'Price per unit is required'
    }),
  
  harvestDate: Joi.date().iso().required()
    .messages({
      'date.format': 'Invalid harvest date format',
      'any.required': 'Harvest date is required'
    }),
  
  expiryDate: Joi.date().iso().greater(Joi.ref('harvestDate')).allow('').optional()
    .messages({
      'date.greater': 'Expiry date must be after harvest date'
    }),
  
  location: Joi.string().min(10).max(500).required()
    .messages({
      'string.min': 'Please provide a detailed location (at least 10 characters)',
      'string.max': 'Location description is too long',
      'any.required': 'Location is required'
    }),
  
  district: Joi.string().valid(
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Moneragala', 'Ratnapura', 'Kegalle'
  ).required()
    .messages({
      'any.only': 'Please select a valid Sri Lankan district',
      'any.required': 'District is required'
    }),
  
  description: Joi.string().max(1000).allow('').optional(),
  
  farmerName: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Farmer name must be at least 2 characters',
      'any.required': 'Farmer name is required'
    }),
  
  contactNumber: Joi.string().pattern(/^(\+94|0)[0-9]{9}$/).required()
    .messages({
      'string.pattern.base': 'Invalid Sri Lankan phone number format',
      'any.required': 'Contact number is required'
    }),
  
  email: Joi.string().email().allow('').optional()
    .messages({
      'string.email': 'Invalid email format'
    }),
  
  organicCertified: Joi.boolean().default(false),
  pesticideFree: Joi.boolean().default(false),
  freshlyHarvested: Joi.boolean().default(false)
});

const updateCropPostSchema = Joi.object({
  cropName: Joi.string().min(2).max(100).optional(),
  cropCategory: Joi.string().valid('vegetables', 'grains').optional(),
  variety: Joi.string().max(100).allow('').optional(),
  quantity: Joi.number().positive().precision(2).optional(),
  unit: Joi.string().valid('kg', 'g', 'tons', 'bags', 'pieces', 'bunches').optional(),
  pricePerUnit: Joi.number().positive().precision(2).optional(),
  harvestDate: Joi.date().iso().optional(),
  expiryDate: Joi.date().iso().allow('').optional(),
  location: Joi.string().min(10).max(500).optional(),
  district: Joi.string().valid(
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Moneragala', 'Ratnapura', 'Kegalle'
  ).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  contactNumber: Joi.string().pattern(/^(\+94|0)[0-9]{9}$/).optional(),
  email: Joi.string().email().allow('').optional(),
  organicCertified: Joi.boolean().optional(),
  pesticideFree: Joi.boolean().optional(),
  freshlyHarvested: Joi.boolean().optional()
});

// Validation middleware functions for crop posts
const validateCreateCropPost = (req, res, next) => {
  const { error } = createCropPostSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  next();
};

const validateUpdateCropPost = (req, res, next) => {
  const { error } = updateCropPostSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  next();
};

module.exports = {
  registerFarmerSchema,
  registerCommitteeMemberSchema,
  registerBuyerSchema,
  loginSchema,
  organizationSchema,
  validate,
  createCropPostSchema,
  updateCropPostSchema,
  validateCreateCropPost,
  validateUpdateCropPost
  ,
  // Shop owner registration validation schema
  registerShopOwnerSchema: Joi.object({
    full_name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    phone_number: Joi.string().pattern(/^[0-9]{10}$/).required(),
    district: Joi.string().min(2).max(100).required(),
    nic: Joi.string().pattern(/^[0-9]{9}[VXvx]$|^[0-9]{12}$/).required(),
    address: Joi.string().allow('').max(500),
    profile_image: Joi.any(),
    shop_name: Joi.string().min(2).max(255).required(),
    business_registration_number: Joi.string().min(2).max(255).required(),
    shop_address: Joi.string().min(2).max(500).required(),
    shop_phone_number: Joi.string().pattern(/^[0-9]{10}$/).required(),
    shop_email: Joi.string().email().allow(''),
    shop_description: Joi.string().allow('').max(1000),
    shop_category: Joi.string().min(2).max(100).required(),
    operating_hours: Joi.string().min(2).max(100).required(),
    opening_days: Joi.array().items(Joi.string()).min(1).required(),
    delivery_areas: Joi.string().allow('').max(500),
    shop_license: Joi.any(),
    shop_image: Joi.any()
  })
};
