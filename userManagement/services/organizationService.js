import { organizationRepo, userRepo } from '../database/repositories/index.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { ROLES, TWO_FACTOR_METHODS } from '../config/constants.js';

export class OrganizationService {
  async getOrganization(userId) {
    const user = await userRepo.findById(userId);

    if (!user?.organization) {
      throw new NotFoundError('User does not belong to an organization');
    }

    const organization = await organizationRepo.findById(user.organization, {
      populate: { path: 'adminUser', select: 'firstName lastName email' },
      lean: true
    });

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return this.formatOrganizationResponse(organization);
  }

  async updateOrganization(userId, updates) {
    const user = await userRepo.findById(userId);

    if (user.role !== ROLES.CLIENT_ADMIN) {
      throw new AuthorizationError('Only client admins can update organization settings');
    }

    if (!user.organization) {
      throw new NotFoundError('User does not belong to an organization');
    }

    const organization = await organizationRepo.findById(user.organization);

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    // Allow any client_admin in the organization to update settings
    // No need to check if they are the original adminUser

    if (updates.name) {
      organization.name = updates.name;
    }

    if (updates.twoFactorMethod) {
      if (![TWO_FACTOR_METHODS.OTP, TWO_FACTOR_METHODS.TOTP].includes(updates.twoFactorMethod)) {
        throw new ValidationError('Invalid two-factor method');
      }
      organization.twoFactorMethod = updates.twoFactorMethod;
    }

    await organizationRepo.save(organization);

    return this.formatOrganizationResponse(organization.toObject());
  }

  async getOrganizationMembers(userId) {
    const user = await userRepo.findById(userId);

    if (!user?.organization) {
      throw new NotFoundError('User does not belong to an organization');
    }

    const members = await userRepo.findByOrganization(user.organization, { isActive: true });

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
