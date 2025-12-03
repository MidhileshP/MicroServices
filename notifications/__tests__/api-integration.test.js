import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';

/**
 * API INTEGRATION TESTS - Notifications Service
 * These tests verify complete API workflows for the notifications service
 */

let app;
let sendEmail;

beforeAll(async () => {
  // Mock mailer before importing app
  await jest.unstable_mockModule('../utils/mailer.js', () => ({
    initMailer: jest.fn(),
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id-123' }),
  }));

  // Import app after mocking
  app = (await import('../app.js')).default;
  
  // Get reference to mocked sendEmail
  const mailer = await import('../utils/mailer.js');
  sendEmail = mailer.sendEmail;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('API Integration Tests - Notifications Service', () => {
  describe('Email Sending Workflows', () => {
    it('should complete full email sending workflow', async () => {
      // Step 1: Send an email
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'user@example.com',
          subject: 'Welcome to Our Platform',
          html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
          text: 'Welcome! Thank you for joining us.'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent successfully');
      expect(response.body.messageId).toBeDefined();

      // Step 2: Verify sendEmail was called correctly
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Welcome to Our Platform',
        html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
        text: 'Welcome! Thank you for joining us.'
      });
    });

    it('should handle bulk email sending workflow', async () => {
      const emails = [
        {
          to: 'user1@example.com',
          subject: 'Newsletter 1',
          html: '<p>Content 1</p>'
        },
        {
          to: 'user2@example.com',
          subject: 'Newsletter 2',
          html: '<p>Content 2</p>'
        },
        {
          to: 'user3@example.com',
          subject: 'Newsletter 3',
          html: '<p>Content 3</p>'
        }
      ];

      const promises = emails.map(email =>
        request(app)
          .post('/api/email/send')
          .send(email)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });

      // Verify all emails were sent
      expect(sendEmail).toHaveBeenCalledTimes(3);
    });

    it('should handle email sending with various content types', async () => {
      // HTML only
      const htmlResponse = await request(app)
        .post('/api/email/send')
        .send({
          to: 'html@example.com',
          subject: 'HTML Email',
          html: '<h1>HTML Content</h1>'
        })
        .expect(200);

      expect(htmlResponse.body.success).toBe(true);

      // Text only
      const textResponse = await request(app)
        .post('/api/email/send')
        .send({
          to: 'text@example.com',
          subject: 'Text Email',
          text: 'Plain text content'
        })
        .expect(200);

      expect(textResponse.body.success).toBe(true);

      // Both HTML and text
      const bothResponse = await request(app)
        .post('/api/email/send')
        .send({
          to: 'both@example.com',
          subject: 'Mixed Email',
          html: '<p>HTML version</p>',
          text: 'Text version'
        })
        .expect(200);

      expect(bothResponse.body.success).toBe(true);

      expect(sendEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Email Validation Workflows', () => {
    it('should validate email inputs correctly', async () => {
      // Missing recipient
      const noRecipient = await request(app)
        .post('/api/email/send')
        .send({
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(400);

      expect(noRecipient.body.success).toBe(false);

      // Invalid email format
      const invalidEmail = await request(app)
        .post('/api/email/send')
        .send({
          to: 'invalid-email',
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(400);

      expect(invalidEmail.body.success).toBe(false);

      // Missing subject
      const noSubject = await request(app)
        .post('/api/email/send')
        .send({
          to: 'test@example.com',
          html: '<p>Test</p>'
        })
        .expect(400);

      expect(noSubject.body.success).toBe(false);

      // Missing content
      const noContent = await request(app)
        .post('/api/email/send')
        .send({
          to: 'test@example.com',
          subject: 'Test'
        })
        .expect(400);

      expect(noContent.body.success).toBe(false);

      // Verify no emails were sent for invalid requests
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle SMTP errors gracefully', async () => {
      // Mock SMTP failure
      sendEmail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'error@example.com',
          subject: 'Error Test',
          html: '<p>This should fail</p>'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to send email');
    });

    it('should handle various error scenarios', async () => {
      // Malformed JSON
      const malformedResponse = await request(app)
        .post('/api/email/send')
        .set('Content-Type', 'application/json')
        .send('{"invalid json"}')
        .expect(400);

      // Empty body
      const emptyResponse = await request(app)
        .post('/api/email/send')
        .send({})
        .expect(400);

      expect(emptyResponse.body.success).toBe(false);

      // Non-existent endpoint
      await request(app)
        .get('/api/email/nonexistent')
        .expect(404);
    });
  });

  describe('Service Health Workflows', () => {
    it('should verify service health and availability', async () => {
      // Check health endpoint
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.message).toContain('Notifications Service');
      expect(healthResponse.body.timestamp).toBeDefined();

      // Verify timestamp is recent
      const timestamp = new Date(healthResponse.body.timestamp);
      const now = new Date();
      const diffSeconds = (now - timestamp) / 1000;
      expect(diffSeconds).toBeLessThan(5); // Within 5 seconds
    });

    it('should handle 404 errors for non-existent routes', async () => {
      const routes = [
        '/api/nonexistent',
        '/invalid/route',
        '/api/email/wrong',
        '/api/health' // Should be /health not /api/health
      ];

      for (const route of routes) {
        const response = await request(app)
          .get(route)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      }
    });
  });

  describe('Concurrent Email Sending', () => {
    it('should handle multiple concurrent email requests', async () => {
      const emailCount = 10;
      const promises = [];

      for (let i = 0; i < emailCount; i++) {
        promises.push(
          request(app)
            .post('/api/email/send')
            .send({
              to: `user${i}@example.com`,
              subject: `Email ${i}`,
              html: `<p>Content ${i}</p>`
            })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.messageId).toBeDefined();
      });

      // Verify all were called
      expect(sendEmail).toHaveBeenCalledTimes(emailCount);
    });
  });

  describe('Content Handling Workflows', () => {
    it('should handle various content scenarios', async () => {
      // Long subject
      const longSubject = 'A'.repeat(500);
      const longSubjectResponse = await request(app)
        .post('/api/email/send')
        .send({
          to: 'test@example.com',
          subject: longSubject,
          html: '<p>Test</p>'
        })
        .expect(200);

      expect(longSubjectResponse.body.success).toBe(true);

      // Long HTML content
      const longHtml = '<p>' + 'Lorem ipsum '.repeat(1000) + '</p>';
      const longHtmlResponse = await request(app)
        .post('/api/email/send')
        .send({
          to: 'test@example.com',
          subject: 'Long Content',
          html: longHtml
        })
        .expect(200);

      expect(longHtmlResponse.body.success).toBe(true);

      // Special characters
      const specialResponse = await request(app)
        .post('/api/email/send')
        .send({
          to: 'test@example.com',
          subject: 'Test with 特殊文字 and émojis 🎉',
          html: '<p>Content with &lt;special&gt; chars</p>'
        })
        .expect(200);

      expect(specialResponse.body.success).toBe(true);

      expect(sendEmail).toHaveBeenCalledTimes(3);
    });
  });
});

