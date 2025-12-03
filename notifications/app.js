import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { SOCKET_CONFIG } from './config/constants.js';
import emailRoutes from './routes/email.js';

dotenv.config();

const app = express();

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

export default app;

