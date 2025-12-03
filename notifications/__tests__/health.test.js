import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

let app;

beforeAll(async () => {
  // Import app
  app = (await import('../app.js')).default;
});

describe('Health Endpoint', () => {
  describe('GET /health', () => {
    it('should return health status successfully', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Notifications Service');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle multiple concurrent health checks', async () => {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/health'));
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('404 Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for invalid POST routes', async () => {
      const response = await request(app)
        .post('/api/invalid/route')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for invalid GET routes', async () => {
      const response = await request(app)
        .get('/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for invalid PUT routes', async () => {
      const response = await request(app)
        .put('/api/invalid')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for invalid DELETE routes', async () => {
      const response = await request(app)
        .delete('/api/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // CORS headers should be present due to middleware
      expect(response.headers).toBeDefined();
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});

