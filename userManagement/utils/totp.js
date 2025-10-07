import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const generateTOTPSecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `UserManagementService (${email})`,
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

export const generateQRCode = async (otpauthUrl) => {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

export const verifyTOTPToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};
