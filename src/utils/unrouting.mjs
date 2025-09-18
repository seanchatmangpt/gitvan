/**
 * GitVan v2 - Unrouting Utilities
 * Provides functions to extract original names from routed paths
 */

import { join } from "pathe";

/**
 * Unroute a job ID to get the original job name
 * @param {string} jobId - The routed job ID (e.g., "cron/daily-backup", "subdir/my-job")
 * @returns {string} The original job name (e.g., "daily-backup", "my-job")
 */
export function unrouteJobId(jobId) {
  if (!jobId) return jobId;

  // Split by path separators and take the last part
  const parts = jobId.split("/");
  return parts[parts.length - 1];
}

/**
 * Unroute an event ID to get the original event name
 * @param {string} eventId - The routed event ID (e.g., "cron/0_3_*_*_*", "custom/my-event")
 * @returns {string} The original event name (e.g., "0_3_*_*_*", "my-event")
 */
export function unrouteEventId(eventId) {
  if (!eventId) return eventId;

  // Split by path separators and take the last part
  const parts = eventId.split("/");
  return parts[parts.length - 1];
}

/**
 * Unroute a cron expression from event path
 * @param {string} eventId - The routed event ID (e.g., "cron/0_3_*_*_*")
 * @returns {string|null} The cron expression (e.g., "0 3 * * *") or null if not a cron event
 */
export function unrouteCronExpression(eventId) {
  if (!eventId || !eventId.startsWith("cron/")) return null;

  const cronPart = eventId.replace("cron/", "");
  // Convert underscores back to spaces for cron expressions
  return cronPart.replace(/_/g, " ");
}

/**
 * Unroute a branch name from event path
 * @param {string} eventId - The routed event ID (e.g., "merge-to/main", "push-to/release")
 * @returns {string|null} The branch name or null if not a branch event
 */
export function unrouteBranchName(eventId) {
  if (!eventId) return null;

  if (eventId.startsWith("merge-to/")) {
    return eventId.replace("merge-to/", "");
  }

  if (eventId.startsWith("push-to/")) {
    return eventId.replace("push-to/", "");
  }

  return null;
}

/**
 * Unroute a path pattern from event path
 * @param {string} eventId - The routed event ID (e.g., "path-changed/src/[...slug]")
 * @returns {string|null} The path pattern or null if not a path event
 */
export function unroutePathPattern(eventId) {
  if (!eventId || !eventId.startsWith("path-changed/")) return null;

  return eventId.replace("path-changed/", "");
}

/**
 * Unroute a tag pattern from event path
 * @param {string} eventId - The routed event ID (e.g., "tag/semver")
 * @returns {string|null} The tag pattern or null if not a tag event
 */
export function unrouteTagPattern(eventId) {
  if (!eventId || !eventId.startsWith("tag/")) return null;

  return eventId.replace("tag/", "");
}

/**
 * Unroute a message pattern from event path
 * @param {string} eventId - The routed event ID (e.g., "message/^release:/")
 * @returns {string|null} The message pattern or null if not a message event
 */
export function unrouteMessagePattern(eventId) {
  if (!eventId || !eventId.startsWith("message/")) return null;

  return eventId.replace("message/", "");
}

/**
 * Unroute an author pattern from event path
 * @param {string} eventId - The routed event ID (e.g., "author/@company\.com/")
 * @returns {string|null} The author pattern or null if not an author event
 */
export function unrouteAuthorPattern(eventId) {
  if (!eventId || !eventId.startsWith("author/")) return null;

  return eventId.replace("author/", "");
}

/**
 * Get the event category from a routed event ID
 * @param {string} eventId - The routed event ID
 * @returns {string|null} The event category (e.g., "cron", "merge-to", "custom") or null
 */
export function getEventCategory(eventId) {
  if (!eventId) return null;

  const parts = eventId.split("/");
  return parts[0] || null;
}

/**
 * Get the job directory from a routed job ID
 * @param {string} jobId - The routed job ID
 * @returns {string} The job directory (e.g., "cron", "subdir", ".")
 */
export function getJobDirectory(jobId) {
  if (!jobId) return ".";

  const parts = jobId.split("/");
  if (parts.length === 1) return ".";

  return parts.slice(0, -1).join("/");
}

/**
 * Check if a job ID is in a specific directory
 * @param {string} jobId - The routed job ID
 * @param {string} directory - The directory to check
 * @returns {boolean} True if the job is in the specified directory
 */
export function isJobInDirectory(jobId, directory) {
  if (!jobId || !directory) return false;

  const jobDir = getJobDirectory(jobId);
  return jobDir === directory || jobDir.startsWith(directory + "/");
}

/**
 * Check if an event ID is of a specific type
 * @param {string} eventId - The routed event ID
 * @param {string} type - The event type to check
 * @returns {boolean} True if the event is of the specified type
 */
export function isEventOfType(eventId, type) {
  if (!eventId || !type) return false;

  const category = getEventCategory(eventId);
  return category === type;
}

/**
 * Get all unrouted names from a list of routed IDs
 * @param {string[]} routedIds - Array of routed IDs
 * @param {string} type - Type of IDs ("job" or "event")
 * @returns {string[]} Array of unrouted names
 */
export function unrouteAll(routedIds, type = "job") {
  if (!Array.isArray(routedIds)) return [];

  return routedIds.map((id) => {
    if (type === "event") {
      return unrouteEventId(id);
    } else {
      return unrouteJobId(id);
    }
  });
}

/**
 * Create a mapping of routed IDs to unrouted names
 * @param {string[]} routedIds - Array of routed IDs
 * @param {string} type - Type of IDs ("job" or "event")
 * @returns {Object} Mapping of routed ID to unrouted name
 */
export function createUnrouteMapping(routedIds, type = "job") {
  if (!Array.isArray(routedIds)) return {};

  const mapping = {};
  routedIds.forEach((id) => {
    if (type === "event") {
      mapping[id] = unrouteEventId(id);
    } else {
      mapping[id] = unrouteJobId(id);
    }
  });

  return mapping;
}
