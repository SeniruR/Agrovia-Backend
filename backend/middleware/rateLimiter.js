/**
 * Legacy shim for the removed rate limiter.
 *
 * The application previously depended on express-rate-limit, but the
 * middleware has been retired. We keep these no-op exports so that any stray
 * imports will continue to function without throwing runtime errors.
 */

const passThrough = (req, res, next) => next();

module.exports = {
  generalLimiter: passThrough,
  authLimiter: passThrough,
  uploadLimiter: passThrough
};
