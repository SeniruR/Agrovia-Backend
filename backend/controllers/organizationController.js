const Organization = require('../models/Organization');
const { formatResponse } = require('../utils/helpers');

// Register organization (new flow)
const registerOrganization = async (req, res, next) => {
  try {
    const {
      organizationName,
      area,
      govijanasewaniladariname,
      govijanasewaniladariContact,
      establishedDate,
      organizationDescription,
      contactperson_id
    } = req.body;

    // File upload (memoryStorage: only buffer and originalname are available)
    let letterOfProofFile = null;
    let letterOfProofName = null;
    let letterOfProofMime = null;
    if (req.file) {
      letterOfProofFile = req.file.buffer;
      letterOfProofName = req.file.originalname;
      letterOfProofMime = req.file.mimetype;
    }

    // Validate required fields
    if (
      !organizationName ||
      !area ||
      !govijanasewaniladariname ||
      !govijanasewaniladariContact ||
      !letterOfProofFile ||
      !establishedDate
    ) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Create organization
    const result = await Organization.create({
      org_name: organizationName,
      org_area: area,
      gn_name: govijanasewaniladariname,
      gn_contactno: govijanasewaniladariContact,
      letter_of_proof: letterOfProofName, // store original filename for reference
      letter_of_proof_file: letterOfProofFile,
      letter_of_proof_mime: letterOfProofMime,
      est: establishedDate,
      org_description: organizationDescription,
      org_contactperson_id: contactperson_id
    });

    res.status(201).json({ success: true, message: 'Organization registered successfully', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

// Search organizations by name
const searchOrganizations = async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name || name.length < 2) return res.json([]);
    const orgs = await Organization.searchByName(name);
    res.json(orgs);
  } catch (error) {
    next(error);
  }
};

// Get all organizations
const getAllOrganizations = async (req, res, next) => {
  try {
    const organizations = await Organization.findAll();

    res.json(
      formatResponse(true, 'Organizations retrieved successfully', {
        organizations
      })
    );
  } catch (error) {
    next(error);
  }
};

// Get organization by committee number
const getOrganizationByCommitteeNumber = async (req, res, next) => {
  try {
    const { committee_number } = req.params;

    const organization = await Organization.findByCommitteeNumber(committee_number);
    
    if (!organization) {
      return res.status(404).json(
        formatResponse(false, 'Organization not found')
      );
    }

    res.json(
      formatResponse(true, 'Organization retrieved successfully', {
        organization
      })
    );
  } catch (error) {
    next(error);
  }
};

// Update organization
const updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, district } = req.body;

    // Check if organization exists
    const existingOrg = await Organization.findById(id);
    if (!existingOrg) {
      return res.status(404).json(
        formatResponse(false, 'Organization not found')
      );
    }

    // Update organization
    await Organization.update(id, { name, district });

    // Get updated organization
    const updatedOrganization = await Organization.findById(id);

    res.json(
      formatResponse(true, 'Organization updated successfully', {
        organization: updatedOrganization
      })
    );
  } catch (error) {
    next(error);
  }
};

// Delete organization
const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const existingOrg = await Organization.findById(id);
    if (!existingOrg) {
      return res.status(404).json(
        formatResponse(false, 'Organization not found')
      );
    }

    // Delete organization
    await Organization.delete(id);

    res.json(
      formatResponse(true, 'Organization deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get organization by contact person user ID
const getOrganizationByContactPerson = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId parameter' });
    }
    const org = await Organization.findByContactPersonId(userId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found for this contact person' });
    }
    // Return in frontend-expected format, now including org_contactperson_id
    res.json({
      id: org.id,
      name: org.org_name,
      org_area: org.org_area,
      org_description: org.org_description,
      org_contactperson_id: org.org_contactperson_id
    });
  } catch (error) {
    next(error);
  }
};

// Get organization by ID
const getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(org);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerOrganization,
  searchOrganizations,
  getAllOrganizations,
  getOrganizationByCommitteeNumber,
  updateOrganization,
  deleteOrganization,
  getOrganizationByContactPerson,
  getOrganizationById
};
