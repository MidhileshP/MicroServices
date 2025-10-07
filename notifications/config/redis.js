import { createClient } from 'redis';

let redisClient = null;
let redisPublisher = null;
let redisSubscriber = null;

export const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({ url: redisUrl });
    redisPublisher = redisClient.duplicate();
    redisSubscriber = redisClient.duplicate();

    await redisClient.connect();
    await redisPublisher.connect();
    await redisSubscriber.connect();

    console.log('Redis connected successfully');

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    redisPublisher.on('error', (err) => {
      console.error('Redis publisher error:', err);
    });

    redisSubscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err);
    });

  } catch (error) {
    console.error('Redis connection failed:', error.message);
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
    console.log('Redis connections closed');
  } catch (error) {
    console.error('Error closing Redis connections:', error.message);
  }
};
