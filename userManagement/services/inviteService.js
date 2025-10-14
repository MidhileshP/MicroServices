import User from '../models/User.js';
import Invite from '../models/Invite.js';
import Organization from '../models/Organization.js';
import { canInviteRole, needsOrganization } from '../utils/roleHierarchy.js';
import { sendInviteEmail } from '../utils/notificationClient.js';
import { publishEvent } from '../utils/rabbitmq.js';
import { generateTOTPSecret, generateQRCode } from '../utils/totp.js';
import { logger } from '../utils/logger.js';
import { ValidationError, AuthorizationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { TOKEN_EXPIRY, INVITE_STATUS, ROLES, TWO_FACTOR_METHODS } from '../config/constants.js';

export class InviteService {
  async createInvite(inviter, email, role, organizationName) {
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!canInviteRole(inviter.role, role)) {
      throw new AuthorizationError(`You cannot invite users with role: ${role}`);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const pendingInvite = await Invite.findOne({
      email: normalizedEmail,
      status: INVITE_STATUS.PENDING
    });

    if (pendingInvite) {
      return await this.handleExistingInvite(pendingInvite, inviter);
    }

    return await this.createNewInvite(inviter, normalizedEmail, role, organizationName);
  }

  async handleExistingInvite(invite, inviter) {
    const inviterName = `${inviter.firstName} ${inviter.lastName}`;

    if (invite.isExpired()) {
      const newToken = Invite.generateToken();
      invite.token = newToken;
      invite.expiresAt = new Date(Date.now() + TOKEN_EXPIRY.INVITE);
      invite.status = INVITE_STATUS.PENDING;
      await invite.save();

      await this.sendInviteNotifications(invite.email, newToken, inviterName, invite.role);

      return {
        message: 'Existing expired invite refreshed and re-sent',
        invite: this.formatInviteResponse(invite, newToken)
      };
    }

    await this.sendInviteNotifications(invite.email, invite.token, inviterName, invite.role);

    return {
      message: 'Active invite already existed; invitation re-sent',
      invite: this.formatInviteResponse(invite, invite.token)
    };
  }

  async createNewInvite(inviter, email, role, organizationName) {
    let organizationId = null;

    if (needsOrganization(role)) {
      if (role === ROLES.CLIENT_ADMIN) {
        if (!organizationName) {
          throw new ValidationError('Organization name required for client_admin role');
        }
      } else if (role === ROLES.CLIENT_USER) {
        if (!inviter.organization) {
          throw new ValidationError('You must belong to an organization to invite client users');
        }
        organizationId = inviter.organization;
      }
    }

    const token = Invite.generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.INVITE);

    const invite = await Invite.create({
      email,
      role,
      invitedBy: inviter._id,
      organization: organizationId,
      organizationName: role === ROLES.CLIENT_ADMIN ? organizationName : null,
      token,
      expiresAt
    });

    const inviterName = `${inviter.firstName} ${inviter.lastName}`;
    await this.sendInviteNotifications(email, token, inviterName, role);

    return {
      message: 'Invitation created successfully',
      invite: this.formatInviteResponse(invite, token)
    };
  }

  async sendInviteNotifications(email, token, inviterName, role) {
    try {
      await sendInviteEmail(email, token, inviterName, role);
    } catch (error) {
      logger.warn('Email sending failed, but invite created', { error: error.message });
    }

    try {
      await publishEvent(
        process.env.RABBITMQ_EXCHANGE || 'events',
        process.env.RABBITMQ_ROUTE_INVITE || 'user.invite.created',
        {
          to: email,
          subject: 'You have been invited',
          html: `You have been invited by ${inviterName}. Use token: ${token}`
        }
      );
    } catch (error) {
      logger.warn('RabbitMQ publish failed', { error: error.message });
    }
  }

  async acceptInvite(token, firstName, lastName, password, twoFactorMethod) {
    const invite = await Invite.findOne({ token }).populate('invitedBy');

    if (!invite) {
      throw new NotFoundError('Invalid invite token');
    }

    if (!invite.isValid()) {
      invite.status = INVITE_STATUS.EXPIRED;
      await invite.save();
      throw new ValidationError('Invite has expired or is no longer valid');
    }

    let user;

    if (invite.role === ROLES.CLIENT_ADMIN && invite.organizationName) {
      user = await this.createAdminWithOrganization(invite, firstName, lastName, password);
    } else {
      user = await this.createRegularUser(invite, firstName, lastName, password);
    }

    const result = await this.setupUserTwoFactor(user, twoFactorMethod);

    invite.status = INVITE_STATUS.ACCEPTED;
    invite.acceptedAt = new Date();
    invite.acceptedUserId = user._id;
    await invite.save();

    return { user, ...result };
  }

  async createAdminWithOrganization(invite, firstName, lastName, password) {
    const slug = invite.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      throw new ConflictError('Organization with this name already exists');
    }

    const user = await User.create({
      email: invite.email,
      password,
      firstName,
      lastName,
      role: invite.role,
      invitedBy: invite.invitedBy._id
    });

    const organization = await Organization.create({
      name: invite.organizationName,
      slug,
      adminUser: user._id,
      twoFactorMethod: TWO_FACTOR_METHODS.OTP
    });

    user.organization = organization._id;
    await user.save();

    return await User.findById(user._id).populate('organization');
  }

  async createRegularUser(invite, firstName, lastName, password) {
    await User.create({
      email: invite.email,
      password,
      firstName,
      lastName,
      role: invite.role,
      organization: invite.organization,
      invitedBy: invite.invitedBy._id
    });

    return await User.findOne({ email: invite.email }).populate('organization');
  }

  async setupUserTwoFactor(user, requestedMethod) {
    // For client_user, always use organization's MFA method (ignore requestedMethod)
    let preferredTwoFactor;
    if (user.role === ROLES.CLIENT_USER) {
      preferredTwoFactor = user.organization?.twoFactorMethod || "otp";
    } else {
      // For other roles, allow them to choose or fall back to organization's method
      preferredTwoFactor = requestedMethod || user.organization?.twoFactorMethod || null;
    }

    let totpSetup = null;

    if (preferredTwoFactor === TWO_FACTOR_METHODS.OTP || preferredTwoFactor === TWO_FACTOR_METHODS.TOTP) {
      user.twoFactorMethod = preferredTwoFactor;

      if (preferredTwoFactor === TWO_FACTOR_METHODS.TOTP && !user.totpEnabled) {
        const { secret, otpauthUrl } = generateTOTPSecret(user.email);
        const qrCode = await generateQRCode(otpauthUrl);
        user.totpSecret = secret;
        totpSetup = { secret, qrCode };
      }

      await user.save();
    }

    return { totpSetup, requiresTOTPSetup: preferredTwoFactor === TWO_FACTOR_METHODS.TOTP };
  }

  async getInviteDetails(token) {
    const invite = await Invite.findOne({ token })
      .populate('invitedBy', 'firstName lastName email')
      .populate('organization', 'name');

    if (!invite) {
      throw new NotFoundError('Invalid invite token');
    }

    if (!invite.isValid()) {
      throw new ValidationError('Invite has expired or is no longer valid');
    }

    return {
      email: invite.email,
      role: invite.role,
      organizationName: invite.organizationName || invite.organization?.name,
      invitedBy: invite.invitedBy ? {
        name: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`,
        email: invite.invitedBy.email
      } : null,
      expiresAt: invite.expiresAt
    };
  }

  async listInvites(userId, status) {
    const query = { invitedBy: userId };
    if (status) {
      query.status = status;
    }

    const invites = await Invite.find(query)
      .populate('acceptedUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return invites.map(invite => this.formatInviteListItem(invite));
  }

  async revokeInvite(inviteId, userId) {
    const invite = await Invite.findOne({
      _id: inviteId,
      invitedBy: userId
    });

    if (!invite) {
      throw new NotFoundError('Invite not found');
    }

    if (invite.status !== INVITE_STATUS.PENDING) {
      throw new ValidationError('Can only revoke pending invites');
    }

    invite.status = INVITE_STATUS.REVOKED;
    await invite.save();

    return { message: 'Invite revoked successfully' };
  }

  formatInviteResponse(invite, token) {
    return {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      token
    };
  }

  formatInviteListItem(invite) {
    return {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      organizationName: invite.organizationName,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      acceptedUser: invite.acceptedUserId ? {
        name: `${invite.acceptedUserId.firstName} ${invite.acceptedUserId.lastName}`,
        email: invite.acceptedUserId.email
      } : null
    };
  }
}

export default new InviteService();
