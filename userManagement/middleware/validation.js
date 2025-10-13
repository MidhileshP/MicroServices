import { body, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('twoFactorMethod')
    .optional()
    .isIn(['otp', 'totp'])
    .withMessage('twoFactorMethod must be either otp or totp'),
  validate
];

export const createInviteValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role')
    .isIn(['site_admin', 'operator', 'client_admin', 'client_user'])
    .withMessage('Invalid role'),
  body('organizationName')
    .optional({ nullable: true})
    .trim()
    .notEmpty()
    .withMessage('Organization name cannot be empty'),
  validate
];

// Consolidated six-digit code validator for OTP/TOTP
export const sixDigitCodeValidation = (field, label = 'code') => [
  body(field)
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage(`${label} must be 6 digits`),
  validate
];

export const verifyOTPValidation = [
  ...sixDigitCodeValidation('otp', 'OTP')
];

// removed unused setupTOTPValidation
