import { HTTP_STATUS } from '../config/constants.js';

export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}
