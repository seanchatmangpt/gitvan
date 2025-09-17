/**
 * GitVan v2 Time Utilities - Deterministic time handling for receipts and cron
 * Ensures consistent timezone handling and provides utility functions
 */

/**
 * Get current time as ISO string (UTC)
 * @returns {string} ISO timestamp
 */
export const nowISO = () => new Date().toISOString();

/**
 * Convert date to UTC
 * @param {Date|string} d - Date object or string
 * @returns {Date} UTC date
 */
export const toUTC = (d) => new Date(typeof d === "string" ? d : d.getTime());

/**
 * Clamp milliseconds value within bounds
 * @param {number} ms - Milliseconds value
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 60000)
 * @returns {number} Clamped value
 */
export function clampMs(ms, min = 0, max = 60_000) {
  return Math.max(min, Math.min(ms, max));
}

/**
 * Get deterministic timestamp for receipts
 * Uses environment variable if set, otherwise current time
 * @returns {string} Deterministic timestamp
 */
export function getDeterministicTimestamp() {
  return process.env.GITVAN_NOW || nowISO();
}

/**
 * Parse cron expression and get next execution time
 * Simple implementation for basic cron patterns
 * @param {string} cron - Cron expression
 * @param {Date} from - Start date (default: now)
 * @returns {Date|null} Next execution time or null if invalid
 */
export function getNextCronTime(cron, from = new Date()) {
  // Basic cron parser - supports minute, hour, day, month, weekday
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  
  const [min, hour, day, month, weekday] = parts;
  
  // Simple implementation for common patterns
  if (min === "*" && hour === "*" && day === "*" && month === "*" && weekday === "*") {
    // Every minute
    return new Date(from.getTime() + 60000);
  }
  
  if (min === "0" && hour === "*" && day === "*" && month === "*" && weekday === "*") {
    // Every hour
    const next = new Date(from);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next;
  }
  
  // More complex patterns would need a proper cron library
  return null;
}
