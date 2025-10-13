const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const colors = {
  ERROR: '\x1b[31m',
  WARN: '\x1b[33m',
  INFO: '\x1b[36m',
  DEBUG: '\x1b[90m',
  RESET: '\x1b[0m'
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const color = colors[level] || '';
  const reset = colors.RESET;

  let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;

  if (Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta)}`;
  }

  return logMessage;
};

export const logger = {
  error: (message, meta = {}) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
  },

  warn: (message, meta = {}) => {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
  },

  info: (message, meta = {}) => {
    console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};
