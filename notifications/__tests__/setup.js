import { jest } from '@jest/globals';

// Mock environment variables
process.env.PORT = '4001';
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpassword';
process.env.SMTP_FROM = 'noreply@test.com';

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock logger
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Redis
jest.unstable_mockModule('../config/redis.js', () => ({
  connectRedis: jest.fn(),
  getRedisPublisher: jest.fn(() => ({ duplicate: jest.fn() })),
  getRedisSubscriber: jest.fn(() => ({ duplicate: jest.fn() })),
}));

// Mock RabbitMQ
jest.unstable_mockModule('../config/rabbitmq.js', () => ({
  connectRabbit: jest.fn(),
  disconnectRabbit: jest.fn(),
  getRabbitChannel: jest.fn(),
}));

// Mock mailer
jest.unstable_mockModule('../utils/mailer.js', () => ({
  initMailer: jest.fn(),
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));

// Increase test timeout
jest.setTimeout(30000);

