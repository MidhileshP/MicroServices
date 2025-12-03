import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

let mongoServer;
let app;
let User;
let Organization;
let RefreshToken;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Import models after DB connection
  User = (await import('../models/User.js')).default;
  Organization = (await import('../models/Organization.js')).default;
  RefreshToken = (await import('../models/RefreshToken.js')).default;

  // Import app after everything is set up
  app = (await import('../app.js')).default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  await User.deleteMany({});
  await Organization.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials (no 2FA)', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should initiate OTP flow when user has OTP 2FA enabled', async () => {
      const user = await User.create({
        email: 'otp@example.com',
        password: 'Password123!',
        firstName: 'OTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'otp'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'otp@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.twoFactorMethod).toBe('otp');
      expect(response.body.userId).toBeDefined();
      expect(response.body.message).toContain('OTP');
    });

    it('should initiate TOTP flow when user has TOTP 2FA enabled', async () => {
      const user = await User.create({
        email: 'totp@example.com',
        password: 'Password123!',
        firstName: 'TOTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'totp',
        totpSecret: 'JBSWY3DPEHPK3PXP',
        totpEnabled: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'totp@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.twoFactorMethod).toBe('totp');
      expect(response.body.userId).toBeDefined();
    });

    it('should return error with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return error with invalid password', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for inactive user', async () => {
      await User.create({
        email: 'inactive@example.com',
        password: 'Password123!',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'super_admin',
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should use organization 2FA method when available', async () => {
      const org = await Organization.create({
        name: 'Test Org',
        twoFactorMethod: 'otp'
      });

      await User.create({
        email: 'orguser@example.com',
        password: 'Password123!',
        firstName: 'Org',
        lastName: 'User',
        role: 'client_admin',
        isActive: true,
        organization: org._id,
        twoFactorMethod: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'orguser@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.twoFactorMethod).toBe('otp');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP successfully and return tokens', async () => {
      const otpCode = '123456';
      const hashedOtp = await bcrypt.hash(otpCode, 10);

      const user = await User.create({
        email: 'otp@example.com',
        password: 'Password123!',
        firstName: 'OTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'otp',
        otpHash: hashedOtp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString(),
          otp: otpCode
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();

      // Verify OTP was cleared
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.otpHash).toBeNull();
    });

    it('should return error with invalid OTP', async () => {
      const otpCode = '123456';
      const hashedOtp = await bcrypt.hash(otpCode, 10);

      const user = await User.create({
        email: 'otp@example.com',
        password: 'Password123!',
        firstName: 'OTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'otp',
        otpHash: hashedOtp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString(),
          otp: '999999'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OTP');
    });

    it('should return error with expired OTP', async () => {
      const otpCode = '123456';
      const hashedOtp = await bcrypt.hash(otpCode, 10);

      const user = await User.create({
        email: 'otp@example.com',
        password: 'Password123!',
        firstName: 'OTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'otp',
        otpHash: hashedOtp,
        otpExpiry: new Date(Date.now() - 1000) // Expired
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString(),
          otp: otpCode
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should return error when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: fakeId.toString(),
          otp: '123456'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error when no OTP is set', async () => {
      const user = await User.create({
        email: 'otp@example.com',
        password: 'Password123!',
        firstName: 'OTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'otp'
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString(),
          otp: '123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing userId', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          otp: '123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing otp', async () => {
      const user = await User.create({
        email: 'otp@example.com',
        password: 'Password123!',
        firstName: 'OTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-totp', () => {
    it('should return validation error with missing userId', async () => {
      const response = await request(app)
        .post('/api/auth/verify-totp')
        .send({
          token: '123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing token', async () => {
      const user = await User.create({
        email: 'totp@example.com',
        password: 'Password123!',
        firstName: 'TOTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/verify-totp')
        .send({
          userId: user._id.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error when user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/auth/verify-totp')
        .send({
          userId: fakeId.toString(),
          token: '123456'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return error when TOTP not initialized', async () => {
      const user = await User.create({
        email: 'totp@example.com',
        password: 'Password123!',
        firstName: 'TOTP',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'totp'
      });

      const response = await request(app)
        .post('/api/auth/verify-totp')
        .send({
          userId: user._id.toString(),
          token: '123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not initialized');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const { refreshToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.refreshToken).not.toBe(refreshToken); // New token
    });

    it('should return error with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error with expired refresh token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const token = RefreshToken.generateToken();
      await RefreshToken.create({
        token,
        user: user._id,
        expiresAt: new Date(Date.now() - 1000), // Expired
        userAgent: 'test',
        ipAddress: '127.0.0.1'
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: token })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with revoked refresh token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const token = RefreshToken.generateToken();
      await RefreshToken.create({
        token,
        user: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: 'test',
        ipAddress: '127.0.0.1',
        isRevoked: true
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: token })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const { refreshToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');

      // Verify token is revoked
      const token = await RefreshToken.findOne({ token: refreshToken });
      expect(token.isRevoked).toBe(true);
    });

    it('should handle logout without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.totpSecret).toBeUndefined();
      expect(response.body.user.otpHash).toBeUndefined();
    });

    it('should return error without authentication token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/totp/setup', () => {
    it('should setup TOTP successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/auth/totp/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.message).toContain('QR code');

      // Verify secret was stored
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.totpSecret).toBeDefined();
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/totp/setup')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/totp/confirm', () => {
    it('should return validation error with missing token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/totp/confirm')
        .send({
          userId: user._id.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error with missing userId', async () => {
      const response = await request(app)
        .post('/api/auth/totp/confirm')
        .send({
          token: '123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error when TOTP not initialized', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/totp/confirm')
        .send({
          userId: user._id.toString(),
          token: '123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not initialized');
    });
  });

  describe('POST /api/auth/mfa/change', () => {
    it('should change MFA method from OTP to TOTP', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: 'otp'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      // Verify OTP to get tokens
      const otpCode = '123456';
      const hashedOtp = await bcrypt.hash(otpCode, 10);
      await User.findByIdAndUpdate(user._id, {
        otpHash: hashedOtp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
      });

      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString(),
          otp: otpCode
        });

      const { accessToken } = verifyResponse.body;

      const response = await request(app)
        .post('/api/auth/mfa/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'totp' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('totp');
      expect(response.body.totpSetup).toBeDefined();
      expect(response.body.requiresTOTPConfirmation).toBe(true);
    });

    it('should change MFA method from TOTP to OTP', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        twoFactorMethod: null
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/auth/mfa/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'otp' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('otp');
      expect(response.body.requiresTOTPConfirmation).toBe(false);

      // Verify TOTP was cleared
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.totpSecret).toBeNull();
      expect(updatedUser.totpEnabled).toBe(false);
    });

    it('should return error when client_user tries to change MFA', async () => {
      const org = await Organization.create({
        name: 'Test Org',
        twoFactorMethod: 'otp'
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

      // Login and get tokens (assuming org has OTP)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'client@example.com',
          password: 'Password123!'
        });

      const otpCode = '123456';
      const hashedOtp = await bcrypt.hash(otpCode, 10);
      await User.findByIdAndUpdate(user._id, {
        otpHash: hashedOtp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
      });

      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user._id.toString(),
          otp: otpCode
        });

      const { accessToken } = verifyResponse.body;

      const response = await request(app)
        .post('/api/auth/mfa/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'totp' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('organization');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/change')
        .send({ method: 'totp' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with invalid MFA method', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/api/auth/mfa/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'invalid_method' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

