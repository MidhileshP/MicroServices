import User from '../models/User.js';
import authService from '../services/authService.js';
import { ok, badRequest, unauthorized, notFound, serverError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.authenticate(email, password);
    const twoFactorResult = await authService.initiateTwoFactor(user);

    if (!twoFactorResult.requiresTwoFactor) {
      return respondWithTokens(res, user, req);
    }

    return res.json({ success: true, ...twoFactorResult });

  } catch (error) {
    logger.error('Login error', { error: error.message, email: req.body.email });

    if (error.statusCode === 401) {
      return unauthorized(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const verifyOTPHandler = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await authService.verifyOTP(userId, otp);
    return respondWithTokens(res, user, req);

  } catch (error) {
    logger.error('OTP verification error', { error: error.message, userId: req.body.userId });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const verifyTOTPHandler = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await authService.verifyTOTP(userId, token);
    return respondWithTokens(res, user, req);

  } catch (error) {
    logger.error('TOTP verification error', { error: error.message, userId: req.body.userId });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const setupTOTP = async (req, res) => {
  try {
    const { secret, qrCode } = await authService.setupTOTP(req.user._id, req.user.email);

    return ok(res, {
      secret,
      qrCode,
      message: 'Scan the QR code with your authenticator app'
    });

  } catch (error) {
    logger.error('TOTP setup error', { error: error.message, userId: req.user._id });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    return serverError(res);
  }
};

export const confirmTOTP = async (req, res) => {
  try {
    const { userId, token } = req.body;
    await authService.confirmTOTP(userId, token);

    return ok(res, { message: 'TOTP enabled successfully' });

  } catch (error) {
    logger.error('TOTP confirmation error', { error: error.message, userId: req.body.userId });

    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const storedToken = await authService.refreshAccessToken(token);

    await authService.revokeRefreshToken(token, req);
    const newRefreshToken = await authService.createRefreshToken(storedToken.user._id, req);
    const { accessToken } = authService.generateTokens(storedToken.user);

    return ok(res, { accessToken, refreshToken: newRefreshToken.token });

  } catch (error) {
    logger.error('Refresh token error', { error: error.message });

    if (error.statusCode === 401) {
      return unauthorized(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    await authService.logout(token);

    return ok(res, { message: 'Logged out successfully' });

  } catch (error) {
    logger.error('Logout error', { error: error.message });
    return serverError(res);
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('organization')
      .lean();

    if (!user) {
      return notFound(res, 'User not found');
    }

    const { password, totpSecret, otpHash, ...safeUser } = user;

    return ok(res, { user: safeUser });

  } catch (error) {
    logger.error('Get profile error', { error: error.message, userId: req.user._id });
    return serverError(res);
  }
};

export const changeMfaMethod = async (req, res) => {
  try {
    const { method } = req.body;
    const result = await authService.changeMfaMethod(req.user._id, method);

    return ok(res, result);

  } catch (error) {
    logger.error('Change MFA method error', { error: error.message, userId: req.user._id });

    if (error.statusCode === 403) {
      return unauthorized(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    return serverError(res);
  }
};

const respondWithTokens = async (res, user, req) => {
  const { accessToken } = authService.generateTokens(user);
  const refreshToken = await authService.createRefreshToken(user._id, req);

  return ok(res, {
    requiresTwoFactor: false,
    accessToken,
    refreshToken: refreshToken.token,
    user: user.toSafeObject()
  });
};
