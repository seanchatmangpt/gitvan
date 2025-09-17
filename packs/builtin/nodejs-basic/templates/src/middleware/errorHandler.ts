{% if use_typescript %}import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('❌ Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found';
  }

  // Duplicate key error
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
  }

  // Custom error status
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};{% else %}const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('❌ Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found';
  }

  // Duplicate key error
  if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Custom error status
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = { errorHandler };{% endif %}