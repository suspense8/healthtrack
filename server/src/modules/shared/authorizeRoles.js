
/**
 * Role-based authorization middleware
 * Usage: router.use(authorizeRoles('admin', 'doctor'))
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user exists (should be set by authenticateJWT)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
