import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from './error.middleware';

export const requireBearerToken = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('No authorization header provided', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('Invalid authorization header format. Expected: Bearer <token>', 401);
  }

  req.token = authHeader.split(' ')[1];
  next();
};
