import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateAccessToken } from '../utils/jwt.js';
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from '../utils/otp.js';
import { generateTOTPSecret, generateQRCode, verifyTOTPToken } from '../utils/totp.js';
import { sendOTPEmail } from '../utils/notificationClient.js';
import { ok, created, badRequest, unauthorized, forbidden, notFound, serverError } from '../utils/response.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organization');

    if (!user || !user.isActive) {
      return unauthorized(res, 'Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return unauthorized(res, 'Invalid credentials');
    }

    const twoFactorMethod = user.organization?.twoFactorMethod || user.twoFactorMethod;

    if (!twoFactorMethod) {
      return respondWithTokens(res, user, req);
    }

    if (twoFactorMethod === 'otp') {
      const otp = generateOTP();
      const otpHash = await hashOTP(otp);

      user.otpHash = otpHash;
      user.otpExpiry = getOTPExpiry(10);
      await user.save();

      await sendOTPEmail(email, otp);

      return res.json({
        success: true,
        requiresTwoFactor: true,
        twoFactorMethod: 'otp',
        userId: user._id,
        message: 'OTP sent to your email'
      });
    }

    if (twoFactorMethod === 'totp') {
      if (!user.totpEnabled) {
        return badRequest(res, 'TOTP not set up. Please complete TOTP setup first.');
      }

      return res.json({
        success: true,
        requiresTwoFactor: true,
        twoFactorMethod: 'totp',
        userId: user._id,
        message: 'Please provide your TOTP token'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    return serverError(res);
  }
};

export const verifyOTPHandler = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return notFound(res, 'User not found');
    }

    if (!user.otpHash || !user.otpExpiry) {
      return badRequest(res, 'No OTP found. Please login again.');
    }

    if (Date.now() > user.otpExpiry) {
      user.otpHash = null;
      user.otpExpiry = null;
      await user.save();

      return badRequest(res, 'OTP expired. Please login again.');
    }

    const isValid = await verifyOTP(otp, user.otpHash);

    if (!isValid) {
      return badRequest(res, 'Invalid OTP');
    }

    user.otpHash = null;
    user.otpExpiry = null;
    await user.save();

    return respondWithTokens(res, user, req);

  } catch (error) {
    console.error('OTP verification error:', error);
    return serverError(res);
  }
};

export const verifyTOTPHandler = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return notFound(res, 'User not found');
    }

    if (!user.totpEnabled || !user.totpSecret) {
      return badRequest(res, 'TOTP not enabled');
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);

    if (!isValid) {
      return badRequest(res, 'Invalid TOTP token');
    }

    return respondWithTokens(res, user, req);

  } catch (error) {
    console.error('TOTP verification error:', error);
    return serverError(res);
  }
};

export const setupTOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return notFound(res, 'User not found');
    }

    const { secret, otpauthUrl } = generateTOTPSecret(user.email);
    const qrCode = await generateQRCode(otpauthUrl);

    user.totpSecret = secret;
    await user.save();

    return ok(res, { secret, qrCode, message: 'Scan the QR code with your authenticator app' });

  } catch (error) {
    console.error('TOTP setup error:', error);
    return serverError(res);
  }
};

export const confirmTOTP = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);

    if (!user || !user.totpSecret) {
      return badRequest(res, 'TOTP not initialized');
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);

    if (!isValid) {
      return badRequest(res, 'Invalid TOTP token');
    }

    user.totpEnabled = true;
    user.twoFactorMethod = 'totp';
    await user.save();

    return ok(res, { message: 'TOTP enabled successfully' });

  } catch (error) {
    console.error('TOTP confirmation error:', error);
    return serverError(res);
  }
};

export const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return badRequest(res, 'Refresh token required');
    }

    const storedToken = await RefreshToken.findOne({ token }).populate('user');

    if (!storedToken || !storedToken.isValid()) {
      return unauthorized(res, 'Invalid or expired refresh token');
    }

    storedToken.isRevoked = true;
    const newRefreshToken = await createRefreshToken(storedToken.user._id, req);
    storedToken.replacedBy = newRefreshToken.token;
    await storedToken.save();

    const accessToken = generateAccessToken(storedToken.user);

    return ok(res, { accessToken, refreshToken: newRefreshToken.token });

  } catch (error) {
    console.error('Refresh token error:', error);
    return serverError(res);
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await RefreshToken.findOneAndUpdate(
        { token },
        { isRevoked: true }
      );
    }

    return ok(res, { message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    return serverError(res);
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('organization');

    return ok(res, { user: user.toSafeObject() });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createRefreshToken = async (userId, req) => {
  const token = RefreshToken.generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const refreshToken = await RefreshToken.create({
    token,
    user: userId,
    expiresAt,
    userAgent: req.headers['user-agent'] || null,
    ipAddress: req.ip || req.connection.remoteAddress || null
  });

  return refreshToken;
};

// Centralized successful auth response
const respondWithTokens = async (res, user, req) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user._id, req);

  return ok(res, {
    requiresTwoFactor: false,
    accessToken,
    refreshToken: refreshToken.token,
    user: user.toSafeObject()
  });
};
