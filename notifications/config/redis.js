import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { REDIS_CONFIG } from './constants.js';

let redisClient = null;
let redisPublisher = null;
let redisSubscriber = null;

export const connectRedis = async () => {
  try {
    const redisUrl = REDIS_CONFIG.URL;

    redisClient = createClient({ url: redisUrl });
    redisPublisher = redisClient.duplicate();
    redisSubscriber = redisClient.duplicate();

    await redisClient.connect();
    await redisPublisher.connect();
    await redisSubscriber.connect();

    logger.info('Redis connected successfully', { url: redisUrl });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    redisPublisher.on('error', (err) => {
      logger.error('Redis publisher error', { error: err.message });
    });

    redisSubscriber.on('error', (err) => {
      logger.error('Redis subscriber error', { error: err.message });
    });

  } catch (error) {
    logger.error('Redis connection failed', { error: error.message });
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const getRedisPublisher = () => {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized');
  }
  return redisPublisher;
};

export const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized');
  }
  return redisSubscriber;
};

export const disconnectRedis = async () => {
  try {
    if (redisClient) await redisClient.quit();
    if (redisPublisher) await redisPublisher.quit();
    if (redisSubscriber) await redisSubscriber.quit();
    logger.info('Redis connections closed successfully');
  } catch (error) {
    logger.error('Error closing Redis connections', { error: error.message });
  }
};
