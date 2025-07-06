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
  organization_committee_number: Joi.string().min(1).max(50).required(),
  address: Joi.string().allow('').max(500),
  profile_image: Joi.any(),
  birth_date: Joi.string().allow(''),
  description: Joi.string().allow('').max(1000),
  division_gramasewa_number: Joi.string().allow('').max(100),
  farming_experience: Joi.string().allow('').max(100),
  cultivated_crops: Joi.string().allow('').max(100),
  irrigation_system: Joi.string().allow('').max(100),
  soil_type: Joi.string().allow('').max(100),
  farming_certifications: Joi.string().allow('').max(255)
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

module.exports = {
  registerFarmerSchema,
  registerCommitteeMemberSchema,
  registerBuyerSchema,
  loginSchema,
  organizationSchema,
  validate
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
