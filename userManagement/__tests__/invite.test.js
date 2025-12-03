import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
let app;
let User;
let Organization;
let Invite;
let RefreshToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  User = (await import('../models/User.js')).default;
  Organization = (await import('../models/Organization.js')).default;
  Invite = (await import('../models/Invite.js')).default;
  RefreshToken = (await import('../models/RefreshToken.js')).default;

  app = (await import('../app.js')).default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Invite.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Invite Endpoints', () => {
  describe('POST /api/invites/create', () => {
    it('should create invite successfully as super_admin', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'operator',
          organizationName: 'New Organization'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.invite).toBeDefined();
      expect(response.body.invite.email).toBe('newuser@example.com');
      expect(response.body.invite.role).toBe('operator');
      expect(response.body.invite.token).toBeDefined();
    });

    it('should create invite successfully as site_admin', async () => {
      const user = await User.create({
        email: 'siteadmin@example.com',
        password: 'Password123!',
        firstName: 'Site',
        lastName: 'Admin',
        role: 'site_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'siteadmin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'operator'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should create invite successfully as client_admin for their organization', async () => {
      const org = await Organization.create({
        name: 'Client Org',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'clientadmin@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'Admin',
        role: 'client_admin',
        isActive: true,
        organization: org._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'clientadmin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newclientuser@example.com',
          role: 'client_user'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.invite.role).toBe('client_user');
    });

    it('should return error when creating invite for existing user', async () => {
      const existingUser = await User.create({
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Existing',
        lastName: 'User',
        role: 'operator',
        isActive: true
      });

      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'existing@example.com',
          role: 'operator'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/invites/create')
        .send({
          email: 'newuser@example.com',
          role: 'operator'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (client_user)', async () => {
      const org = await Organization.create({
        name: 'Client Org'
      });

      const user = await User.create({
        email: 'clientuser@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'User',
        role: 'client_user',
        isActive: true,
        organization: org._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'clientuser@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'client_user'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing email', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          role: 'operator'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with invalid email format', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'invalid-email',
          role: 'operator'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing role', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newuser@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with invalid role', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'invalid_role'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/invites/accept', () => {
    it('should accept invite successfully with OTP 2FA', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          firstName: 'New',
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'otp'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');

      // Verify user was created
      const newUser = await User.findOne({ email: 'newuser@example.com' });
      expect(newUser).toBeDefined();
      expect(newUser.role).toBe('operator');

      // Verify invite was marked as accepted
      const updatedInvite = await Invite.findById(invite._id);
      expect(updatedInvite.status).toBe('accepted');
    });

    it('should accept invite successfully with TOTP 2FA', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          firstName: 'New',
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'totp'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.totp).toBeDefined();
      expect(response.body.totp.secret).toBeDefined();
      expect(response.body.totp.qrCode).toBeDefined();
    });

    it('should return error with invalid invite token', async () => {
      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: 'invalid-token',
          firstName: 'New',
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'otp'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error with expired invite', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: 'expired'
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          firstName: 'New',
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'otp'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error with already accepted invite', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'accepted'
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          firstName: 'New',
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'otp'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error with revoked invite', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'revoked'
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          firstName: 'New',
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'otp'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing firstName', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          lastName: 'User',
          password: 'Password123!',
          twoFactorMethod: 'otp'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with short password', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite.token,
          firstName: 'New',
          lastName: 'User',
          password: 'short',
          twoFactorMethod: 'otp'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/invites/details/:token', () => {
    it('should get invite details successfully', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .get(`/api/invites/details/${invite.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.invite).toBeDefined();
      expect(response.body.invite.email).toBe('newuser@example.com');
      expect(response.body.invite.role).toBe('operator');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/invites/details/invalid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error for expired invite', async () => {
      const inviter = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'newuser@example.com',
        role: 'operator',
        invitedBy: inviter._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() - 1000),
        status: 'expired'
      });

      const response = await request(app)
        .get(`/api/invites/details/${invite.token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/invites/list', () => {
    it('should list all invites for authorized user', async () => {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      await Invite.create({
        email: 'user1@example.com',
        role: 'operator',
        invitedBy: admin._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await Invite.create({
        email: 'user2@example.com',
        role: 'operator',
        invitedBy: admin._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/invites/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.invites).toBeDefined();
      expect(response.body.invites.length).toBe(2);
    });

    it('should filter invites by status', async () => {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      await Invite.create({
        email: 'pending@example.com',
        role: 'operator',
        invitedBy: admin._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });

      await Invite.create({
        email: 'accepted@example.com',
        role: 'operator',
        invitedBy: admin._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'accepted'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/invites/list?status=pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.invites.length).toBe(1);
      expect(response.body.invites[0].status).toBe('pending');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/invites/list')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions', async () => {
      const org = await Organization.create({
        name: 'Client Org'
      });

      const user = await User.create({
        email: 'client@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'User',
        role: 'client_user',
        isActive: true,
        organization: org._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'client@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/invites/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/invites/:inviteId/revoke', () => {
    it('should revoke invite successfully', async () => {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const invite = await Invite.create({
        email: 'user@example.com',
        role: 'operator',
        invitedBy: admin._id,
        token: Invite.generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .delete(`/api/invites/${invite._id}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify invite was revoked
      const revokedInvite = await Invite.findById(invite._id);
      expect(revokedInvite.status).toBe('revoked');
    });

    it('should return error when revoking non-existent invite', async () => {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/invites/${fakeId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/invites/${fakeId}/revoke`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions', async () => {
      const org = await Organization.create({
        name: 'Client Org'
      });

      const user = await User.create({
        email: 'client@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'User',
        role: 'client_user',
        isActive: true,
        organization: org._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'client@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/invites/${fakeId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});

