/**
 * GitVan v2 Event Router - High-level event predicate matching orchestrator
 * Combines all matchers and handles complex predicate logic (any/all)
 */

import * as PathMatchers from "./matchers/path.mjs";
import * as TagMatchers from "./matchers/tag.mjs";
import * as MergeMatchers from "./matchers/merge.mjs";
import * as CommitMatchers from "./matchers/commit.mjs";

// Registry of all available matchers
const matchers = {
  // Path matchers
  pathChanged: PathMatchers.pathChanged,
  pathAdded: PathMatchers.pathAdded,
  pathModified: PathMatchers.pathModified,
  pathDeleted: PathMatchers.pathDeleted,

  // Tag matchers
  tagCreate: TagMatchers.tagCreate,
  semverTag: TagMatchers.semverTag,
  tagPrefix: TagMatchers.tagPrefix,
  tagSuffix: TagMatchers.tagSuffix,

  // Merge matchers
  mergeTo: MergeMatchers.mergeTo,
  branchCreate: MergeMatchers.branchCreate,
  mergeFrom: MergeMatchers.mergeFrom,
  pullRequest: MergeMatchers.pullRequest,

  // Commit matchers
  message: CommitMatchers.message,
  authorEmail: CommitMatchers.authorEmail,
  authorName: CommitMatchers.authorName,
  signed: CommitMatchers.signed,
  commitType: CommitMatchers.commitType,
  commitScope: CommitMatchers.commitScope,
};

/**
 * Check if event metadata matches the given predicate
 * @param {object} predicate - Event predicate object
 * @param {object} meta - Event metadata
 * @returns {boolean} True if predicate matches
 */
export function matches(predicate, meta) {
  if (!predicate || typeof predicate !== "object") {
    return false;
  }

  // Handle 'any' logic - any of the sub-predicates must match
  if (predicate.any?.length) {
    return predicate.any.some((subPred) => matches(subPred, meta));
  }

  // Handle 'all' logic - all sub-predicates must match
  if (predicate.all?.length) {
    return predicate.all.every((subPred) => matches(subPred, meta));
  }

  // Check individual matchers
  for (const [key, value] of Object.entries(predicate)) {
    if (key === "any" || key === "all") continue;

    const matcher = matchers[key];
    if (matcher) {
      const subPred = { [key]: value };
      if (matcher(subPred, meta)) {
        return true;
      }
    }
  }

  // If only 'all' array was present and all passed, it's a match
  return !!predicate.all?.length;
}

/**
 * Get list of all available matcher names
 * @returns {Array<string>} Array of matcher names
 */
export function getAvailableMatchers() {
  return Object.keys(matchers);
}

/**
 * Validate predicate structure
 * @param {object} predicate - Predicate to validate
 * @returns {object} Validation result with isValid and errors
 */
export function validatePredicate(predicate) {
  const errors = [];

  if (!predicate || typeof predicate !== "object") {
    errors.push("Predicate must be an object");
    return { isValid: false, errors };
  }

  // Check for unknown matchers
  const availableMatchers = getAvailableMatchers();
  for (const key of Object.keys(predicate)) {
    if (key === "any" || key === "all") continue;
    if (!availableMatchers.includes(key)) {
      errors.push(`Unknown matcher: ${key}`);
    }
  }

  // Validate 'any' and 'all' arrays
  if (predicate.any && !Array.isArray(predicate.any)) {
    errors.push("'any' must be an array");
  }
  if (predicate.all && !Array.isArray(predicate.all)) {
    errors.push("'all' must be an array");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
