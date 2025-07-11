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
      additional_info
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
      additional_info
    });

    res.status(201).json({ success: true, message: 'Transporter registered successfully', data: { user: { ...userData, user_id: userId } } });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerTransporter };
