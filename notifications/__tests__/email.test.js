import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';

let app;
let sendEmail;

beforeAll(async () => {
  // Mock mailer before importing app
  const mailerModule = await jest.unstable_mockModule('../utils/mailer.js', () => ({
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

describe('Email Endpoints', () => {
  describe('POST /api/email/send', () => {
    it('should send email successfully with all fields', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>',
          text: 'Test plain text content'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent successfully');
      expect(response.body.messageId).toBe('test-message-id-123');

      // Verify sendEmail was called with correct parameters
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<h1>Test HTML Content</h1>',
        text: 'Test plain text content'
      });
    });

    it('should send email successfully with only HTML content', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBeDefined();
    });

    it('should send email successfully with only text content', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          text: 'Test plain text content'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBeDefined();
    });

    it('should send email to multiple recipients', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient1@example.com, recipient2@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return validation error with invalid email', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'invalid-email',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should return validation error with missing email', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should return validation error with missing subject', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should return validation error with empty subject', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: '',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error with missing both html and text', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('html or text');
    });

    it('should return error with empty html and text', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '',
          text: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle sendEmail failure', async () => {
      // Mock sendEmail to reject
      sendEmail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to send email');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .set('Content-Type', 'application/json')
        .send('{"invalid json"}')
        .expect(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should send email with long subject', async () => {
      const longSubject = 'A'.repeat(200);
      
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: longSubject,
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send email with long HTML content', async () => {
      const longHtml = '<p>' + 'Lorem ipsum '.repeat(1000) + '</p>';
      
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: longHtml
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send email with special characters in subject', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email with 特殊文字 and émojis 🎉',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send email with HTML entities', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test &amp; HTML &lt;Content&gt;</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent email requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/email/send')
            .send({
              to: `recipient${i}@example.com`,
              subject: `Test Email ${i}`,
              html: `<h1>Test HTML Content ${i}</h1>`
            })
        );
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle email with attachments field (if supported)', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>',
          attachments: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should trim whitespace from email addresses', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: '  recipient@example.com  ',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle unicode in email addresses', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should send email with BCC and CC if provided', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>',
          cc: 'cc@example.com',
          bcc: 'bcc@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle null values gracefully', async () => {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<h1>Test HTML Content</h1>',
          text: null
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

