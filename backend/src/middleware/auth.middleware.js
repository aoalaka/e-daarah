import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    req.madrasahId = user.madrasahId; // Convenient access to madrasah ID
    next();
  });
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Middleware to verify madrasah slug matches token
export const verifyMadrasahAccess = (req, res, next) => {
  const { madrasahSlug } = req.params;

  if (madrasahSlug && req.user.madrasahSlug !== madrasahSlug) {
    return res.status(403).json({ error: 'Access denied to this madrasah' });
  }

  next();
};

// Helper to get madrasah ID from request
export const getMadrasahId = (req) => {
  return req.user?.madrasahId || req.madrasahId;
};
