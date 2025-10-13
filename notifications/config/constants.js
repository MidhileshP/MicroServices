export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

export const RABBITMQ_CONFIG = {
  EXCHANGE: process.env.RABBITMQ_EXCHANGE || 'events',
  QUEUE_EMAIL: process.env.RABBITMQ_QUEUE_EMAIL || 'notifications.email',
  ROUTE_INVITE: process.env.RABBITMQ_ROUTE_INVITE || 'user.invite.created'
};

export const REDIS_CONFIG = {
  URL: process.env.REDIS_URL || 'redis://localhost:6379'
};

export const SMTP_CONFIG = {
  HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  PORT: parseInt(process.env.SMTP_PORT) || 587,
  SECURE: process.env.SMTP_SECURE === 'true',
  FROM: process.env.SMTP_FROM || '"User Management System" <noreply@example.com>',
  FALLBACK_ETHEREAL: (process.env.MAILER_FALLBACK_ETHEREAL || 'true') === 'true'
};

export const SOCKET_CONFIG = {
  TRANSPORTS: ['websocket', 'polling'],
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
