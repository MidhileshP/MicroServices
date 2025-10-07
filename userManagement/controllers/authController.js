import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import Organization from '../models/Organization.js';
import { generateAccessToken } from '../utils/jwt.js';
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from '../utils/otp.js';
import { generateTOTPSecret, generateQRCode, verifyTOTPToken } from '../utils/totp.js';
import { sendOTPEmail } from '../utils/notificationClient.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organization');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const twoFactorMethod = user.organization?.twoFactorMethod || user.twoFactorMethod;

    if (!twoFactorMethod) {
      const accessToken = generateAccessToken(user);
      const refreshToken = await createRefreshToken(user._id, req);

      return res.json({
        success: true,
        requiresTwoFactor: false,
        accessToken,
        refreshToken: refreshToken.token,
        user: user.toSafeObject()
      });
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
        return res.status(400).json({
          success: false,
          message: 'TOTP not set up. Please complete TOTP setup first.'
        });
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
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyOTPHandler = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.otpHash || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please login again.'
      });
    }

    if (Date.now() > user.otpExpiry) {
      user.otpHash = null;
      user.otpExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please login again.'
      });
    }

    const isValid = await verifyOTP(otp, user.otpHash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    user.otpHash = null;
    user.otpExpiry = null;
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user._id, req);

    return res.json({
      success: true,
      accessToken,
      refreshToken: refreshToken.token,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyTOTPHandler = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({
        success: false,
        message: 'TOTP not enabled'
      });
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user._id, req);

    return res.json({
      success: true,
      accessToken,
      refreshToken: refreshToken.token,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('TOTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const setupTOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { secret, otpauthUrl } = generateTOTPSecret(user.email);
    const qrCode = await generateQRCode(otpauthUrl);

    user.totpSecret = secret;
    await user.save();

    return res.json({
      success: true,
      secret,
      qrCode,
      message: 'Scan the QR code with your authenticator app'
    });

  } catch (error) {
    console.error('TOTP setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const confirmTOTP = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.totpSecret) {
      return res.status(400).json({
        success: false,
        message: 'TOTP not initialized'
      });
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token'
      });
    }

    user.totpEnabled = true;
    user.twoFactorMethod = 'totp';
    await user.save();

    return res.json({
      success: true,
      message: 'TOTP enabled successfully'
    });

  } catch (error) {
    console.error('TOTP confirmation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const storedToken = await RefreshToken.findOne({ token }).populate('user');

    if (!storedToken || !storedToken.isValid()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    storedToken.isRevoked = true;
    const newRefreshToken = await createRefreshToken(storedToken.user._id, req);
    storedToken.replacedBy = newRefreshToken.token;
    await storedToken.save();

    const accessToken = generateAccessToken(storedToken.user);

    return res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken.token
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('organization');

    return res.json({
      success: true,
      user: user.toSafeObject()
    });

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
