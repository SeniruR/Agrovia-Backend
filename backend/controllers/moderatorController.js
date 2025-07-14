const bcrypt = require('bcrypt');
const User = require('../models/User');
const { ModeratorSkillType, ModeratorSkillDemonstration } = require('../models/Moderator');
const { generateToken } = require('../middleware/auth');
const { hashPassword, sanitizeUser, formatResponse } = require('../utils/helpers');
const pool = require('../config/database').pool;

// Register moderator
const registerModerator = async (req, res, next) => {
  try {
    // Extract fields from form-data
    const {
      full_name,
      email,
      password,
      phone_number,
      district,
      nic,
      address,
      skill_description
    } = req.body;
    // Validate uploaded file is an image (extra safety)
    let profile_image = null;
    let profile_image_mime = null;
    if (req.file) {
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json(formatResponse(false, 'Only image files are allowed for profile image.'));
      }
      profile_image = req.file.buffer;
      profile_image_mime = req.file.mimetype;
    }
    // Arrays: skill_urls[], worker_ids[]
    let skill_urls = req.body['skill_urls[]'] || req.body.skill_urls || [];
    let worker_ids = req.body['worker_ids[]'] || req.body.worker_ids || [];
    if (typeof skill_urls === 'string') skill_urls = [skill_urls];
    if (typeof worker_ids === 'string') worker_ids = [worker_ids];

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json(formatResponse(false, 'User with this email already exists'));
    }
    const existingNIC = await User.findByNIC(nic);
    if (existingNIC) {
      return res.status(400).json(formatResponse(false, 'User with this NIC number already exists'));
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    // user_type: 4 = moderator (original value)
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
      user_type: 5,
    };
    const result = await User.create(userData);
    const userId = result.insertId || result.user_id || result.id;

    // Insert skill demonstration items
    // 1. URLs
    for (const url of skill_urls) {
      if (url && url.trim()) {
        const typeId = await ModeratorSkillType.getOrCreateType('url');
        await ModeratorSkillDemonstration.insert({ user_id: userId, data_type_id: typeId, data: url });
      }
    }
    // 2. Worker IDs
    for (const wid of worker_ids) {
      if (wid && wid.trim()) {
        const typeId = await ModeratorSkillType.getOrCreateType('worker_id');
        await ModeratorSkillDemonstration.insert({ user_id: userId, data_type_id: typeId, data: wid });
      }
    }
    // 3. Description
    if (skill_description && skill_description.trim()) {
      const typeId = await ModeratorSkillType.getOrCreateType('description');
      await ModeratorSkillDemonstration.insert({ user_id: userId, data_type_id: typeId, data: skill_description });
    }

    // Insert into disable_accounts (case_id = 4, no reason column)
    try {
      await pool.execute(
        'INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, 4, NOW())',
        [userId]
      );
    } catch (disableErr) {
      console.error('Failed to insert into disable_accounts:', disableErr);
    }

    // Get created user
    const newUser = await User.findById(userId);
    const sanitizedUser = sanitizeUser(newUser);
    const token = generateToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
    res.status(201).json(formatResponse(true, 'Moderator registered successfully', { user: sanitizedUser, token }));
  } catch (error) {
    next(error);
  }
};

module.exports = { registerModerator };
