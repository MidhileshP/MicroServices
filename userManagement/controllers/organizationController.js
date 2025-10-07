import Organization from '../models/Organization.js';
import User from '../models/User.js';

export const getOrganization = async (req, res) => {
  try {
    const user = req.user;

    if (!user.organization) {
      return res.status(404).json({
        success: false,
        message: 'User does not belong to an organization'
      });
    }

    const organization = await Organization.findById(user.organization)
      .populate('adminUser', 'firstName lastName email');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    return res.json({
      success: true,
      organization: {
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
      }
    });

  } catch (error) {
    console.error('Get organization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const user = req.user;
    const { name, twoFactorMethod } = req.body;

    if (user.role !== 'client_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization admin can update settings'
      });
    }

    if (!user.organization) {
      return res.status(404).json({
        success: false,
        message: 'User does not belong to an organization'
      });
    }

    const organization = await Organization.findById(user.organization);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    if (organization.adminUser.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only organization admin can update settings'
      });
    }

    if (name) {
      organization.name = name;
    }

    if (twoFactorMethod && ['otp', 'totp'].includes(twoFactorMethod)) {
      organization.twoFactorMethod = twoFactorMethod;
    }

    await organization.save();

    return res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        twoFactorMethod: organization.twoFactorMethod,
        isActive: organization.isActive
      }
    });

  } catch (error) {
    console.error('Update organization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getOrganizationMembers = async (req, res) => {
  try {
    const user = req.user;

    if (!user.organization) {
      return res.status(404).json({
        success: false,
        message: 'User does not belong to an organization'
      });
    }

    const members = await User.find({
      organization: user.organization,
      isActive: true
    }).select('-password -totpSecret -otpHash');

    return res.json({
      success: true,
      members: members.map(member => member.toSafeObject())
    });

  } catch (error) {
    console.error('Get organization members error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
