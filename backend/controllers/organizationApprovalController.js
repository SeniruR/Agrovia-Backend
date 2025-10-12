// Suspend organization
const { sendOrganizationSuspensionEmail, sendOrganizationRemovalEmail, sendFarmerRemovalEmail } = require('../utils/notify');
exports.suspendOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    // Only allow suspend if currently approved
    const org = await OrganizationApproval.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }
    if (org.is_active !== 1) {
      return res.status(400).json({ success: false, message: 'Only approved organizations can be suspended.' });
    }
    // Set is_active = 2 for suspended
    const result = await OrganizationApproval.suspend(orgId);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to suspend organization.' });
    }
    // Also set is_active=0 for the contact person user
    const contactPersonId = org.org_contactperson_id;
    let contactPerson = null;
    if (contactPersonId) {
      const User = require('../models/User');
      try {
        await User.updateActiveStatus(contactPersonId, 0);
        contactPerson = await User.findById(contactPersonId);
      } catch (e) {
        // Log but don't block suspension if user update fails
        console.error('Failed to update user is_active for contact person:', e);
      }
    }
    // Send suspension email if contact person has email
    if (contactPerson && contactPerson.email) {
      try {
        await sendOrganizationSuspensionEmail(contactPerson.email, contactPerson.full_name, org.org_name);
      } catch (mailErr) {
        console.error('Failed to send organization suspension email:', mailErr);
      }
    }
    res.json({ success: true, message: 'Organization suspended.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error suspending organization.' });
  }
};
// controllers/organizationApprovalController.js
const OrganizationApproval = require('../models/OrganizationApproval');
const FarmerDetails = require('../models/FarmerDetails');

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
        created_at: org.created_at,
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
        created_at: org.created_at,
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
        created_at: org.created_at,
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
        created_at: org.created_at,
        status: org.is_active === 0 ? 'pending' : org.is_active === 1 ? 'approved' : 'rejected'
      }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organizations.' });
  }
};

// Approve organization
const { sendOrganizationApprovalEmail } = require('../utils/notify');
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
    let contactPerson = null;
    if (contactPersonId) {
      const User = require('../models/User');
      try {
        await User.updateActiveStatus(contactPersonId, 1);
        contactPerson = await User.findById(contactPersonId);
      } catch (e) {
        // Log but don't block approval if user update fails
        console.error('Failed to update user is_active for contact person:', e);
      }
    }
    // Send approval email if contact person has email
    if (contactPerson && contactPerson.email) {
      try {
        await sendOrganizationApprovalEmail(contactPerson.email, contactPerson.full_name, org.org_name);
      } catch (mailErr) {
        console.error('Failed to send organization approval email:', mailErr);
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
        created_at: org.created_at,
        status: org.is_active === 1 ? 'approved' : org.is_active === 0 ? 'pending' : 'rejected'
      };
    res.json(detailedData);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organization details.' });
  }
};

// Fetch all suspended organizations
exports.getSuspendedOrganizations = async (req, res) => {
  try {
    const summary = req.query.summary === '1';
    const organizations = summary
      ? await OrganizationApproval.getSummaryByStatus(2) // Fetch summary for suspended organizations
      : await OrganizationApproval.getByStatus(2); // Fetch detailed data for suspended organizations
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching suspended organizations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suspended organizations.' });
  }
};

// Activate organization
exports.activateOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    const org = await OrganizationApproval.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }
    if (org.is_active !== 2) {
      return res.status(400).json({ success: false, message: 'Only suspended organizations can be activated.' });
    }
    const result = await OrganizationApproval.activate(orgId);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to activate organization.' });
    }

    // Fetch contact person details
    const contactPersonId = org.org_contactperson_id;
    let contactPerson = null;
    if (contactPersonId) {
      const User = require('../models/User');
      try {
        contactPerson = await User.findById(contactPersonId);
      } catch (e) {
        console.error('Failed to fetch contact person details:', e);
      }
    }

    // Send activation email if contact person has email
    if (contactPerson && contactPerson.email) {
      try {
        const { sendOrganizationActivationEmail } = require('../utils/notify');
        await sendOrganizationActivationEmail(contactPerson.email, contactPerson.full_name, org.org_name);
      } catch (mailErr) {
        console.error('Failed to send organization activation email:', mailErr);
      }
    }
    res.json({ success: true, message: 'Organization activated successfully.' });
  } catch (error) {
    console.error('Error activating organization:', error);
    res.status(500).json({ success: false, message: 'Failed to activate organization.' });
  }
};

// Remove organization
exports.removeOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { message } = req.body; // Get custom message from request body
    const org = await OrganizationApproval.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    // Fetch contact person details
    const contactPersonId = org.org_contactperson_id;
    let contactPerson = null;
    if (contactPersonId) {
      const User = require('../models/User');
      try {
        contactPerson = await User.findById(contactPersonId);
      } catch (e) {
        console.error('Failed to fetch contact person details:', e);
      }
    }

    // Validate contact person email
    if (!contactPerson || !contactPerson.email) {
      return res.status(400).json({ success: false, message: 'Contact person email is missing.' });
    }

    // Send email notification before deletion
    try {
      await sendOrganizationRemovalEmail(contactPerson.email, org.org_name, message);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send email notification.' });
    }

    // Notify assigned farmers
    const farmers = await FarmerDetails.findByOrganizationId(orgId);
    if (farmers.length === 0) {
      console.info(`No farmers assigned to organization ${orgId}. Skipping farmer notifications.`);
    } else {
      for (const farmer of farmers) {
        if (!farmer.email) {
          console.warn(`Farmer ${farmer.id} does not have a valid email address. Skipping notification.`);
          continue;
        }
        try {
          await sendFarmerRemovalEmail(farmer.email, org.org_name);
        } catch (emailError) {
          console.error(`Failed to send email to farmer ${farmer.id}:`, emailError);
        }
      }
    }

    // Proceed with deletion
    const result = await OrganizationApproval.remove(orgId);
    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to remove organization.' });
    }

    res.json({ success: true, message: 'Organization removed successfully.' });
  } catch (error) {
    console.error('Error removing organization:', error);
    res.status(500).json({ success: false, message: 'Failed to remove organization.' });
  }
};
