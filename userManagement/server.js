import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import { initSocketClient } from './utils/socketClient.js';
import { connectRabbit, disconnectRabbit } from './utils/rabbitmq.js';
import { logger } from './utils/logger.js';
import { RATE_LIMITS } from './config/constants.js';
import authRoutes from './routes/auth.js';
import inviteRoutes from './routes/invite.js';
import organizationRoutes from './routes/organization.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.WINDOW_MS,
  max: RATE_LIMITS.GENERAL.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
  max: RATE_LIMITS.AUTH.MAX_REQUESTS,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/login', authLimiter);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User Management Service is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/organization', organizationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const startServer = async () => {
  try {
    await connectDatabase();

    initSocketClient();

    if (process.env.RABBITMQ_URL) {
      try {
        await connectRabbit();
      } catch (err) {
        logger.warn('RabbitMQ connection failed, continuing without it', { error: err.message });
      }
    }

    app.listen(PORT, () => {
      logger.info(`User Management Service running on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await disconnectRabbit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await disconnectRabbit();
  process.exit(0);
});

startServer();

export default app;
