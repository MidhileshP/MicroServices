import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateAccessToken } from '../utils/jwt.js';
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from '../utils/otp.js';
import { generateTOTPSecret, generateQRCode, verifyTOTPToken } from '../utils/totp.js';
import { sendOTPEmail } from '../utils/notificationClient.js';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors.js';
import { TOKEN_EXPIRY, TWO_FACTOR_METHODS } from '../config/constants.js';

export class AuthService {
  async authenticate(email, password) {
    const user = await User.findOne({ email }).populate('organization');

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    return user;
  }

  async initiateTwoFactor(user) {
    const twoFactorMethod = user.organization?.twoFactorMethod || user.twoFactorMethod;

    if (!twoFactorMethod) {
      return { requiresTwoFactor: false, user };
    }

    if (twoFactorMethod === TWO_FACTOR_METHODS.OTP) {
      return await this.initiateOTP(user);
    }

    if (twoFactorMethod === TWO_FACTOR_METHODS.TOTP) {
      return await this.initiateTOTP(user);
    }

    throw new ValidationError('Invalid two-factor method');
  }

  async initiateOTP(user) {
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    user.otpHash = otpHash;
    user.otpExpiry = getOTPExpiry(10);
    await user.save();

    await sendOTPEmail(user.email, otp);

    return {
      requiresTwoFactor: true,
      twoFactorMethod: TWO_FACTOR_METHODS.OTP,
      userId: user._id,
      message: 'OTP sent to your email'
    };
  }

  async initiateTOTP(user) {
    if (!user.totpEnabled) {
      throw new ValidationError('TOTP not set up. Please complete TOTP setup first.');
    }

    return {
      requiresTwoFactor: true,
      twoFactorMethod: TWO_FACTOR_METHODS.TOTP,
      userId: user._id,
      message: 'Please provide your TOTP token'
    };
  }

  async verifyOTP(userId, otp) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.otpHash || !user.otpExpiry) {
      throw new ValidationError('No OTP found. Please login again.');
    }

    if (Date.now() > user.otpExpiry) {
      user.otpHash = null;
      user.otpExpiry = null;
      await user.save();
      throw new ValidationError('OTP expired. Please login again.');
    }

    const isValid = await verifyOTP(otp, user.otpHash);
    if (!isValid) {
      throw new ValidationError('Invalid OTP');
    }

    user.otpHash = null;
    user.otpExpiry = null;
    await user.save();

    return user;
  }

  async verifyTOTP(userId, token) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.totpEnabled || !user.totpSecret) {
      throw new ValidationError('TOTP not enabled');
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);
    if (!isValid) {
      throw new ValidationError('Invalid TOTP token');
    }

    return user;
  }

  async setupTOTP(userId, email) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { secret, otpauthUrl } = generateTOTPSecret(email);
    const qrCode = await generateQRCode(otpauthUrl);

    user.totpSecret = secret;
    await user.save();

    return { secret, qrCode };
  }

  async confirmTOTP(userId, token) {
    const user = await User.findById(userId);

    if (!user || !user.totpSecret) {
      throw new ValidationError('TOTP not initialized');
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);
    if (!isValid) {
      throw new ValidationError('Invalid TOTP token');
    }

    user.totpEnabled = true;
    user.twoFactorMethod = TWO_FACTOR_METHODS.TOTP;
    await user.save();

    return user;
  }

  async createRefreshToken(userId, req) {
    const token = RefreshToken.generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.REFRESH_TOKEN);

    const refreshToken = await RefreshToken.create({
      token,
      user: userId,
      expiresAt,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    return refreshToken;
  }

  async refreshAccessToken(refreshTokenString) {
    if (!refreshTokenString) {
      throw new ValidationError('Refresh token required');
    }

    const storedToken = await RefreshToken.findOne({ token: refreshTokenString }).populate('user');

    if (!storedToken || !storedToken.isValid()) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    return storedToken;
  }

  async revokeRefreshToken(tokenString, req) {
    const storedToken = await RefreshToken.findOne({ token: tokenString });

    if (storedToken) {
      storedToken.isRevoked = true;

      if (req) {
        const newRefreshToken = await this.createRefreshToken(storedToken.user, req);
        storedToken.replacedBy = newRefreshToken.token;
      }

      await storedToken.save();
    }
  }

  async logout(refreshTokenString) {
    if (refreshTokenString) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshTokenString },
        { isRevoked: true }
      );
    }
  }

  generateTokens(user) {
    const accessToken = generateAccessToken(user);
    return { accessToken };
  }
}

export default new AuthService();
