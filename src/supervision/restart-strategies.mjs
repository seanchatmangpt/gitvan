// src/supervision/restart-strategies.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:strategies');

// Error classification
export const ErrorTypes = {
  TRANSIENT: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'],
  PERMANENT: ['EINVAL', 'ENOENT', 'EACCES', 'EPERM'],
  CRASH: ['uncaughtException', 'unhandledRejection']
};

export const RestartStrategies = {
  ONE_FOR_ONE: 'one_for_one',
  ONE_FOR_ALL: 'one_for_all',
  REST_FOR_ONE: 'rest_for_one'
};

/**
 * Calculate backoff delay based on restart attempt
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number[]} backoffSchedule - Array of delays in ms
 * @returns {number} Delay in milliseconds
 */
export function getBackoffDelay(attempt, backoffSchedule = [1000, 5000, 10000]) {
  const index = Math.min(attempt, backoffSchedule.length - 1);
  return backoffSchedule[index];
}

/**
 * Determine if an error is restartable
 * @param {Error} error - The error to evaluate
 * @returns {boolean} True if error is transient/restartable
 */
export function shouldRestart(error) {
  if (!error) return false;

  // Try error.code first
  let code = error.code;

  // Fallback: extract from message using more robust pattern
  if (!code && error.message) {
    // Match patterns like "ECONNREFUSED", "ECONNREFUSED: ...", or "Error: ECONNREFUSED"
    const match = error.message.match(/\b([A-Z]{3,})\b/);
    code = match ? match[1] : null;
  }

  // Check if error is transient
  if (code && ErrorTypes.TRANSIENT.includes(code)) {
    logger.debug(`Transient error detected: ${code}, will restart`);
    return true;
  }

  // Check if error is permanent
  if (code && ErrorTypes.PERMANENT.includes(code)) {
    logger.warn(`Permanent error detected: ${code}, will not restart`);
    return false;
  }

  // Default: don't restart for unknown errors
  logger.warn(`Unknown error type: ${code}, will not restart`);
  return false;
}

/**
 * Get dependent children for REST_FOR_ONE strategy
 * @param {Map} children - All children (used for validation)
 * @param {string} crashedChildId - The child that crashed
 * @param {object} dependencies - Dependency graph {childId: [depIds]}
 * @returns {string[]} Array of child IDs to restart
 */
export function getDependents(children, crashedChildId, dependencies = {}) {
  const dependents = [];

  for (const [childId, deps] of Object.entries(dependencies)) {
    if (deps.includes(crashedChildId)) {
      // Validate that dependent exists in children map
      if (children.has(childId)) {
        dependents.push(childId);
      } else {
        logger.warn(`Dependent ${childId} not found in children map`);
      }
    }
  }

  return dependents;
}
