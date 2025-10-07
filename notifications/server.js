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
import emailRoutes from './routes/email.js';
// Bind RabbitMQ consumer(s)
const bindConsumers = async () => {
  const ch = getRabbitChannel();
  const exchange = process.env.RABBITMQ_EXCHANGE || 'events';
  const queue = process.env.RABBITMQ_QUEUE_EMAIL || 'notifications.email';
  const routingKey = process.env.RABBITMQ_ROUTE_INVITE || 'user.invite.created';

  await ch.assertExchange(exchange, 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, exchange, routingKey);

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      // expected: { to, subject, html, text }
      const { to, subject, html, text } = payload;
      const { sendEmail } = await import('./utils/mailer.js');
      await sendEmail({ to, subject, html, text });
      ch.ack(msg);
    } catch (err) {
      console.error('[rabbitmq] consumer error:', err?.message || err);
      ch.nack(msg, false, false); // discard bad messages
    }
  });

  console.log('[rabbitmq] Email consumer bound');
};

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
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
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
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

    console.log('Socket.IO Redis adapter configured');

    await connectRabbit();

    await initMailer();
    await bindConsumers();

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('register', (data) => {
        const { userId } = data;
        if (userId) {
          socket.join(`user:${userId}`);
          console.log(`User ${userId} registered with socket ${socket.id}`);
        }
      });

      socket.on('inviteAccepted', (data) => {
        const { userId, message, timestamp } = data;

        console.log('Invite accepted event:', { userId, message });

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
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`Notifications Service running on port ${PORT}`);
      console.log(`Socket.IO server ready for connections`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    disconnectRabbit().finally(() => process.exit(0));
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    disconnectRabbit().finally(() => process.exit(0));
  });
});

startServer();

export { app, io };
