const { hashPassword, comparePassword, sanitizeUser, formatResponse } = require('../utils/helpers');

// Image upload limits and validation
const DEFAULT_PROFILE_IMAGE_MAX_BYTES = process.env.PROFILE_IMAGE_MAX_BYTES ? parseInt(process.env.PROFILE_IMAGE_MAX_BYTES, 10) : (5 * 1024 * 1024); // 5MB default
const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

function validateImageFile(file, maxBytes = DEFAULT_PROFILE_IMAGE_MAX_BYTES) {
  if (!file) return { ok: true };
  if (!file.mimetype || !ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
    return { ok: false, message: 'Profile image must be a JPEG, PNG, WEBP, GIF or SVG file.' };
  }
  if (file.size > maxBytes) {
    return { ok: false, message: `Profile image must be smaller than ${Math.round(maxBytes / (1024 * 1024))}MB.` };
  }
  return { ok: true };
}
// Update user profile and farmer details
const updateProfileWithFarmerDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const pool = require('../config/database').pool;
    const User = require('../models/User');
    const FarmerDetails = require('../models/FarmerDetails');
    const ShopOwner = require('../models/ShopOwner');

    // Parse form data (for file upload support)
    let data = req.body;
    console.log('Received form data keys:', Object.keys(data));
    console.log('Coordinate values - latitude:', data.latitude, 'longitude:', data.longitude);
    
    // Handle profile image upload (memory storage)
    let profileImageBuffer = null;
    let profileImageMime = null;
    if (req.file) {
      const check = validateImageFile(req.file);
      if (!check.ok) return res.status(400).json({ success: false, message: check.message });
      profileImageBuffer = req.file.buffer;
      profileImageMime = req.file.mimetype;
      console.log(`Profile image received: ${req.file.buffer.length} bytes, type: ${req.file.mimetype}`);
    }

    // Build user update fields
    const userFields = {
      full_name: data.full_name || data.name || data.fullName,
      email: data.email,
      phone_number: data.phone_number || data.phoneNumber,
      district: data.district,
      nic: data.nic,
      address: data.address,
    };
    
    // Add coordinates if provided
    if (data.latitude !== undefined) userFields.latitude = data.latitude;
    if (data.longitude !== undefined) userFields.longitude = data.longitude;
    
    if (profileImageBuffer) {
      userFields.profile_image = profileImageBuffer;
      userFields.profile_image_mime = profileImageMime;
    }

    // Build farmer_details update fields - only include valid columns
    const farmerFields = {};
    
    // Only add fields that exist in the database
    if (data.landSize !== undefined) farmerFields.land_size = data.landSize;
    if (data.description !== undefined) farmerFields.description = data.description;
    if (data.divisionGramasewaNumber !== undefined) farmerFields.division_gramasewa_number = data.divisionGramasewaNumber;
    if (data.organizationId !== undefined) farmerFields.organization_id = data.organizationId;
    if (data.farmingExperience !== undefined) farmerFields.farming_experience = data.farmingExperience;
    if (data.cultivatedCrops !== undefined) farmerFields.cultivated_crops = data.cultivatedCrops;
    if (data.irrigationSystem !== undefined) farmerFields.irrigation_system = data.irrigationSystem;
    if (data.soilType !== undefined) farmerFields.soil_type = data.soilType;
    if (data.farmingCertifications !== undefined) farmerFields.farming_certifications = data.farmingCertifications;

    console.log('Final farmerFields being processed:', farmerFields);

    // Update users table
    if (Object.keys(userFields).length > 0) {
      const userSet = Object.keys(userFields).map(f => `${f} = ?`).join(', ');
      const userVals = Object.values(userFields);
      console.log('Updating users table with fields:', Object.keys(userFields));
      console.log('Profile image buffer size:', profileImageBuffer ? profileImageBuffer.length : 'No image');
      await pool.query(`UPDATE users SET ${userSet} WHERE id = ?`, [...userVals, userId]);
    }

    // Handle farmer_details only if there are fields to update/insert
    if (Object.keys(farmerFields).length > 0) {
      const [rows] = await pool.query('SELECT user_id FROM farmer_details WHERE user_id = ?', [userId]);
      if (rows.length > 0) {
        // Update existing farmer_details
        const farmerSet = Object.keys(farmerFields).map(f => `${f} = ?`).join(', ');
        const farmerVals = Object.values(farmerFields);
        await pool.query(
          `UPDATE farmer_details SET ${farmerSet} WHERE user_id = ?`,
          [...farmerVals, userId]
        );
      } else {
        // Insert new farmer_details
        const fields = Object.keys(farmerFields);
        const placeholders = fields.map(() => '?').join(', ');
        await pool.query(
          `INSERT INTO farmer_details (user_id, ${fields.join(', ')}) VALUES (?, ${placeholders})`,
          [userId, ...Object.values(farmerFields)]
        );
      }
    }
    
    // Handle buyer_details only if user is a buyer and fields provided
    const buyerFields = {};
    if (data.company_name !== undefined || data.companyName !== undefined) buyerFields.company_name = data.company_name || data.companyName;
    if (data.company_type !== undefined || data.companyType !== undefined) buyerFields.company_type = data.company_type || data.companyType;
    if (data.company_address !== undefined || data.companyAddress !== undefined) buyerFields.company_address = data.company_address || data.companyAddress;
    if (data.payment_offer !== undefined || data.paymentOffer !== undefined) buyerFields.payment_offer = data.payment_offer || data.paymentOffer;
    if (Object.keys(buyerFields).length > 0) {
      const [rows] = await pool.query('SELECT user_id FROM buyer_details WHERE user_id = ?', [userId]);
      if (rows.length > 0) {
        // Update existing buyer_details
        const buyerSet = Object.keys(buyerFields).map(f => `${f} = ?`).join(', ');
        const buyerVals = Object.values(buyerFields);
        await pool.query(
          `UPDATE buyer_details SET ${buyerSet} WHERE user_id = ?`,
          [...buyerVals, userId]
        );
      } else {
        // Insert new buyer_details
        const fields = Object.keys(buyerFields);
        const placeholders = fields.map(() => '?').join(', ');
        await pool.query(
          `INSERT INTO buyer_details (user_id, ${fields.join(', ')}) VALUES (?, ${placeholders})`,
          [userId, ...Object.values(buyerFields)]
        );
      }
    }

    // Handle shop_details only if user is a shop owner and fields provided
    const shopFields = {};
    if (data.shop_name !== undefined || data.shopName !== undefined) shopFields.shop_name = data.shop_name || data.shopName;
    if (data.shop_address !== undefined || data.shopAddress !== undefined) shopFields.shop_address = data.shop_address || data.shopAddress;
    if (data.shop_description !== undefined || data.shopDescription !== undefined) shopFields.shop_description = data.shop_description || data.shopDescription;
    if (data.business_license !== undefined || data.businessLicense !== undefined) shopFields.business_license = data.business_license || data.businessLicense;
    if (data.business_registration_number !== undefined || data.businessRegistrationNumber !== undefined) shopFields.business_registration_number = data.business_registration_number || data.businessRegistrationNumber;
    if (data.opening_days !== undefined || data.openingDays !== undefined) shopFields.opening_days = JSON.stringify(data.opening_days || data.openingDays);
    if (data.shop_category !== undefined || data.shopCategory !== undefined) shopFields.shop_category = data.shop_category || data.shopCategory;
    if (data.operating_hours !== undefined || data.operatingHours !== undefined) shopFields.operating_hours = data.operating_hours || data.operatingHours;
    if (data.working_hours !== undefined || data.workingHours !== undefined) shopFields.operating_hours = data.working_hours || data.workingHours;
    if (data.shop_phone_number !== undefined || data.shopPhoneNumber !== undefined) shopFields.shop_phone_number = data.shop_phone_number || data.shopPhoneNumber;
    if (data.shop_email !== undefined || data.shopEmail !== undefined) shopFields.shop_email = data.shop_email || data.shopEmail;
    if (data.delivery_areas !== undefined || data.deliveryAreas !== undefined) shopFields.delivery_areas = data.delivery_areas || data.deliveryAreas;
    
    if (Object.keys(shopFields).length > 0) {
      // Check if user is shop owner before updating
      const currentUser = await User.findById(userId);
      if (currentUser && (currentUser.user_type === 'shop_owner' || currentUser.user_type === '3')) {
        await ShopOwner.updateByUserId(userId, shopFields);
      }
    }

    // Fetch and return the updated profile with associated details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found after update' });
    }
    
    let farmerDetails = null;
    let shopOwnerDetails = null;
    
    if (user.user_type === '1' || user.user_type === '1.1') { // 1 or 1.1 = farmer
      farmerDetails = await FarmerDetails.findByUserId(user.id);
    } else if (user.user_type === 'shop_owner' || user.user_type === '3') { // shop owner
      shopOwnerDetails = await ShopOwner.findByUserId(user.id);
    }
    
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        ...sanitizeUser(user),
        farmer_details: farmerDetails,
        shop_owner_details: shopOwnerDetails
      }
    });
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


    // Handle images and license as BLOBs
    const profileImageFile = req.files && req.files.profile_image ? req.files.profile_image[0] : null;
    const shopImageFile = req.files && req.files.shop_image ? req.files.shop_image[0] : null;
    const shopLicenseFile = req.files && req.files.shop_license ? req.files.shop_license[0] : null;

    // Validate profile image for shop owner registration as well
    if (profileImageFile) {
      const check = validateImageFile(profileImageFile);
      if (!check.ok) return res.status(400).json({ success: false, message: check.message });
    }
    // Optionally validate shop images similarly if needed (not enforced here)

    // Create user
    const userData = {
      full_name,
      email,
      password_hash: hashedPassword,
      phone_number,
      district,
      nic,
      address: address || null,
      latitude: req.body.latitude !== undefined ? req.body.latitude : (req.body.personalLatitude !== undefined ? req.body.personalLatitude : null),
      longitude: req.body.longitude !== undefined ? req.body.longitude : (req.body.personalLongitude !== undefined ? req.body.personalLongitude : null),
      profile_image: profileImageFile ? profileImageFile.buffer : null,
      profile_image_mime: profileImageFile ? profileImageFile.mimetype : null,
      user_type: 3 // 3 = shop owner
    };
    const result = await User.create(userData);
    const userId = result.user_id || result.insertId || result.id;

    // After user is created, insert into disable_accounts with case_id = 6 (shop owner registration)
    try {
      await require('../config/database').pool.execute(
        'INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, ?, NOW())',
        [userId, 6]
      );
    } catch (disableErr) {
      console.error('Failed to insert into disable_accounts for shop owner:', disableErr);
      // Not fatal for registration, so do not throw
    }

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
      latitude: req.body.shop_latitude !== undefined ? req.body.shop_latitude : null,
      longitude: req.body.shop_longitude !== undefined ? req.body.shop_longitude : null,
      shop_license: shopLicenseFile ? shopLicenseFile.buffer : null,
      shop_license_mime: shopLicenseFile ? shopLicenseFile.mimetype : null,
      shop_image: shopImageFile ? shopImageFile.buffer : null,
      shop_image_mime: shopImageFile ? shopImageFile.mimetype : null
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
      payment_offer,
      company_latitude,
      company_longitude
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

    // Validate uploaded file is an image (extra safety)
    let profile_image = null;
    let profile_image_mime = null;
    if (req.file) {
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ success: false, message: 'Profile image must be an image file.' });
      }
      profile_image = req.file.buffer;
      profile_image_mime = req.file.mimetype;
    }

    // Create user
    const userData = {
      full_name: name,
      email,
      password_hash: hashedPassword,
      phone_number: contact_number,
      district,
      nic: nic_number,
      address: req.body.address || null,
      latitude: req.body.latitude !== undefined ? req.body.latitude : null,
      longitude: req.body.longitude !== undefined ? req.body.longitude : null,
      profile_image,
      profile_image_mime,
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
      company_latitude: company_latitude !== undefined ? company_latitude : null,
      company_longitude: company_longitude !== undefined ? company_longitude : null,
      profile_image,
      profile_image_mime,
      payment_offer
    });

    // Get created user
    const newUser = await User.findById(userId);
    const sanitizedUser = sanitizeUser(newUser);

    // Always provide a default image URL if profile_image is missing/null
    if (!sanitizedUser.profile_image) {
      sanitizedUser.profile_image = 'https://via.placeholder.com/128x128/4ade80/ffffff?text=👤';
    }

    // Generate token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json(
      formatResponse(true, 'Buyer registered successfully', {
        user: sanitizedUser,
        token
      })
    );
  } catch (error) {
    next(error);
  }
};
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { generateToken } = require('../middleware/auth');
const FarmerDetails = require('../models/FarmerDetails');
const BuyerDetails = require('../models/Buyer');

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
      organization_id,
      latitude,
      longitude
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
      user_type: req.body.user_type || 1,
      birth_date: req.body.birth_date || null,
      description: req.body.description || null,
      division_gramasewa_number: req.body.division_gramasewa_number || null,
      organization_id: organization_id || null,
      farming_experience: req.body.farming_experience || null,
      cultivated_crops: req.body.cultivated_crops || null,
      irrigation_system: req.body.irrigation_system || null,
      soil_type: req.body.soil_type || null,
      farming_certifications: req.body.farming_certifications || null,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null
    };

    const result = await User.create(userData);
    // Support multiple possible return keys for user ID
    const userId = result.user_id || result.insertId || result.id;

    // After user is created, insert into disable_accounts with case_id = 2
    try {
      // If user_type is '1.1', use case_id = 3, else 2
      const caseId = (userData.user_type === '1.1') ? 3 : 2;
      await require('../config/database').pool.execute(
        'INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, ?, NOW())',
        [userId, caseId]
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

    // Always provide a default image URL if profile_image is missing/null
    if (!sanitizedUser.profile_image) {
      sanitizedUser.profile_image = 'https://via.placeholder.com/128x128/4ade80/ffffff?text=👤';
    }
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

// Get current user profile with associated details
const getProfileWithFarmerDetails = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const FarmerDetails = require('../models/FarmerDetails');
    const BuyerDetails = require('../models/Buyer');
    const ShopOwner = require('../models/ShopOwner');
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    let farmerDetails = null;
    let buyerDetails = null;
    let shopOwnerDetails = null;
    
    // Fetch farmer details if applicable
    if (user.user_type === '1' || user.user_type === '1.1') {
      farmerDetails = await FarmerDetails.findByUserId(user.id);
    }
    // Fetch buyer details if applicable
    if (user.user_type === '2') {
      buyerDetails = await BuyerDetails.findByUserId(user.id);
    }
    // Fetch shop owner details if applicable
    if (user.user_type === '3') {
      shopOwnerDetails = await ShopOwner.findByUserId(user.id);
    }
    
    return res.json({
      success: true,
      user: {
        ...sanitizeUser(user),
        farmer_details: farmerDetails,
        buyer_details: buyerDetails,
        shop_owner_details: shopOwnerDetails
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
