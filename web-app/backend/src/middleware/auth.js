const authService = require('../auth/authService');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    // Get full user data
    const user = await authService.getUserById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account is inactive or deleted'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Middleware to check if user has required plan
 */
const requirePlan = (requiredPlan) => {
  return (req, res, next) => {
    const userPlan = req.user.plan;
    const planHierarchy = {
      'free': 1,
      'pro': 2,
      'enterprise': 3
    };

    if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
      return res.status(403).json({
        error: 'Insufficient plan',
        message: `This feature requires ${requiredPlan} plan or higher. Your current plan: ${userPlan}`
      });
    }

    next();
  };
};

/**
 * Middleware to rate limit API calls
 */
const rateLimit = require('express-rate-limit');

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      error: 'Rate limit exceeded',
      message: message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

const apiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  100, // 100 requests
  'Too many API requests, please slow down'
);

const crawlRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 crawls
  'Too many crawl requests, please wait before trying again'
);

module.exports = {
  authenticateToken,
  requirePlan,
  authRateLimit,
  apiRateLimit,
  crawlRateLimit
};
