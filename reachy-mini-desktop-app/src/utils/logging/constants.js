/**
 * Constants for logging system
 */

/**
 * Log levels
 */
export const LOG_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * Log sources
 */
export const LOG_SOURCES = {
  FRONTEND: 'frontend',
  DAEMON: 'daemon',
  APP: 'app',
  API: 'api',
};

/**
 * Standard emojis for log messages
 */
export const LOG_EMOJIS = {
  SUCCESS: '✓',
  ERROR: '❌',
  WARNING: '⚠️',
  PERMISSION: '🔒',
  TIMEOUT: '⏱️',
  SIMULATION: '🎭',
  USER_ACTION: '',
  RECEIVE: '📥',
  SEND: '📤',
  INFO: 'ℹ️',
};

/**
 * Log prefixes
 */
export const LOG_PREFIXES = {
  DAEMON: '[Daemon]',
  API: '[API]',
  APP: (appName) => `[App: ${appName}]`,
};

