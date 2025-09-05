const rateLimit = require('express-rate-limit');
// Disable/no-op rate limits in development to avoid local 429s
const isDev = process.env.NODE_ENV === 'development';

const makeNoop = () => (req, res, next) => next();

// General rate limiting
const generalLimiter = isDev
  ? makeNoop()
  : rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Strict rate limiting for auth endpoints
const authLimiter = isDev
  ? makeNoop()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // limit each IP to 50 requests per windowMs
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// File upload rate limiting
const uploadLimiter = isDev
  ? makeNoop()
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // limit each IP to 100 uploads per hour
      message: {
        success: false,
        message: 'Too many file uploads, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter
};
