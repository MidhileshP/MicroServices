import express from 'express';
import {
  login,
  verifyOTPHandler,
  verifyTOTPHandler,
  setupTOTP,
  confirmTOTP,
  refreshTokenHandler,
  logout,
  getProfile
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
  loginValidation,
  verifyOTPValidation,
  sixDigitCodeValidation
} from '../middleware/validation.js';

const router = express.Router();

router.post('/login', loginValidation, login);
router.post('/verify-otp', verifyOTPValidation, verifyOTPHandler);
router.post('/verify-totp', sixDigitCodeValidation('token', 'TOTP token'), verifyTOTPHandler);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', logout);

router.get('/profile', authenticate, getProfile);
router.post('/totp/setup', authenticate, setupTOTP);
router.post('/totp/confirm', sixDigitCodeValidation('token', 'TOTP token'), confirmTOTP);

export default router;
