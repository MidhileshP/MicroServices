import amqplib from 'amqplib';
import { logger } from '../utils/logger.js';

let connection = null;
let channel = null;

export const connectRabbit = async () => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  try {
    connection = await amqplib.connect(url, { heartbeat: 30 });
    connection.on('error', (err) => logger.error('RabbitMQ connection error', { error: err.message }));
    connection.on('close', () => logger.warn('RabbitMQ connection closed'));

    channel = await connection.createConfirmChannel();
    channel.on('error', (err) => logger.error('RabbitMQ channel error', { error: err.message }));
    channel.on('close', () => logger.warn('RabbitMQ channel closed'));

    logger.info('RabbitMQ connected successfully', { url });
  } catch (error) {
    logger.error('RabbitMQ connection failed', { error: error?.message || error, url });
    throw error;
  }
};

export const getRabbitChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

export const disconnectRabbit = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ disconnected successfully');
  } catch (error) {
    logger.error('RabbitMQ disconnect error', { error: error?.message || error });
  }
};


