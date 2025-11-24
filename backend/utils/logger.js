// Centralized logging utility
// Provides consistent logging format and easy control over log levels

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.DEBUG]: 'DEBUG'
};

// Get log level from environment (default: INFO in production, DEBUG in development)
function getLogLevel() {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && LOG_LEVELS.hasOwnProperty(envLevel)) {
    return LOG_LEVELS[envLevel];
  }
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
}

const currentLogLevel = getLogLevel();

// Format log message with timestamp
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];
  return `[${timestamp}] [${levelName}] ${message}`;
}

// Logger object
export const logger = {
  error: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(formatMessage(LOG_LEVELS.ERROR, message, ...args), ...args);
    }
  },

  warn: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage(LOG_LEVELS.WARN, message, ...args), ...args);
    }
  },

  info: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage(LOG_LEVELS.INFO, message, ...args), ...args);
    }
  },

  debug: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, ...args), ...args);
    }
  }
};

