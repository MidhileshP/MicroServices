import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDatabase = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
  }
};
