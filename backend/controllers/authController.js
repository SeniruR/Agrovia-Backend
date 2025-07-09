// Register shop owner
const ShopOwner = require('../models/ShopOwner');
const registerShopOwner = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      password,
      phone_number,
      district,
      nic,
      address,
      shop_name,
      business_registration_number,
      shop_address,
      shop_phone_number,
      shop_email,
      shop_description,
      shop_category,
      operating_hours,
      opening_days,
      delivery_areas
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    // Check if NIC already exists
    const existingNIC = await User.findByNIC(nic);
    if (existingNIC) {
      return res.status(400).json({ success: false, message: 'User with this NIC number already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userData = {
      full_name,
      email,
      password_hash: hashedPassword,
      phone_number,
      district,
      nic,
      address: address || null,
      profile_image: req.file ? req.file.filename : null,
      user_type: 3 // 3 = shop owner
    };
    const result = await User.create(userData);
    const userId = result.user_id || result.insertId || result.id;

    // Insert shop owner-specific data
    await ShopOwner.create({
      user_id: userId,
      shop_name,
      business_registration_number,
      shop_address,
      shop_phone_number,
      shop_email,
      shop_description,
      shop_category,
      operating_hours,
      opening_days,
      delivery_areas,
      shop_license: req.files && req.files.shop_license ? req.files.shop_license[0].filename : null,
      shop_image: req.files && req.files.shop_image ? req.files.shop_image[0].filename : null
    });

    res.status(201).json({ success: true, message: 'Shop owner registered successfully' });
  } catch (error) {
    next(error);
  }
};
// Register buyer
const registerBuyer = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      contact_number,
      district,
      nic_number,
      company_name,
      company_type,
      company_address,
      payment_offer
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Check if NIC already exists
    const existingNIC = await User.findByNIC(nic_number);
    if (existingNIC) {
      return res.status(400).json({ success: false, message: 'User with this NIC number already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userData = {
      full_name: name,
      email,
      password_hash: hashedPassword,
      phone_number: contact_number,
      district,
      nic: nic_number,
      address: company_address || null,
      profile_image: req.file ? req.file.filename : null,
      user_type: 2 // 2 = buyer
    };

    const result = await User.create(userData);
    // Support both possible return keys from User.create
    const userId = result.user_id || result.insertId || result.id;

    // Insert buyer-specific data
    const Buyer = require('../models/Buyer');
    await Buyer.create({
      user_id: userId,
      company_name,
      company_type,
      company_address,
      profile_image: req.file ? req.file.filename : null,
      payment_offer
    });

    res.status(201).json({ success: true, message: 'Buyer registered successfully' });
  } catch (error) {
    next(error);
  }
};
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { generateToken } = require('../middleware/auth');
const { hashPassword, comparePassword, sanitizeUser, formatResponse } = require('../utils/helpers');
const FarmerDetails = require('../models/FarmerDetails');

// Register farmer
const registerFarmer = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      contact_number,
      district,
      land_size,
      nic_number,
      organization_id
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json(
        formatResponse(false, 'User with this email already exists')
      );
    }

    // Check if NIC already exists (use correct DB column)
    const existingNIC = await User.findByNIC(req.body.nic_number || req.body.nic);
    if (existingNIC) {
      return res.status(400).json(
        formatResponse(false, 'User with this NIC number already exists')
      );
    }

    // Optionally, verify organization_id exists (if provided)
    if (organization_id) {
      const organizationExists = await Organization.findById(organization_id);
      if (!organizationExists) {
        return res.status(400).json(
          formatResponse(false, 'Selected organization does not exist')
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user

    // Map nic_number to nic for DB
    const userData = {
      full_name: name,
      email,
      password_hash: hashedPassword,
      phone_number: contact_number,
      district,
      land_size: parseFloat(land_size),
      nic: nic_number,
      address: req.body.address || null,
      profile_image: req.file ? req.file.filename : null,
      user_type: 1, // assuming 1 = farmer
      birth_date: req.body.birth_date || null,
      description: req.body.description || null,
      division_gramasewa_number: req.body.division_gramasewa_number || null,
      organization_id: organization_id || null,
      farming_experience: req.body.farming_experience || null,
      cultivated_crops: req.body.cultivated_crops || null,
      irrigation_system: req.body.irrigation_system || null,
      soil_type: req.body.soil_type || null,
      farming_certifications: req.body.farming_certifications || null
    };

    const result = await User.create(userData);

    // Get created user
    const newUser = await User.findById(result.insertId);
    const sanitizedUser = sanitizeUser(newUser);

    // Generate token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json(
      formatResponse(true, 'Farmer registered successfully', {
        user: sanitizedUser,
        token
      })
    );
  } catch (error) {
    next(error);
  }
};

// Register organization committee member
const registerCommitteeMember = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      contact_number,
      district,
      nic_number,
      organization_committee_number
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json(
        formatResponse(false, 'User with this email already exists')
      );
    }

    // Check if NIC already exists (use correct DB column)
    const existingNIC = await User.findByNIC(req.body.nic_number || req.body.nic);
    if (existingNIC) {
      return res.status(400).json(
        formatResponse(false, 'User with this NIC number already exists')
      );
    }

    // Verify organization committee number exists
    const organizationExists = await Organization.exists(organization_committee_number);
    if (!organizationExists) {
      return res.status(400).json(
        formatResponse(false, 'Organization committee number does not exist')
      );
    }

    // Check if certificate file was uploaded
    if (!req.file) {
      return res.status(400).json(
        formatResponse(false, 'Certificate document is required for committee members')
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userData = {
      name,
      email,
      password: hashedPassword,
      contact_number,
      district,
      nic_number,
      role: 'organization_committee_member',
      organization_committee_number,
      certificate_path: req.file.path
    };

    const result = await User.create(userData);

    // Get created user
    const newUser = await User.findById(result.insertId);
    const sanitizedUser = sanitizeUser(newUser);

    // Generate token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json(
      formatResponse(true, 'Organization committee member registered successfully', {
        user: sanitizedUser,
        token
      })
    );
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json(
        formatResponse(false, 'Invalid email or password')
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json(
        formatResponse(false, 'Account is deactivated')
      );
    }

    // Compare password (use password_hash column)
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json(
        formatResponse(false, 'Invalid email or password')
      );
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Sanitize user data
    const sanitizedUser = sanitizeUser(user);

    res.json(
      formatResponse(true, 'Login successful', {
        user: sanitizedUser,
        token
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const sanitizedUser = sanitizeUser(req.user);
    res.json(
      formatResponse(true, 'Profile retrieved successfully', { user: sanitizedUser })
    );
  } catch (error) {
    next(error);
  }
};

// Get current user profile with farmer details
const getProfileWithFarmerDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    let farmerDetails = null;
    if (user.user_type === 1) { // 1 = farmer
      farmerDetails = await FarmerDetails.findByUserId(user.id);
    }
    res.json({
      success: true,
      user: {
        ...sanitizeUser(user),
        farmer_details: farmerDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;

    const users = await User.findAll(50, 0, role);

    res.json(
      formatResponse(true, 'Users retrieved successfully', {
        users
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerFarmer,
  registerCommitteeMember,
  login,
  getProfile,
  getAllUsers,
  registerBuyer,
  registerShopOwner,
  getProfileWithFarmerDetails
};
