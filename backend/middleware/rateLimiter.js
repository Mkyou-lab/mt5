const rateLimit = require('express-rate-limit');

const createRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes
const apiLimiter = createRateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes

module.exports = {
  authLimiter,
  apiLimiter
};