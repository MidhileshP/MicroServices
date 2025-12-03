import { jest } from '@jest/globals';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-purposes';
process.env.PORT = '3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test';

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

// Mock socket client
jest.unstable_mockModule('../utils/socketClient.js', () => ({
  initSocketClient: jest.fn(),
  emitInviteAccepted: jest.fn(),
}));

// Mock rabbitmq
jest.unstable_mockModule('../utils/rabbitmq.js', () => ({
  connectRabbit: jest.fn(),
  disconnectRabbit: jest.fn(),
  publishEvent: jest.fn(),
  getRabbitChannel: jest.fn(),
}));

// Mock notification client
jest.unstable_mockModule('../utils/notificationClient.js', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true),
  sendInviteEmail: jest.fn().mockResolvedValue(true),
}));

// Increase test timeout
jest.setTimeout(30000);

