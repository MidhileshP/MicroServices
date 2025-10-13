import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
import { ROLES, TWO_FACTOR_METHODS, VALIDATION } from '../config/constants.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      errors: errors.array()
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

export const acceptInviteValidation = [
  body('token').notEmpty().withMessage('Invite token is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('password')
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('twoFactorMethod')
    .optional()
    .isIn(Object.values(TWO_FACTOR_METHODS))
    .withMessage(`twoFactorMethod must be either ${TWO_FACTOR_METHODS.OTP} or ${TWO_FACTOR_METHODS.TOTP}`),
  validate
];

export const createInviteValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role')
    .isIn([ROLES.SITE_ADMIN, ROLES.OPERATOR, ROLES.CLIENT_ADMIN, ROLES.CLIENT_USER])
    .withMessage('Invalid role'),
  body('organizationName')
    .optional({ nullable: true})
    .trim()
    .notEmpty()
    .withMessage('Organization name cannot be empty'),
  validate
];

export const sixDigitCodeValidation = (field, label = 'code') => [
  body(field)
    .isLength({ min: VALIDATION.OTP_LENGTH, max: VALIDATION.OTP_LENGTH })
    .isNumeric()
    .withMessage(`${label} must be ${VALIDATION.OTP_LENGTH} digits`),
  validate
];

export const verifyOTPValidation = [
  ...sixDigitCodeValidation('otp', 'OTP')
];
