/**
 * Centralized logging utilities
 * 
 * Provides two ways to log:
 * 1. useLogger() hook - for React components
 * 2. Static functions - for use outside React components
 * 
 * @example
 * ```jsx
 * // In React components
 * import { useLogger } from '@/utils/logging';
 * 
 * function MyComponent() {
 *   const logger = useLogger();
 *   logger.success('Action completed');
 * }
 * ```
 * 
 * @example
 * ```javascript
 * // Outside React components
 * import { logSuccess, logError } from '@/utils/logging';
 * 
 * logSuccess('Action completed');
 * logError('Something went wrong');
 * ```
 */

// Hook for React components
export { useLogger } from './useLogger';

// Static functions for use outside React components
export {
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logApiCall,
  logDaemon,
  logApp,
  logUserAction,
  logPermission,
  logTimeout,
} from './logger';

// Constants
export {
  LOG_LEVELS,
  LOG_SOURCES,
  LOG_EMOJIS,
  LOG_PREFIXES,
} from './constants';

