import organizationService from '../services/organizationService.js';
import { ok, badRequest, forbidden, notFound, serverError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const getOrganization = async (req, res) => {
  try {
    const organization = await organizationService.getOrganization(req.user._id);
    return ok(res, { organization });

  } catch (error) {
    logger.error('Get organization error', { error: error.message, userId: req.user._id });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    return serverError(res);
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const { name, twoFactorMethod } = req.body;

    const organization = await organizationService.updateOrganization(req.user._id, {
      name,
      twoFactorMethod
    });

    return ok(res, {
      message: 'Organization updated successfully',
      organization
    });

  } catch (error) {
    logger.error('Update organization error', { error: error.message, userId: req.user._id });

    if (error.statusCode === 403) {
      return forbidden(res, error.message);
    }
    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    if (error.statusCode === 400) {
      return badRequest(res, error.message);
    }
    return serverError(res);
  }
};

export const getOrganizationMembers = async (req, res) => {
  try {
    const members = await organizationService.getOrganizationMembers(req.user._id);
    return ok(res, { members });

  } catch (error) {
    logger.error('Get organization members error', { error: error.message, userId: req.user._id });

    if (error.statusCode === 404) {
      return notFound(res, error.message);
    }
    return serverError(res);
  }
};
