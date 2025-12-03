import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * API INTEGRATION TESTS
 * These tests verify complete API workflows from a user's perspective
 * Testing full user journeys through multiple endpoints
 */

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

describe('API Integration Tests - Complete User Flows', () => {
  describe('User Registration & Authentication Flow', () => {
    it('should complete full invite-accept-login-profile flow', async () => {
      // Step 1: Create an admin user
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      // Step 2: Admin logs in
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!'
        })
        .expect(200);

      expect(adminLogin.body.accessToken).toBeDefined();
      const adminToken = adminLogin.body.accessToken;

      // Step 3: Admin creates an invite
      const createInvite = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'operator'
        })
        .expect(201);

      expect(createInvite.body.invite).toBeDefined();
      const inviteToken = createInvite.body.invite.token;

      // Step 4: New user accepts invite
      const acceptInvite = await request(app)
        .post('/api/invites/accept')
        .send({
          token: inviteToken,
          firstName: 'New',
          lastName: 'User',
          password: 'NewUserPass123!',
          twoFactorMethod: 'otp'
        })
        .expect(201);

      expect(acceptInvite.body.user).toBeDefined();
      expect(acceptInvite.body.user.email).toBe('newuser@example.com');

      // Step 5: New user logs in
      const newUserLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'NewUserPass123!'
        })
        .expect(200);

      expect(newUserLogin.body.accessToken).toBeDefined();
      const newUserToken = newUserLogin.body.accessToken;

      // Step 6: New user views their profile
      const profile = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(profile.body.user.email).toBe('newuser@example.com');
      expect(profile.body.user.role).toBe('operator');
      expect(profile.body.user.password).toBeUndefined();
    });
  });

  describe('Organization Management Flow', () => {
    it('should complete organization creation and member management flow', async () => {
      // Step 1: Create super admin
      const superAdmin = await User.create({
        email: 'superadmin@example.com',
        password: 'SuperPass123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        isActive: true
      });

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@example.com',
          password: 'SuperPass123!'
        })
        .expect(200);

      const adminToken = adminLogin.body.accessToken;

      // Step 2: Create organization with client admin
      const org = await Organization.create({
        name: 'Test Company'
      });

      const clientAdmin = await User.create({
        email: 'clientadmin@example.com',
        password: 'ClientPass123!',
        firstName: 'Client',
        lastName: 'Admin',
        role: 'client_admin',
        isActive: true,
        organization: org._id
      });

      // Step 3: Client admin logs in
      const clientLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'clientadmin@example.com',
          password: 'ClientPass123!'
        })
        .expect(200);

      const clientToken = clientLogin.body.accessToken;

      // Step 4: Client admin invites a user
      const inviteResponse = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          email: 'teamuser@example.com',
          role: 'client_user'
        })
        .expect(201);

      expect(inviteResponse.body.invite.email).toBe('teamuser@example.com');

      // Step 5: Team user accepts and joins organization
      const acceptResponse = await request(app)
        .post('/api/invites/accept')
        .send({
          token: inviteResponse.body.invite.token,
          firstName: 'Team',
          lastName: 'User',
          password: 'TeamPass123!',
          twoFactorMethod: 'otp'
        })
        .expect(201);

      expect(acceptResponse.body.user.organization.toString()).toBe(org._id.toString());
    });
  });

  describe('Token Refresh Flow', () => {
    it('should complete login-refresh-logout flow', async () => {
      // Step 1: Create user
      const user = await User.create({
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'operator',
        isActive: true
      });

      // Step 2: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        })
        .expect(200);

      const { accessToken: token1, refreshToken: refresh1 } = loginResponse.body;
      expect(token1).toBeDefined();
      expect(refresh1).toBeDefined();

      // Step 3: Use access token
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(profileResponse.body.user.email).toBe('test@example.com');

      // Step 4: Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh1 })
        .expect(200);

      const { accessToken: token2, refreshToken: refresh2 } = refreshResponse.body;
      expect(token2).toBeDefined();
      expect(token2).not.toBe(token1); // New token
      expect(refresh2).toBeDefined();
      expect(refresh2).not.toBe(refresh1); // New refresh token

      // Step 5: Use new access token
      const profile2Response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(profile2Response.body.user.email).toBe('test@example.com');

      // Step 6: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: refresh2 })
        .expect(200);

      expect(logoutResponse.body.message).toContain('Logged out');

      // Step 7: Old refresh token should not work
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh2 })
        .expect(401);
    });
  });

  describe('TOTP Setup Flow', () => {
    it('should complete TOTP setup and configuration flow', async () => {
      // Step 1: Create and login user
      const user = await User.create({
        email: 'totp@example.com',
        password: 'TotpPass123!',
        firstName: 'TOTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'totp@example.com',
          password: 'TotpPass123!'
        })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      // Step 2: Setup TOTP
      const setupResponse = await request(app)
        .post('/api/auth/totp/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(setupResponse.body.secret).toBeDefined();
      expect(setupResponse.body.qrCode).toBeDefined();
      expect(setupResponse.body.message).toContain('QR code');

      // Step 3: Change MFA method to TOTP
      const changeMfaResponse = await request(app)
        .post('/api/auth/mfa/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'totp' })
        .expect(200);

      expect(changeMfaResponse.body.message).toContain('totp');
      expect(changeMfaResponse.body.totpSetup).toBeDefined();
    });
  });

  describe('Invite Management Flow', () => {
    it('should complete create-list-revoke invite flow', async () => {
      // Step 1: Create admin
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!'
        })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      // Step 2: Create multiple invites
      const invite1 = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'user1@example.com',
          role: 'operator'
        })
        .expect(201);

      const invite2 = await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'user2@example.com',
          role: 'site_admin'
        })
        .expect(201);

      // Step 3: List invites
      const listResponse = await request(app)
        .get('/api/invites/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listResponse.body.invites).toBeDefined();
      expect(listResponse.body.invites.length).toBeGreaterThanOrEqual(2);

      // Step 4: Get invite details
      const detailsResponse = await request(app)
        .get(`/api/invites/details/${invite1.body.invite.token}`)
        .expect(200);

      expect(detailsResponse.body.invite.email).toBe('user1@example.com');

      // Step 5: Revoke invite
      const revokeResponse = await request(app)
        .delete(`/api/invites/${invite2.body.invite._id}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(revokeResponse.body.success).toBe(true);

      // Step 6: Verify revoked invite cannot be accepted
      await request(app)
        .post('/api/invites/accept')
        .send({
          token: invite2.body.invite.token,
          firstName: 'Should',
          lastName: 'Fail',
          password: 'Pass123!',
          twoFactorMethod: 'otp'
        })
        .expect(400);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle various error scenarios correctly', async () => {
      // Test 1: Login with non-existent user
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass123!'
        })
        .expect(401);

      // Test 2: Access protected route without token
      await request(app)
        .get('/api/auth/profile')
        .expect(401);

      // Test 3: Access protected route with invalid token
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test 4: Create invite without permission
      const user = await User.create({
        email: 'user@example.com',
        password: 'UserPass123!',
        firstName: 'Regular',
        lastName: 'User',
        role: 'client_user',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'UserPass123!'
        })
        .expect(200);

      await request(app)
        .post('/api/invites/create')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          email: 'newuser@example.com',
          role: 'operator'
        })
        .expect(403);

      // Test 5: Invalid invite token
      await request(app)
        .get('/api/invites/details/invalid-token-123')
        .expect(404);

      // Test 6: Non-existent route
      await request(app)
        .get('/api/nonexistent/endpoint')
        .expect(404);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous API requests', async () => {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!'
        })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      // Create 5 invites concurrently
      const invitePromises = [];
      for (let i = 0; i < 5; i++) {
        invitePromises.push(
          request(app)
            .post('/api/invites/create')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              email: `user${i}@example.com`,
              role: 'operator'
            })
        );
      }

      const results = await Promise.all(invitePromises);

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.invite).toBeDefined();
      });

      // Verify all invites were created
      const listResponse = await request(app)
        .get('/api/invites/list')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listResponse.body.invites.length).toBe(5);
    });
  });
});

