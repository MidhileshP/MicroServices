import amqplib from 'amqplib';

let connection = null;
let channel = null;

export const connectRabbit = async () => {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || '5672'; // 5672 is AMQP broker port
  const user = process.env.RABBITMQ_USER;
  const pass = process.env.RABBITMQ_PASS;

  const creds = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const builtUrl = `amqp://${creds}${host}:${port}`;
  const url = process.env.RABBITMQ_URL || builtUrl;
  try {
    connection = await amqplib.connect(url, { heartbeat: 30 });
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
  if (!channel) {
    console.warn('[rabbitmq] Channel not initialized, skipping event publish');
    return false;
  }

  try {
    await channel.assertExchange(exchange, 'topic', { durable: true });
    const payload = Buffer.from(JSON.stringify(message));
    return new Promise((resolve, reject) => {
      channel.publish(exchange, routingKey, payload, { contentType: 'application/json', persistent: true }, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  } catch (error) {
    console.error('[rabbitmq] Publish failed:', error.message);
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
    console.log('[rabbitmq] Disconnected');
  } catch (error) {
    console.error('[rabbitmq] Disconnect error:', error?.message || error);
  }
};


