import amqplib from 'amqplib';

let connection = null;
let channel = null;

export const connectRabbit = async () => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  try {
    connection = await amqplib.connect(url);
    connection.on('error', (err) => console.error('[rabbitmq] connection error', err));
    connection.on('close', () => console.warn('[rabbitmq] connection closed'));

    channel = await connection.createConfirmChannel();
    channel.on('error', (err) => console.error('[rabbitmq] channel error', err));
    channel.on('close', () => console.warn('[rabbitmq] channel closed'));

    console.log('[rabbitmq] Connected');
  } catch (error) {
    console.error('[rabbitmq] Connection failed:', error?.message || error);
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
  const ch = getRabbitChannel();
  await ch.assertExchange(exchange, 'topic', { durable: true });
  const payload = Buffer.from(JSON.stringify(message));
  return new Promise((resolve, reject) => {
    ch.publish(exchange, routingKey, payload, { contentType: 'application/json', persistent: true }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
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
    console.log('[rabbitmq] Disconnected');
  } catch (error) {
    console.error('[rabbitmq] Disconnect error:', error?.message || error);
  }
};


