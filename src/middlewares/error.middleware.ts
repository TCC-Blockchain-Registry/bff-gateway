import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    const errorResponse: ApiError = {
      message: err.message,
      statusCode: err.statusCode,
      errors: err.errors,
    };

    return res.status(err.statusCode).json(errorResponse);
  }

  // Unexpected errors
  console.error('Unexpected error:', err);

  const errorResponse: ApiError = {
    message: 'Internal server error',
    statusCode: 500,
  };

  return res.status(500).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
