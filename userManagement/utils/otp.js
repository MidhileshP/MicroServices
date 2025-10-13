import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, TOKEN_EXPIRY } from '../config/constants.js';

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS.OTP);
  return await bcrypt.hash(otp, salt);
};

export const verifyOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};

export const getOTPExpiry = () => {
  return new Date(Date.now() + TOKEN_EXPIRY.OTP);
};
