import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { ok, created, badRequest, unauthorized, forbidden, notFound, serverError } from '../utils/response.js';

export const getOrganization = async (req, res) => {
  try {
    const user = req.user;

    if (!user.organization) {
      return notFound(res, 'User does not belong to an organization');
    }

    const organization = await Organization.findById(user.organization)
      .populate('adminUser', 'firstName lastName email');

    if (!organization) {
      return notFound(res, 'Organization not found');
    }

    return ok(res, { organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        twoFactorMethod: organization.twoFactorMethod,
        isActive: organization.isActive,
        admin: organization.adminUser ? {
          name: `${organization.adminUser.firstName} ${organization.adminUser.lastName}`,
          email: organization.adminUser.email
        } : null,
        createdAt: organization.createdAt
    }});

  } catch (error) {
    console.error('Get organization error:', error);
    return serverError(res);
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const user = req.user;
    const { name, twoFactorMethod } = req.body;

    if (user.role !== 'client_admin') {
      return forbidden(res, 'Only organization admin can update settings');
    }

    if (!user.organization) {
      return notFound(res, 'User does not belong to an organization');
    }

    const organization = await Organization.findById(user.organization);

    if (!organization) {
      return notFound(res, 'Organization not found');
    }

    if (organization.adminUser.toString() !== user._id.toString()) {
      return forbidden(res, 'Only organization admin can update settings');
    }

    if (name) {
      organization.name = name;
    }

    if (twoFactorMethod && ['otp', 'totp'].includes(twoFactorMethod)) {
      organization.twoFactorMethod = twoFactorMethod;
    }

    await organization.save();

    return ok(res, { message: 'Organization updated successfully', organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        twoFactorMethod: organization.twoFactorMethod,
        isActive: organization.isActive
    }});

  } catch (error) {
    console.error('Update organization error:', error);
    return serverError(res);
  }
};

export const getOrganizationMembers = async (req, res) => {
  try {
    const user = req.user;

    if (!user.organization) {
      return notFound(res, 'User does not belong to an organization');
    }

    const members = await User.find({
      organization: user.organization,
      isActive: true
    }).select('-password -totpSecret -otpHash');

    return ok(res, { members: members.map(member => member.toSafeObject()) });

  } catch (error) {
    console.error('Get organization members error:', error);
    return serverError(res);
  }
};
