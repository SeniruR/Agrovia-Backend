const Organization = require('../models/Organization');
const { formatResponse } = require('../utils/helpers');

// Create organization
const createOrganization = async (req, res, next) => {
  try {
    const { name, committee_number, district } = req.body;

    // Check if organization already exists
    const existingOrg = await Organization.findByCommitteeNumber(committee_number);
    if (existingOrg) {
      return res.status(400).json(
        formatResponse(false, 'Organization with this committee number already exists')
      );
    }

    // Create organization
    const result = await Organization.create({
      name,
      committee_number,
      district
    });

    // Get created organization
    const newOrganization = await Organization.findById(result.insertId);

    res.status(201).json(
      formatResponse(true, 'Organization created successfully', {
        organization: newOrganization
      })
    );
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
  createOrganization,
  getAllOrganizations,
  getOrganizationByCommitteeNumber,
  updateOrganization,
  deleteOrganization
};
