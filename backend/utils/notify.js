/**
 * Send organization suspension email to contact person
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 * @param {string} orgName - organization name
 */
async function sendOrganizationSuspensionEmail(to, name, orgName) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Organization Has Been Suspended',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your organization <b>${orgName || ''}</b> has been <b>suspended</b> by the Agrovia admin team.</p>
      <p>If you believe this is a mistake or need more information, please contact support.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}
/**
 * Send organization approval email to contact person
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 * @param {string} orgName - organization name
 */
async function sendOrganizationApprovalEmail(to, name, orgName) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Organization Has Been Approved',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your organization <b>${orgName || ''}</b> has been <b>approved</b> by the Agrovia admin team.</p>
      <p>You can now log in using your credentials at <a href="https://agrovia.lk/login">https://agrovia.lk/login</a>.</p>
      <p>If you have any questions, please contact support.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}
/**
 * Send account approval email to moderator
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 */
async function sendModeratorApprovalEmail(to, name) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Moderator Account Has Been Approved',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your moderator account has been <b>approved</b> by the Agrovia admin team.</p>
      <p>You can now log in using your credentials at <a href="https://agrovia.lk/login">https://agrovia.lk/login</a>.</p>
      <p>If you have any questions, please contact support.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Send account suspension email to moderator
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 */
async function sendModeratorSuspensionEmail(to, name) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Moderator Account Has Been Suspended',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your moderator account has been <b>suspended</b> by the Agrovia admin team.</p>
      <p>If you believe this is a mistake or need more information, please contact support.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}
const nodemailer = require('nodemailer');

// Configure the transporter with your email credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.NOTIFY_EMAIL_USER, // set in .env
    pass: process.env.NOTIFY_EMAIL_PASS  // set in .env
  }
});

/**
 * Send account approval email to logistics provider
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 */
async function sendLogisticsApprovalEmail(to, name) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Logistics Account Has Been Approved',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your logistics provider account has been <b>approved</b> by the Agrovia admin team.</p>
      <p>You can now log in using your credentials at <a href="https://agrovia.lk/login">https://agrovia.lk/login</a>.</p>
      <p>If you have any questions, please contact support.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Send account rejection email to logistics provider
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 * @param {string} message - rejection message
 */
async function sendLogisticsRejectionEmail(to, name, message) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Logistics Account Has Been Rejected',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your logistics provider account has been <b>rejected</b> by the Agrovia admin team.</p>
      <p><b>Reason:</b> ${message ? message : 'No specific reason provided.'}</p>
      <p>You may try to create the same account again, or contact us for further assistance.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Send account suspension email to logistics provider
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 */
async function sendLogisticsSuspensionEmail(to, name) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Logistics Account Has Been Suspended',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your logistics provider account has been <b>suspended</b> by the Agrovia admin team.</p>
      <p>If you believe this is a mistake or need more information, please contact support.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}


/**
 * Send account rejection email to moderator
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 * @param {string} message - rejection message
 */
async function sendModeratorRejectionEmail(to, name, message) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Moderator Account Has Been Rejected',
    html: `<p>Dear ${name || 'User'},</p>
      <p>Your moderator account has been <b>rejected</b> by the Agrovia admin team.</p>
      <p><b>Reason:</b> ${message ? message : 'No specific reason provided.'}</p>
      <p>If you have questions or need clarification, please contact us.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Send activation email for organization
 * @param {string} to - recipient email
 * @param {string} name - recipient name
 * @param {string} orgName - organization name
 */
async function sendOrganizationActivationEmail(to, name, orgName) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Your Organization Has Been Activated',
    html: `<p>Dear ${name || 'User'},</p>
      <p>We are pleased to inform you that your organization, <b>${orgName || ''}</b>, has been activated and is now live on our platform.</p>
      <p>Thank you for being a part of our community.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Send organization removal email to contact person
 * @param {string} to - recipient email
 * @param {string} orgName - organization name
 * @param {string} message - custom message
 */
async function sendOrganizationRemovalEmail(to, orgName, message) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Organization Removal Notification',
    html: `<p>Dear ${orgName || 'User'},</p>
      <p>We regret to inform you that your organization has been removed from our platform.</p>
      <p><b>Reason:</b> ${message || 'No specific reason provided.'}</p>
      <p>If you have any questions or need further clarification, please contact our support team.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Send removal email to assigned farmers
 * @param {string} to - recipient email
 * @param {string} orgName - organization name
 */
async function sendFarmerRemovalEmail(to, orgName) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: 'Organization Removal Notification',
    html: `<p>Dear Farmer,</p>
      <p>We regret to inform you that the organization <b>${orgName || ''}</b> has been removed from our platform.</p>
      <p>If you have any questions, please contact our support team.</p>
      <br><p>Best regards,<br>Agrovia Team</p>`
  };
  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendLogisticsApprovalEmail,
  sendLogisticsRejectionEmail,
  sendLogisticsSuspensionEmail,
  sendModeratorRejectionEmail,
  sendModeratorApprovalEmail,
  sendModeratorSuspensionEmail,
  sendOrganizationApprovalEmail,
  sendOrganizationSuspensionEmail,
  sendOrganizationActivationEmail,
  sendOrganizationRemovalEmail,
  sendFarmerRemovalEmail
};
