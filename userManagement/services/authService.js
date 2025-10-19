import { userRepo, refreshTokenRepo } from '../database/repositories/index.js';
import { generateAccessToken } from '../utils/jwt.js';
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from '../utils/otp.js';
import { generateTOTPSecret, generateQRCode, verifyTOTPToken } from '../utils/totp.js';
import { sendOTPEmail } from '../utils/notificationClient.js';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '../utils/errors.js';
import { TOKEN_EXPIRY, TWO_FACTOR_METHODS } from '../config/constants.js';

export class AuthService {
  async authenticate(email, password) {
    const user = await userRepo.findByEmail(email, { populate: 'organization' });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid Email');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid Password');
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

    await userRepo.updateOTP(user._id, otpHash, getOTPExpiry(10));

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
      // TOTP is set as method but not properly set up yet
      // Generate or regenerate the QR code for setup
      let secret = user.totpSecret;

      if (!secret) {
        const totpData = generateTOTPSecret(user.email);
        secret = totpData.secret;
        await userRepo.updateTOTP(user._id, { totpSecret: secret });
      }

      const otpauthUrl = `otpauth://totp/UserManagement:${encodeURIComponent(user.email)}?secret=${secret}&issuer=UserManagement`;
      const qrCode = await generateQRCode(otpauthUrl);

      return {
        requiresTwoFactor: true,
        twoFactorMethod: TWO_FACTOR_METHODS.TOTP,
        userId: user._id,
        message: 'TOTP not completed. Please scan the QR code with your authenticator app and verify.',
        requiresTOTPSetup: true,
        totp: {
          secret,
          qrCode
        }
      };
    }

    return {
      requiresTwoFactor: true,
      twoFactorMethod: TWO_FACTOR_METHODS.TOTP,
      userId: user._id,
      message: 'Please provide your TOTP token'
    };
  }

  async verifyOTP(userId, otp) {
    const user = await userRepo.findById(userId, { populate: 'organization' });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.otpHash || !user.otpExpiry) {
      throw new ValidationError('No OTP found. Please login again.');
    }

    if (Date.now() > user.otpExpiry) {
      await userRepo.clearOTP(user._id);
      throw new ValidationError('OTP expired. Please login again.');
    }

    const isValid = await verifyOTP(otp, user.otpHash);
    if (!isValid) {
      throw new ValidationError('Invalid OTP');
    }

    await userRepo.clearOTP(user._id);

    return user;
  }

  async verifyTOTP(userId, token) {
    const user = await userRepo.findById(userId, { populate: 'organization' });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.totpSecret) {
      throw new ValidationError('TOTP not initialized');
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);
    if (!isValid) {
      throw new ValidationError('Invalid TOTP token');
    }

    // If TOTP is not enabled yet, enable it after successful verification
    if (!user.totpEnabled) {
      await userRepo.updateById(user._id, { totpEnabled: true });
    }

    return user;
  }

  async setupTOTP(userId, email) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { secret, otpauthUrl } = generateTOTPSecret(email);
    const qrCode = await generateQRCode(otpauthUrl);

    await userRepo.updateTOTP(user._id, { totpSecret: secret });

    return { secret, qrCode };
  }

  async confirmTOTP(userId, token) {
    const user = await userRepo.findById(userId);

    if (!user || !user.totpSecret) {
      throw new ValidationError('TOTP not initialized');
    }

    const isValid = verifyTOTPToken(token, user.totpSecret);
    if (!isValid) {
      throw new ValidationError('Invalid TOTP token');
    }

    await userRepo.updateById(user._id, { totpEnabled: true, twoFactorMethod: TWO_FACTOR_METHODS.TOTP });

    return user;
  }

  async createRefreshToken(userId, req) {
    const token = (await import('../models/RefreshToken.js')).default.generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.REFRESH_TOKEN);

    const refreshToken = await refreshTokenRepo.create({
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

    const storedToken = await refreshTokenRepo.findByToken(refreshTokenString, { populate: 'user' });

    if (!storedToken || !storedToken.isValid()) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    return storedToken;
  }

  async revokeRefreshToken(tokenString, req) {
    const storedToken = await refreshTokenRepo.findByToken(tokenString);

    if (storedToken) {
      storedToken.isRevoked = true;

      if (req) {
        const newRefreshToken = await this.createRefreshToken(storedToken.user, req);
        storedToken.replacedBy = newRefreshToken.token;
      }

      await refreshTokenRepo.save(storedToken);
    }
  }

  async logout(refreshTokenString) {
    if (refreshTokenString) {
      await refreshTokenRepo.updateOne({ token: refreshTokenString }, { isRevoked: true });
    }
  }

  generateTokens(user) {
    const accessToken = generateAccessToken(user);
    return { accessToken };
  }

  async changeMfaMethod(userId, newMethod) {
    const user = await userRepo.findById(userId, { populate: 'organization' });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Client users must use their organization's MFA method and cannot change it
    if (user.role === 'client_user') {
      throw new AuthorizationError('Client users must use their organization\'s MFA method and cannot change it');
    }

    // Only super_admin, site_admin, operator, and client_admin can change their MFA method
    const allowedRoles = ['super_admin', 'site_admin', 'operator', 'client_admin'];
    if (!allowedRoles.includes(user.role)) {
      throw new AuthorizationError('Only super admin, site admin, operator, and client admin can change their MFA method');
    }

    // Validate new method
    if (!Object.values(TWO_FACTOR_METHODS).includes(newMethod)) {
      throw new ValidationError('Invalid two-factor method');
    }

    // If switching to TOTP and not already enabled, generate new secret
    let totpSetup = null;
    if (newMethod === TWO_FACTOR_METHODS.TOTP) {
      const { secret, otpauthUrl } = generateTOTPSecret(user.email);
      const qrCode = await generateQRCode(otpauthUrl);
      await userRepo.updateById(user._id, { totpSecret: secret, totpEnabled: false });
      totpSetup = { secret, qrCode };
    } else if (newMethod === TWO_FACTOR_METHODS.OTP) {
      await userRepo.updateById(user._id, { totpSecret: null, totpEnabled: false });
    }
    await userRepo.updateTwoFactorMethod(user._id, newMethod);

    return {
      message: `MFA method changed to ${newMethod}`,
      totpSetup,
      requiresTOTPConfirmation: newMethod === TWO_FACTOR_METHODS.TOTP
    };
  }
}

export default new AuthService();
