/**
 * Centralized Logger Export
 *
 * This module provides a single import point for all logging functionality.
 * Use this instead of importing from consola directly for better maintainability.
 *
 * @example
 * import { logger, info, error, debug, warn } from '../utils/logger/index.mjs';
 *
 * info('Application started');
 * error('Something went wrong');
 */

export {
  logger,
  createLogger,
  logError,
  withLogging,
  setCorrelationId,
  clearCorrelationId,
  getCorrelationId,
} from "../logger.mjs";

// Convenience exports for common logging methods
import { logger as defaultLogger } from "../logger.mjs";

export const info = defaultLogger.info.bind(defaultLogger);
export const error = defaultLogger.error.bind(defaultLogger);
export const debug = defaultLogger.debug.bind(defaultLogger);
export const warn = defaultLogger.warn.bind(defaultLogger);
