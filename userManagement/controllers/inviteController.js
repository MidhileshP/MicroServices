import User from '../models/User.js';
import Invite from '../models/Invite.js';
import Organization from '../models/Organization.js';
import RefreshToken from '../models/RefreshToken.js';
import { canInviteRole, needsOrganization, isHigherRole } from '../utils/roleHierarchy.js';
import { sendInviteEmail } from '../utils/notificationClient.js';
import { publishEvent } from '../utils/rabbitmq.js';
import { generateAccessToken } from '../utils/jwt.js';
import { emitInviteAccepted } from '../utils/socketClient.js';

export const createInvite = async (req, res) => {
  try {
    const { email, role, organizationName } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const inviter = req.user;

    if (!canInviteRole(inviter.role, role)) {
      return res.status(403).json({
        success: false,
        message: `You cannot invite users with role: ${role}`
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const pendingInvite = await Invite.findOne({ email: normalizedEmail, status: 'pending' });

    if (pendingInvite) {
      // If expired, refresh token and expiry; otherwise, resend existing invite
      if (pendingInvite.isExpired()) {
        const newToken = Invite.generateToken();
        pendingInvite.token = newToken;
        pendingInvite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        pendingInvite.status = 'pending';
        await pendingInvite.save();

        const inviterName = `${inviter.firstName} ${inviter.lastName}`;
        await sendInviteEmail(normalizedEmail, newToken, inviterName, role);
        await publishEvent(
          process.env.RABBITMQ_EXCHANGE || 'events',
          process.env.RABBITMQ_ROUTE_INVITE || 'user.invite.created',
          {
            to: normalizedEmail,
            subject: 'You have been invited',
            html: `You have been invited by ${inviterName}. Use token: ${newToken}`
          }
        );

        return res.status(200).json({
          success: true,
          message: 'Existing expired invite refreshed and re-sent'
        });
      }

      const inviterName = `${inviter.firstName} ${inviter.lastName}`;
      await sendInviteEmail(normalizedEmail, pendingInvite.token, inviterName, role);
      await publishEvent(
        process.env.RABBITMQ_EXCHANGE || 'events',
        process.env.RABBITMQ_ROUTE_INVITE || 'user.invite.created',
        {
          to: normalizedEmail,
          subject: 'You have been invited',
          html: `You have been invited by ${inviterName}. Use token: ${pendingInvite.token}`
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Active invite already existed; invitation re-sent'
      });
    }

    let organizationId = null;

    if (needsOrganization(role)) {
      if (role === 'client_admin') {
        if (!organizationName) {
          return res.status(400).json({
            success: false,
            message: 'Organization name required for client_admin role'
          });
        }
      } else if (role === 'client_user') {
        if (!inviter.organization) {
          return res.status(400).json({
            success: false,
            message: 'You must belong to an organization to invite client users'
          });
        }
        organizationId = inviter.organization;
      }
    }

    const token = Invite.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await Invite.create({
      email: normalizedEmail,
      role,
      invitedBy: inviter._id,
      organization: organizationId,
      organizationName: role === 'client_admin' ? organizationName : null,
      token,
      expiresAt
    });

    const inviterName = `${inviter.firstName} ${inviter.lastName}`;

    try {
    await sendInviteEmail(normalizedEmail, token, inviterName, role);
    } catch (emailError) {
      console.error('[invite] Email sending failed, but invite created:', emailError.message);
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
    } catch (rabbitError) {
      console.error('[invite] RabbitMQ publish failed:', rabbitError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      invite: {
        id: invite._id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        token: token
      }
    });

  } catch (error) {
    console.error('Create invite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token, firstName, lastName, password } = req.body;

    const invite = await Invite.findOne({ token }).populate('invitedBy');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite token'
      });
    }

    if (!invite.isValid()) {
      invite.status = 'expired';
      await invite.save();

      return res.status(400).json({
        success: false,
        message: 'Invite has expired or is no longer valid'
      });
    }

    let organizationId = invite.organization;

    if (invite.role === 'client_admin' && invite.organizationName) {
      const slug = invite.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const existingOrg = await Organization.findOne({ slug });

      if (existingOrg) {
        return res.status(400).json({
          success: false,
          message: 'Organization with this name already exists'
        });
      }

      const tempUser = await User.create({
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
        adminUser: tempUser._id,
        twoFactorMethod: 'otp'
      });

      tempUser.organization = organization._id;
      await tempUser.save();

    } else {
      await User.create({
        email: invite.email,
        password,
        firstName,
        lastName,
        role: invite.role,
        organization: organizationId,
        invitedBy: invite.invitedBy._id
      });
    }

    const user = await User.findOne({ email: invite.email }).populate('organization');

    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.acceptedUserId = user._id;
    await invite.save();

    emitInviteAccepted(invite.invitedBy._id, user.email, user.role);

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user._id, req);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      refreshToken: refreshToken.token,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInviteDetails = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token })
      .populate('invitedBy', 'firstName lastName email')
      .populate('organization', 'name');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite token'
      });
    }

    if (!invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invite has expired or is no longer valid'
      });
    }

    return res.json({
      success: true,
      invite: {
        email: invite.email,
        role: invite.role,
        organizationName: invite.organizationName || invite.organization?.name,
        invitedBy: invite.invitedBy ? {
          name: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`,
          email: invite.invitedBy.email
        } : null,
        expiresAt: invite.expiresAt
      }
    });

  } catch (error) {
    console.error('Get invite details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const listInvites = async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.query;

    const query = { invitedBy: user._id };
    if (status) {
      query.status = status;
    }

    const invites = await Invite.find(query)
      .populate('acceptedUserId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      invites: invites.map(invite => ({
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
      }))
    });

  } catch (error) {
    console.error('List invites error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const revokeInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const user = req.user;

    const invite = await Invite.findOne({
      _id: inviteId,
      invitedBy: user._id
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only revoke pending invites'
      });
    }

    invite.status = 'revoked';
    await invite.save();

    return res.json({
      success: true,
      message: 'Invite revoked successfully'
    });

  } catch (error) {
    console.error('Revoke invite error:', error);
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
