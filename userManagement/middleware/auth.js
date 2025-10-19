import { verifyAccessToken } from '../utils/jwt.js';
import { userRepo } from '../database/repositories/index.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt without token', {
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const user = await userRepo.findById(decoded.userId, { select: '-password', lean: true });

    if (!user || !user.isActive) {
      logger.warn('Authentication failed for user', {
        userId: decoded.userId,
        isActive: user?.isActive
      });
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Authorization check without authenticated user', {
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization denied', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
