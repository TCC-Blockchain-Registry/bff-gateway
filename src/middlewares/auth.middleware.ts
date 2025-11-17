import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from './error.middleware';

/**
 * BFF não valida JWT - apenas verifica se o token existe e o repassa para o Orchestrator
 * A validação real acontece no Core Orchestrator
 */
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

  // Apenas garante que o header está no formato correto
  // O Core Orchestrator fará a validação real do token
  next();
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
