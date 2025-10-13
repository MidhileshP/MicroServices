import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { ROLES, TWO_FACTOR_METHODS } from '../config/constants.js';

export class OrganizationService {
  async getOrganization(userId) {
    const user = await User.findById(userId);

    if (!user?.organization) {
      throw new NotFoundError('User does not belong to an organization');
    }

    const organization = await Organization.findById(user.organization)
      .populate('adminUser', 'firstName lastName email')
      .lean();

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return this.formatOrganizationResponse(organization);
  }

  async updateOrganization(userId, updates) {
    const user = await User.findById(userId);

    if (user.role !== ROLES.CLIENT_ADMIN) {
      throw new AuthorizationError('Only organization admin can update settings');
    }

    if (!user.organization) {
      throw new NotFoundError('User does not belong to an organization');
    }

    const organization = await Organization.findById(user.organization);

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    if (organization.adminUser.toString() !== user._id.toString()) {
      throw new AuthorizationError('Only organization admin can update settings');
    }

    if (updates.name) {
      organization.name = updates.name;
    }

    if (updates.twoFactorMethod) {
      if (![TWO_FACTOR_METHODS.OTP, TWO_FACTOR_METHODS.TOTP].includes(updates.twoFactorMethod)) {
        throw new ValidationError('Invalid two-factor method');
      }
      organization.twoFactorMethod = updates.twoFactorMethod;
    }

    await organization.save();

    return this.formatOrganizationResponse(organization.toObject());
  }

  async getOrganizationMembers(userId) {
    const user = await User.findById(userId);

    if (!user?.organization) {
      throw new NotFoundError('User does not belong to an organization');
    }

    const members = await User.find({
      organization: user.organization,
      isActive: true
    })
      .select('-password -totpSecret -otpHash')
      .lean();

    return members.map(member => this.formatMemberResponse(member));
  }

  formatOrganizationResponse(organization) {
    return {
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
    };
  }

  formatMemberResponse(member) {
    return {
      id: member._id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      twoFactorMethod: member.twoFactorMethod,
      isActive: member.isActive,
      createdAt: member.createdAt
    };
  }
}

export default new OrganizationService();
