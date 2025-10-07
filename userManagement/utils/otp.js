import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

export const verifyOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};

export const getOTPExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};
