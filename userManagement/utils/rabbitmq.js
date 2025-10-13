import amqplib from 'amqplib';
import { logger } from './logger.js';

let connection = null;
let channel = null;

export const connectRabbit = async () => {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || '5672';
  const user = process.env.RABBITMQ_USER;
  const pass = process.env.RABBITMQ_PASS;

  const creds = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const builtUrl = `amqp://${creds}${host}:${port}`;
  const url = process.env.RABBITMQ_URL || builtUrl;

  try {
    connection = await amqplib.connect(url, { heartbeat: 30 });
    connection.on('error', (err) => logger.error('RabbitMQ connection error', { error: err.message }));
    connection.on('close', () => logger.warn('RabbitMQ connection closed'));

    channel = await connection.createConfirmChannel();
    channel.on('error', (err) => logger.error('RabbitMQ channel error', { error: err.message }));
    channel.on('close', () => logger.warn('RabbitMQ channel closed'));

    logger.info('RabbitMQ connected successfully', { host, port });
  } catch (error) {
    logger.error('RabbitMQ connection failed', { error: error?.message || error, host, port });
    throw error;
  }
};

export const getRabbitChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

export const publishEvent = async (exchange, routingKey, message) => {
  if (!channel) {
    logger.warn('RabbitMQ channel not initialized, skipping event publish', { exchange, routingKey });
    return false;
  }

  try {
    await channel.assertExchange(exchange, 'topic', { durable: true });
    const payload = Buffer.from(JSON.stringify(message));

    return new Promise((resolve, reject) => {
      channel.publish(exchange, routingKey, payload, { contentType: 'application/json', persistent: true }, (err) => {
        if (err) {
          logger.error('RabbitMQ publish failed', { error: err.message, exchange, routingKey });
          return reject(err);
        }
        logger.debug('RabbitMQ event published', { exchange, routingKey });
        resolve(true);
      });
    });
  } catch (error) {
    logger.error('RabbitMQ publish error', { error: error.message, exchange, routingKey });
    throw error;
  }
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


