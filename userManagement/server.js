import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import { initSocketClient } from './utils/socketClient.js';
import { connectRabbit, disconnectRabbit } from './utils/rabbitmq.js';
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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
  console.error('Unhandled error:', err);

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
        console.warn('[rabbitmq] Failed to connect, continuing without it:', err.message);
      }
    }

    app.listen(PORT, () => {
      console.log(`User Management Service running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await disconnectRabbit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await disconnectRabbit();
  process.exit(0);
});

startServer();

export default app;
