import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis, getRedisPublisher, getRedisSubscriber } from './config/redis.js';
import { connectRabbit, getRabbitChannel, disconnectRabbit } from './config/rabbitmq.js';
import { initMailer } from './utils/mailer.js';
import { logger } from './utils/logger.js';
import { RABBITMQ_CONFIG, SOCKET_CONFIG } from './config/constants.js';
import emailRoutes from './routes/email.js';

const bindConsumers = async () => {
  const ch = getRabbitChannel();
  const exchange = RABBITMQ_CONFIG.EXCHANGE;
  const queue = RABBITMQ_CONFIG.QUEUE_EMAIL;
  const routingKey = RABBITMQ_CONFIG.ROUTE_INVITE;

  await ch.assertExchange(exchange, 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, exchange, routingKey);

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      const { to, subject, html, text } = payload;
      const { sendEmail } = await import('./utils/mailer.js');
      await sendEmail({ to, subject, html, text });
      ch.ack(msg);
      logger.debug('Email consumer processed message', { to, subject });
    } catch (err) {
      logger.error('RabbitMQ consumer error', { error: err?.message || err });
      ch.nack(msg, false, false);
    }
  });

  logger.info('RabbitMQ email consumer bound successfully', { exchange, queue, routingKey });
};

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: SOCKET_CONFIG.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notifications Service is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/email', emailRoutes);

app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path, stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: SOCKET_CONFIG.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const startServer = async () => {
  try {
    await connectRedis();

    const pubClient = getRedisPublisher();
    const subClient = getRedisSubscriber();

    io.adapter(createAdapter(pubClient, subClient));

    logger.info('Socket.IO Redis adapter configured successfully');

    if (process.env.RABBITMQ_URL) {
      try {
        await connectRabbit();
        await bindConsumers();
        logger.info('RabbitMQ connected and consumers bound');
      } catch (err) {
        logger.warn('Failed to connect to RabbitMQ, continuing without it', { error: err.message });
      }
    }

    await initMailer();

    io.on('connection', (socket) => {
      logger.info('Socket.IO client connected', { socketId: socket.id });

      socket.on('register', (data) => {
        const { userId } = data;
        if (userId) {
          socket.join(`user:${userId}`);
          logger.info('User registered with socket', { userId, socketId: socket.id });
        }
      });

      socket.on('inviteAccepted', (data) => {
        const { userId, message, timestamp } = data;

        logger.info('Invite accepted event received', { userId, message });

        io.to(`user:${userId}`).emit('notification', {
          type: 'inviteAccepted',
          message,
          timestamp
        });

        io.emit('inviteStatusUpdate', {
          type: 'inviteAccepted',
          userId,
          message,
          timestamp
        });
      });

      socket.on('disconnect', (reason) => {
        logger.info('Socket.IO client disconnected', { socketId: socket.id, reason });
      });

      socket.on('error', (error) => {
        logger.error('Socket.IO error', { socketId: socket.id, error: error.message });
      });
    });

    httpServer.listen(PORT, () => {
      logger.info(`Notifications Service running on port ${PORT}`);
      logger.info('Socket.IO server ready for connections');
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing server gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    disconnectRabbit().finally(() => process.exit(0));
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing server gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    disconnectRabbit().finally(() => process.exit(0));
  });
});

startServer();

export { app, io };
