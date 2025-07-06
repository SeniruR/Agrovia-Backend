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

    // File upload
    let letterOfProofPath = null;
    if (req.file) {
      letterOfProofPath = req.file.filename;
    }

    // Validate required fields
    if (
      !organizationName ||
      !area ||
      !govijanasewaniladariname ||
      !govijanasewaniladariContact ||
      !letterOfProofPath ||
      !establishedDate ||
      !contactperson_id
    ) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // Create organization
    const result = await Organization.create({
      org_name: organizationName,
      org_area: area,
      gn_name: govijanasewaniladariname,
      gn_contact: govijanasewaniladariContact,
      letter_of_proof: letterOfProofPath,
      established_date: establishedDate,
      org_description: organizationDescription,
      contactperson_id
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

module.exports = {
  registerOrganization,
  searchOrganizations,
  getAllOrganizations,
  getOrganizationByCommitteeNumber,
  updateOrganization,
  deleteOrganization
};
