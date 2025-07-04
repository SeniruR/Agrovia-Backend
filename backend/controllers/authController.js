const bcrypt = require('bcrypt');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { generateToken } = require('../middleware/auth');
const { hashPassword, comparePassword, sanitizeUser, formatResponse } = require('../utils/helpers');

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
      organization_committee_number
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

    // Verify organization committee number exists
    const organizationExists = await Organization.exists(organization_committee_number);
    if (!organizationExists) {
      return res.status(400).json(
        formatResponse(false, 'Organization committee number does not exist')
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
      land_size: parseFloat(land_size),
      nic_number,
      role: 'farmer',
      organization_committee_number
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

    // Check if NIC already exists
    const existingNIC = await User.findByNIC(nic_number);
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

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
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
  getAllUsers
};
