const rateLimit = require('express-rate-limit');
// Disable rate limits in development
const isDev = process.env.NODE_ENV === 'development';

// General rate limiting (no-op in development)
const generalLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// Strict rate limiting for auth endpoints (no-op in development)
const authLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

// File upload rate limiting (no-op in development)
const uploadLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // limit each IP to 10 uploads per hour
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
