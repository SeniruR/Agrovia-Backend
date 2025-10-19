const Transporter = require('../models/Transporter');
const User = require('../models/User');
const { hashPassword } = require('../utils/helpers');

const registerTransporter = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      password,
      phone_number,
      district,
      nic,
      address,
      birth_date,
      vehicle_type,
      vehicle_number,
      vehicle_capacity,
      capacity_unit,
      license_number,
      license_expiry,
      additional_info,
      base_rate,
      per_km_rate
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
      full_name,
      email,
      password_hash: hashedPassword,
      phone_number,
      district,
      nic,
      address: address || null,
      profile_image,
      profile_image_mime,
      birth_date: birth_date || null,
      user_type: 4 // 4 = transporter
    };

    const result = await User.create(userData);
    const userId = result.user_id || result.insertId || result.id;

    // Insert transporter-specific data (no profile_image here)
    await Transporter.create({
      user_id: userId,
      vehicle_type,
      vehicle_number,
      vehicle_capacity,
      capacity_unit,
      license_number,
      license_expiry,
      additional_info,
      base_rate,
      per_km_rate
    });

    // After user is created, insert into disable_accounts with case_id = 3 (pending review)
    try {
      await require('../config/database').pool.execute(
        'INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, ?, NOW())',
        [userId, 3]
      );
    } catch (disableErr) {
      console.error('Failed to insert into disable_accounts for transporter:', disableErr);
      // Not fatal for registration, so do not throw
    }

    res.status(201).json({ success: true, message: 'Transporter registered successfully', data: { user: { ...userData, user_id: userId } } });
  } catch (error) {
    next(error);
  }
};

const getAllTransporters = async (req, res, next) => {
  try {
    const transporters = await Transporter.getAll();
    res.status(200).json({ 
      success: true, 
      message: 'Transporters retrieved successfully', 
      data: transporters 
    });
  } catch (error) {
    next(error);
  }
};

const getTransporterById = async (req, res, next) => {
  try {
    const transporterId = Number(req.params.id);
    if (!transporterId || Number.isNaN(transporterId)) {
      return res.status(400).json({ success: false, message: 'Invalid transporter id' });
    }

    const transporter = await Transporter.findById(transporterId);
    if (!transporter) {
      return res.status(404).json({ success: false, message: 'Transporter not found', data: null });
    }

    res.status(200).json({
      success: true,
      message: 'Transporter retrieved successfully',
      data: transporter
    });
  } catch (error) {
    next(error);
  }
};

const updateTransporterPricing = async (req, res, next) => {
  try {
    const transporterId = Number(req.params.id);
    if (!transporterId || Number.isNaN(transporterId)) {
      return res.status(400).json({ success: false, message: 'Invalid transporter id' });
    }

    const hasBaseRate = Object.prototype.hasOwnProperty.call(req.body, 'base_rate') ||
      Object.prototype.hasOwnProperty.call(req.body, 'baseRate');
    const hasPerKmRate = Object.prototype.hasOwnProperty.call(req.body, 'per_km_rate') ||
      Object.prototype.hasOwnProperty.call(req.body, 'perKmRate');

    const rawBase = hasBaseRate ? (req.body.base_rate ?? req.body.baseRate) : undefined;
    const rawPer = hasPerKmRate ? (req.body.per_km_rate ?? req.body.perKmRate) : undefined;

    const sanitizeRate = (key, value) => {
      if (value === undefined) return { shouldUpdate: false };
      if (value === null) return { shouldUpdate: true, value: null };
      const trimmed = String(value).trim();
      if (trimmed === '') {
        return { shouldUpdate: true, value: null };
      }
      const num = Number(trimmed);
      if (Number.isNaN(num) || num < 0) {
        throw new Error(`${key} must be a non-negative number`);
      }
      return { shouldUpdate: true, value: num.toString() };
    };

    let updates = {};
    try {
      const baseResult = sanitizeRate('base_rate', rawBase);
      if (baseResult.shouldUpdate) {
        updates.base_rate = baseResult.value;
      }
      const perResult = sanitizeRate('per_km_rate', rawPer);
      if (perResult.shouldUpdate) {
        updates.per_km_rate = perResult.value;
      }
    } catch (validationErr) {
      return res.status(400).json({ success: false, message: validationErr.message });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No pricing values supplied' });
    }

    const result = await Transporter.updatePricing(transporterId, updates);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Transporter not found' });
    }

    // Return updated transporter record
    const transporter = await Transporter.findById(transporterId);

    res.status(200).json({
      success: true,
      message: 'Transporter pricing updated successfully',
      data: transporter || null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerTransporter, getAllTransporters, getTransporterById, updateTransporterPricing };