import express from 'express';
import { sendEmailHandler } from '../controllers/emailController.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const validate = (req, res, next) => {
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

const sendEmailValidation = [
  body('to').isEmail().withMessage('Valid email address required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  validate
];

router.post('/send', sendEmailValidation, sendEmailHandler);

export default router;
