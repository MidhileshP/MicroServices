import inviteService from '../services/inviteService.js';
import authService from '../services/authService.js';
import { emitInviteAccepted } from '../utils/socketClient.js';
import { ok, created, badRequest, forbidden, notFound, serverError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { TWO_FACTOR_METHODS } from '../config/constants.js';

export const createInvite = async (req, res) => {
  try {
    const { email, role, organizationName } = req.body;
    const inviter = req.user;

    const result = await inviteService.createInvite(inviter, email, role, organizationName);

    return created(res, result);

  } catch (error) {
    logger.error('Create invite error', { error: error.message, inviterId: req.user._id });

    if (error.statusCode === 403) {
      return forbidden(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    if (error.statusCode === 409) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token, firstName, lastName, password, twoFactorMethod } = req.body;

    const { user, totpSetup, requiresTOTPSetup } = await inviteService.acceptInvite(
      token,
      firstName,
      lastName,
      password,
      twoFactorMethod
    );

    emitInviteAccepted(user.invitedBy, user.email, user.role);

    if (requiresTOTPSetup) {
      return created(res, {
        message: 'Account created successfully. Complete TOTP setup to continue.',
        requiresTwoFactor: true,
        twoFactorMethod: TWO_FACTOR_METHODS.TOTP,
        userId: user._id,
        user: user.toSafeObject(),
        totp: totpSetup
      });
    }

    const { accessToken } = authService.generateTokens(user);
    const refreshToken = await authService.createRefreshToken(user._id, req);

    return created(res, {
      message: 'Account created successfully',
      accessToken,
      refreshToken: refreshToken.token,
      user: user.toSafeObject()
    });

  } catch (error) {
    logger.error('Accept invite error', { error: error.message });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    if (error.statusCode === 409) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const getInviteDetails = async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await inviteService.getInviteDetails(token);

    return ok(res, { invite });

  } catch (error) {
    logger.error('Get invite details error', { error: error.message, token: req.params.token });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const listInvites = async (req, res) => {
  try {
    const { status } = req.query;
    const invites = await inviteService.listInvites(req.user._id, status);

    return ok(res, { invites });

  } catch (error) {
    logger.error('List invites error', { error: error.message, userId: req.user._id });
    return serverError(res);
  }
};

export const revokeInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const result = await inviteService.revokeInvite(inviteId, req.user._id);

    return ok(res, result);

  } catch (error) {
    logger.error('Revoke invite error', { error: error.message, inviteId: req.params.inviteId });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};
