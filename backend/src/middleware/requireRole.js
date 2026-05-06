function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.profile) {
        return res.status(500).json({
          success: false,
          error: 'Profile missing on request context'
        });
      }

      if (!allowedRoles.includes(req.profile.role)) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to perform this action'
        });
      }

      next();
    } catch (err) {
      console.error('Role middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Role authorization failed'
      });
    }
  };
}

module.exports = requireRole;