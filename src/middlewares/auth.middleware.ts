import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/services.config';
import { AuthenticatedRequest } from '../types';
import { AppError } from './error.middleware';

export const authenticateJWT = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('No authorization header provided', 401);
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AppError('Invalid authorization header format. Expected: Bearer <token>', 401);
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      role: string;
    };

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    }
    throw new AppError('Token validation failed', 401);
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  try {
    authenticateJWT(req, res, next);
  } catch (error) {
    next();
  }
};
