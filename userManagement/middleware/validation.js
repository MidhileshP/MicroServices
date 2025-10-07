import { body, param, validationResult } from 'express-validator';

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
  validate
];

export const createInviteValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role')
    .isIn(['site_admin', 'operator', 'client_admin', 'client_user'])
    .withMessage('Invalid role'),
  body('organizationName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Organization name cannot be empty'),
  validate
];

export const verifyOTPValidation = [
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  validate
];

export const verifyTOTPValidation = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('TOTP token must be 6 digits'),
  validate
];

export const setupTOTPValidation = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('TOTP token must be 6 digits'),
  validate
];
