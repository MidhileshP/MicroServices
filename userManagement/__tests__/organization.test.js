import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
let app;
let User;
let Organization;
let RefreshToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  User = (await import('../models/User.js')).default;
  Organization = (await import('../models/Organization.js')).default;
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
  await RefreshToken.deleteMany({});
});

describe('Organization Endpoints', () => {
  describe('GET /api/organization', () => {
    it('should get organization details successfully as client_admin', async () => {
      const org = await Organization.create({
        name: 'Test Organization',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organization).toBeDefined();
      expect(response.body.organization.name).toBe('Test Organization');
      expect(response.body.organization.twoFactorMethod).toBe('otp');
    });

    it('should get organization details successfully as client_user', async () => {
      const org = await Organization.create({
        name: 'Test Organization',
        twoFactorMethod: 'totp'
      });

      const user = await User.create({
        email: 'user@example.com',
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
          email: 'user@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organization).toBeDefined();
    });

    it('should return error when user has no organization', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        isActive: true,
        organization: null
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/organization')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (super_admin)', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin',
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
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (operator)', async () => {
      const user = await User.create({
        email: 'operator@example.com',
        password: 'Password123!',
        firstName: 'Operator',
        lastName: 'User',
        role: 'operator',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'operator@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/organization', () => {
    it('should update organization name successfully', async () => {
      const org = await Organization.create({
        name: 'Old Name',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Organization Name'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organization.name).toBe('New Organization Name');
      expect(response.body.message).toContain('updated');

      // Verify organization was updated
      const updatedOrg = await Organization.findById(org._id);
      expect(updatedOrg.name).toBe('New Organization Name');
    });

    it('should update organization 2FA method successfully', async () => {
      const org = await Organization.create({
        name: 'Test Org',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          twoFactorMethod: 'totp'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organization.twoFactorMethod).toBe('totp');

      // Verify organization was updated
      const updatedOrg = await Organization.findById(org._id);
      expect(updatedOrg.twoFactorMethod).toBe('totp');
    });

    it('should update both name and 2FA method', async () => {
      const org = await Organization.create({
        name: 'Old Name',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Name',
          twoFactorMethod: 'totp'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organization.name).toBe('New Name');
      expect(response.body.organization.twoFactorMethod).toBe('totp');
    });

    it('should return error with invalid 2FA method', async () => {
      const org = await Organization.create({
        name: 'Test Org',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          twoFactorMethod: 'invalid_method'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error when user has no organization', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'Admin',
        role: 'client_admin',
        isActive: true,
        organization: null
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Name'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .put('/api/organization')
        .send({
          name: 'New Name'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (client_user)', async () => {
      const org = await Organization.create({
        name: 'Test Org',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'user@example.com',
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
          email: 'user@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Name'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (super_admin)', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin',
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
        .put('/api/organization')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Name'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/organization/members', () => {
    it('should get organization members successfully', async () => {
      const org = await Organization.create({
        name: 'Test Organization',
        twoFactorMethod: 'otp'
      });

      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'Admin',
        role: 'client_admin',
        isActive: true,
        organization: org._id
      });

      const user1 = await User.create({
        email: 'user1@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'One',
        role: 'client_user',
        isActive: true,
        organization: org._id
      });

      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'Two',
        role: 'client_user',
        isActive: true,
        organization: org._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.members).toBeDefined();
      expect(response.body.members.length).toBe(3); // admin + 2 users

      // Verify passwords are not included
      response.body.members.forEach(member => {
        expect(member.password).toBeUndefined();
        expect(member.totpSecret).toBeUndefined();
      });
    });

    it('should only return active members', async () => {
      const org = await Organization.create({
        name: 'Test Organization',
        twoFactorMethod: 'otp'
      });

      const admin = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'Admin',
        role: 'client_admin',
        isActive: true,
        organization: org._id
      });

      const activeUser = await User.create({
        email: 'active@example.com',
        password: 'Password123!',
        firstName: 'Active',
        lastName: 'User',
        role: 'client_user',
        isActive: true,
        organization: org._id
      });

      const inactiveUser = await User.create({
        email: 'inactive@example.com',
        password: 'Password123!',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'client_user',
        isActive: false,
        organization: org._id
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.members.length).toBe(2); // Only active members
    });

    it('should allow client_user to view members', async () => {
      const org = await Organization.create({
        name: 'Test Organization',
        twoFactorMethod: 'otp'
      });

      const user = await User.create({
        email: 'user@example.com',
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
          email: 'user@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.members).toBeDefined();
    });

    it('should return error when user has no organization', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'Admin',
        role: 'client_admin',
        isActive: true,
        organization: null
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/organization/members')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (super_admin)', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin',
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
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return error with insufficient permissions (operator)', async () => {
      const user = await User.create({
        email: 'operator@example.com',
        password: 'Password123!',
        firstName: 'Operator',
        lastName: 'User',
        role: 'operator',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'operator@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/organization/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});

