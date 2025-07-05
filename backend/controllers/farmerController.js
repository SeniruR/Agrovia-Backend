
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Farmer registration controller
exports.registerFarmer = async (req, res, next) => {
  try {

    // If using multer, all fields are strings in req.body, file in req.file
    const {
      fullName,
      email,
      district,
      landSize,
      nic,
      birthDate,
      address,
      phoneNumber,
      description,
      password,
      divisionGramasewaNumber,
      organizationCommitteeNumber,
      farmingExperience,
      cultivatedCrops,
      irrigationSystem,
      soilType,
      farmingCertifications
    } = req.body;
    const profileImage = req.file ? req.file.filename : null;

    // Basic validation
    if (!fullName || !email || !district || !nic || !phoneNumber || !password || !divisionGramasewaNumber || !organizationCommitteeNumber || !farmingExperience || !cultivatedCrops) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Check if user already exists
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Prepare user data for DB

    // Only general user fields go to users table, farmer-specific go to farmer_details
    const userData = {
      full_name: fullName,
      email,
      password_hash,
      phone_number: phoneNumber,
      district,
      nic,
      address,
      profile_image: profileImage,
      user_type: 1, // 1 = farmer
      // Farmer-specific fields below will be passed for farmer_details
      land_size: landSize,
      birth_date: birthDate,
      description,
      division_gramasewa_number: divisionGramasewaNumber,
      organization_committee_number: organizationCommitteeNumber,
      farming_experience: farmingExperience,
      cultivated_crops: cultivatedCrops,
      irrigation_system: irrigationSystem,
      soil_type: soilType,
      farming_certifications: farmingCertifications
    };

    await User.create(userData);
    res.status(201).json({ success: true, message: 'Farmer registered successfully.' });
  } catch (err) {
    next(err);
  }
};
