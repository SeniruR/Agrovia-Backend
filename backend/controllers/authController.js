const { hashPassword, comparePassword, sanitizeUser, formatResponse } = require('../utils/helpers');
// Update user profile and farmer details
const updateProfileWithFarmerDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pool = require('../config/database').pool;

    // Parse form data (for file upload support)
    let data = req.body;
    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/${req.file.filename}`;
    }

    // Build user update fields
    const userFields = {
      full_name: data.fullName,
      email: data.email,
      phone_number: data.phoneNumber,
      district: data.district,
      nic: data.nic,
      address: data.address,
    };
    if (profileImagePath) userFields.profile_image = profileImagePath;

    // Build farmer_details update fields
    const farmerFields = {
      land_size: data.landSize,
      birth_date: data.birthDate,
      description: data.description,
      division_gramasewa_number: data.divisionGramasewaNumber,
      organization_committee_number: data.organizationCommitteeNumber,
      farming_experience: data.farmingExperience,
      cultivated_crops: data.primaryCrops,
      secondary_crops: data.secondaryCrops,
      farming_methods: data.farmingMethods,
      irrigation_system: data.irrigationSystem,
      soil_type: data.soilType,
      education: data.educationLevel,
      annual_income: data.annualIncome,
      farming_certifications: data.farmingCertifications,
    };

    // Update users table
    const userSet = Object.keys(userFields).map(f => `${f} = ?`).join(', ');
    const userVals = Object.values(userFields);
    await pool.query(`UPDATE users SET ${userSet} WHERE id = ?`, [...userVals, userId]);

    // Check if farmer_details exists
    const [rows] = await pool.query('SELECT user_id FROM farmer_details WHERE user_id = ?', [userId]);
    if (rows.length > 0) {
      // Update
      const farmerSet = Object.keys(farmerFields).map(f => `${f} = ?`).join(', ');
      const farmerVals = Object.values(farmerFields);
      await pool.query(`UPDATE farmer_details SET ${farmerSet} WHERE user_id = ?`, [...farmerVals, userId]);
    } else {
      // Insert
      await pool.query(
        `INSERT INTO farmer_details (user_id, ${Object.keys(farmerFields).join(', ')}) VALUES (?, ${Object.keys(farmerFields).map(() => '?').join(', ')})`,
        [userId, ...Object.values(farmerFields)]
      );
    }

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile', error: err.message });
  }
};
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

    // Check if NIC already exists
    const existingNIC = await User.findByNIC(nic_number);
    if (existingNIC) {
      return res.status(400).json(
        formatResponse(false, 'User with this NIC number already exists')
      );
    }

    // Optionally, verify organization_id exists (if provided)
    if (organization_id) {
      // You can add organization existence check here if needed
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Prepare image buffer and mimetype for BLOB storage
    let profile_image = null;
    let profile_image_mime = null;
    if (req.file) {
      profile_image = req.file.buffer;
      profile_image_mime = req.file.mimetype;
    }

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
      profile_image,
      profile_image_mime,
      user_type: 1,
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
    // Support multiple possible return keys for user ID
    const userId = result.user_id || result.insertId || result.id;

    // After user is created, insert into disable_accounts with case_id = 2
    try {
      await require('../config/database').pool.execute(
        'INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, ?, NOW())',
        [userId, 2]
      );
    } catch (disableErr) {
      console.error('Failed to insert into disable_accounts:', disableErr);
      // Not fatal for registration, so do not throw
    }

    // Get created user
    const newUser = await User.findById(userId);
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
      // Optionally, fetch disable reason from disable_accounts/disable_account_cases
      let disableReason = null;
      try {
        const [rows] = await require('../config/database').pool.execute(
          `SELECT d.case_id, c.case_name, d.created_at
           FROM disable_accounts d
           JOIN disable_account_cases c ON d.case_id = c.id
           WHERE d.user_id = ?
           ORDER BY d.created_at DESC
           LIMIT 1`,
          [user.id]
        );
        if (rows.length > 0) {
          disableReason = rows[0].case_name;
        }
      } catch (err) {
        // ignore DB error, fallback to generic
      }
      return res.status(403).json(
        formatResponse(false, disableReason || 'Account is deactivated', { user })
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
    if (user.user_type === '1') { // 1 = farmer
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
  getProfileWithFarmerDetails,
  updateProfileWithFarmerDetails
};
