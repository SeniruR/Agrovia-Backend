const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { hashPassword } = require('../utils/helpers');
const { sendPasswordResetCodeEmail } = require('../utils/notify');

const RESET_CODE_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 15;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

const generateVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const requestPasswordReset = async (req, res) => {
  try {
    const rawEmail = req.body.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await User.findByEmail(email);

    // Always respond success to prevent account enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If your email is registered, a verification code has been sent.'
      });
    }

    await PasswordResetToken.clearExpiredForUser(user.id);
    await PasswordResetToken.invalidateExisting(user.id);

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    await PasswordResetToken.create(user.id, codeHash, expiresAt);

    let emailDelivery = 'sent';
    try {
      await sendPasswordResetCodeEmail(email, code, RESET_CODE_EXPIRY_MINUTES);
    } catch (err) {
      console.error('[password reset] Failed to send email:', err.message);
      emailDelivery = 'failed';
    }

    const hasNotifyCredentials = Boolean(process.env.NOTIFY_EMAIL_USER && process.env.NOTIFY_EMAIL_PASS);
    const shouldExposeDevCode = process.env.NODE_ENV !== 'production' && (emailDelivery !== 'sent' || !hasNotifyCredentials);

    return res.json({
      success: true,
      message: 'If your email is registered, a verification code has been sent.',
      ...(shouldExposeDevCode ? { devCode: code } : {}),
      emailDelivery
    });
  } catch (err) {
    console.error('[password reset] request error:', err);
    return res.status(500).json({ success: false, message: 'Unable to start password reset. Please try again later.' });
  }
};

const verifyResetCode = async (req, res) => {
  try {
    const { email: rawEmail, code } = req.body;

    if (!rawEmail || typeof rawEmail !== 'string' || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    const tokenRecord = await PasswordResetToken.findActiveByUserId(user.id);
    if (!tokenRecord) {
      return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid.' });
    }

    const isMatch = await bcrypt.compare(code, tokenRecord.code_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Verification code has expired or is invalid.' });
    }

    const resetSessionToken = crypto.randomBytes(32).toString('hex');
    const resetSessionHash = await bcrypt.hash(resetSessionToken, BCRYPT_ROUNDS);

    await PasswordResetToken.setVerificationState(tokenRecord.id, resetSessionHash);

    return res.json({
      success: true,
      message: 'Verification successful. You may now reset your password.',
      resetToken: resetSessionToken,
      expiresAt: tokenRecord.expires_at
    });
  } catch (err) {
    console.error('[password reset] verify error:', err);
    return res.status(500).json({ success: false, message: 'Unable to verify code. Please try again later.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, resetToken, password } = req.body;

    if (!rawEmail || typeof rawEmail !== 'string' || !resetToken || !password) {
      return res.status(400).json({ success: false, message: 'Email, reset token, and new password are required.' });
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid reset request.' });
    }

    const tokenRecord = await PasswordResetToken.findActiveVerifiedByUserId(user.id);
    if (!tokenRecord) {
      return res.status(400).json({ success: false, message: 'Reset session has expired. Please request a new code.' });
    }

    const sessionValid = await bcrypt.compare(resetToken, tokenRecord.reset_session_hash);
    if (!sessionValid) {
      return res.status(400).json({ success: false, message: 'Reset session has expired. Please request a new code.' });
    }

    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset session has expired. Please request a new code.' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and a digit.'
      });
    }

    const passwordHash = await hashPassword(password);
    await User.updatePassword(user.id, passwordHash);
    await PasswordResetToken.markUsed(tokenRecord.id);

    return res.json({ success: true, message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    console.error('[password reset] reset error:', err);
    return res.status(500).json({ success: false, message: 'Unable to reset password. Please try again later.' });
  }
};

module.exports = {
  requestPasswordReset,
  verifyResetCode,
  resetPassword
};
