// controllers/organizationApprovalController.js
const OrganizationApproval = require('../models/OrganizationApproval');

// Get all organizations (any status)
exports.getAllOrganizations = async (req, res) => {
  try {
    const orgs = await OrganizationApproval.getAll();
    const mapped = orgs.map(org => ({
      id: org.id,
      org_name: org.org_name,
      area: org.org_area,
      govijanasewaniladariname: org.gn_name,
      govijanasewaniladariContact: org.gn_contactno,
      establishedDate: org.est,
      organizationDescription: org.org_description,
      letterofProof: org.letter_of_proof_file,
      is_active: org.is_active,
      status: org.is_active === 1 ? 'approved' : org.is_active === 0 ? 'pending' : org.is_active === -1 ? 'rejected' : 'unknown'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organizations.' });
  }
};
// Get all approved organizations
exports.getApprovedOrganizations = async (req, res) => {
  try {
    const orgs = await OrganizationApproval.getApproved();
    const mapped = orgs.map(org => ({
      id: org.id,
      org_name: org.org_name,
      area: org.org_area,
      govijanasewaniladariname: org.gn_name,
      govijanasewaniladariContact: org.gn_contactno,
      establishedDate: org.est,
      organizationDescription: org.org_description,
      letterofProof: org.letter_of_proof_file,
      status: 'approved'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organizations.' });
  }
};

// Get all rejected organizations
exports.getRejectedOrganizations = async (req, res) => {
  try {
    const orgs = await OrganizationApproval.getRejected();
    const mapped = orgs.map(org => ({
      id: org.id,
      org_name: org.org_name,
      area: org.org_area,
      govijanasewaniladariname: org.gn_name,
      govijanasewaniladariContact: org.gn_contactno,
      establishedDate: org.est,
      organizationDescription: org.org_description,
      letterofProof: org.letter_of_proof_file,
      status: 'rejected'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organizations.' });
  }
};

// Get all pending organizations
exports.getPendingOrganizations = async (req, res) => {
  try {
    const orgs = await OrganizationApproval.getPending();
    // Map DB fields to frontend fields
    const mapped = orgs.map(org => ({
      id: org.id,
      org_name: org.org_name,
      area: org.org_area,
      govijanasewaniladariname: org.gn_name,
      govijanasewaniladariContact: org.gn_contactno,
      establishedDate: org.est,
      organizationDescription: org.org_description,
      letterofProof: org.letter_of_proof_file,
      status: org.is_active === 0 ? 'pending' : org.is_active === 1 ? 'approved' : 'rejected'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organizations.' });
  }
};

// Approve organization
exports.approveOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    // Allow approve if currently pending or rejected
    const org = await OrganizationApproval.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }
    if (org.is_active !== 0 && org.is_active !== -1) {
      return res.status(400).json({ success: false, message: 'Only pending or rejected organizations can be approved.' });
    }
    const result = await OrganizationApproval.approve(orgId);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to approve organization.' });
    }
    // Also set is_active=1 for the contact person user
    const contactPersonId = org.org_contactperson_id;
    if (contactPersonId) {
      const User = require('../models/User');
      try {
        await User.updateActiveStatus(contactPersonId, 1);
      } catch (e) {
        // Log but don't block approval if user update fails
        console.error('Failed to update user is_active for contact person:', e);
      }
    }
    res.json({ success: true, message: 'Organization approved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error approving organization.' });
  }
};

// Reject organization
exports.rejectOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    // Allow reject if currently pending or approved
    const org = await OrganizationApproval.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }
    if (org.is_active !== 0 && org.is_active !== 1) {
      return res.status(400).json({ success: false, message: 'Only pending or approved organizations can be rejected.' });
    }
    const result = await OrganizationApproval.reject(orgId);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to reject organization.' });
    }
    res.json({ success: true, message: 'Organization rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error rejecting organization.' });
  }
};

// Download proof document (letter_of_proof_file as BLOB)
exports.getProofDocument = async (req, res) => {
  try {
    const orgId = req.params.id;
    const org = await OrganizationApproval.findById(orgId);
    if (!org || !org.letter_of_proof_file) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    // Use the stored MIME type, fallback to application/octet-stream
    const mimeType = org.letter_of_proof_mime || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="proof_document.${mimeType.split('/')[1] || 'bin'}"`);
    res.end(org.letter_of_proof_file);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error downloading document.' });
  }
};

// Fetch summary or detailed data for organizations
exports.getOrganizations = async (req, res) => {
  try {
    const { status, summary } = req.query;
    let orgs;

    if (status === 'approved') {
      orgs = await OrganizationApproval.getApproved();
    } else if (status === 'rejected') {
      orgs = await OrganizationApproval.getRejected();
    } else if (status === 'pending') {
      orgs = await OrganizationApproval.getPending();
    } else {
      orgs = await OrganizationApproval.getAll();
    }

    if (summary === '1') {
      // Return summary data only
      const mapped = orgs.map(org => ({
        id: org.id,
        org_name: org.org_name,
        area: org.org_area,
        status: org.is_active === 1 ? 'approved' : org.is_active === 0 ? 'pending' : 'rejected'
      }));
      return res.json(mapped);
    }

    // Return detailed data
    const mapped = orgs.map(org => ({
      id: org.id,
      org_name: org.org_name,
      area: org.org_area,
      govijanasewaniladariname: org.gn_name,
      govijanasewaniladariContact: org.gn_contactno,
      establishedDate: org.est,
      organizationDescription: org.org_description,
      letterofProof: org.letter_of_proof_file,
      is_active: org.is_active,
      status: org.is_active === 1 ? 'approved' : org.is_active === 0 ? 'pending' : 'rejected'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organizations.' });
  }
};

// Fetch detailed data for a specific organization
exports.getOrganizationDetails = async (req, res) => {
  try {
    const orgId = req.params.id;
    const org = await OrganizationApproval.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }
    const detailedData = {
      id: org.id,
      org_name: org.org_name,
      area: org.org_area,
      govijanasewaniladariname: org.gn_name,
      govijanasewaniladariContact: org.gn_contactno,
      establishedDate: org.est,
      organizationDescription: org.org_description,
      letterofProof: org.letter_of_proof_file,
      is_active: org.is_active,
      status: org.is_active === 1 ? 'approved' : org.is_active === 0 ? 'pending' : 'rejected'
    };
    res.json(detailedData);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organization details.' });
  }
};
