/**
 * GitVan Log Composable
 * Provides logging functionality for GitVan components
 */

import { createLogger } from "../utils/logger.mjs";

/**
 * Create a logger instance for a specific component
 * @param {string} tag - Component tag/namespace
 * @returns {object} Logger instance with level-aware methods
 */
export function useLog(tag = "gitvan") {
  return createLogger(tag);
}

/**
 * Default logger instance
 */
export const log = createLogger();
