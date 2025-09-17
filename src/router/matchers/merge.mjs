/**
 * GitVan v2 Merge Matchers - Git merge and branch-based event predicates
 * Handles merge-to-branch and branch creation events
 */

/**
 * Match merges to specific branch
 * @param {object} pred - Predicate object with mergeTo string
 * @param {object} meta - Event metadata with mergedTo string
 * @returns {boolean} True if merge target matches
 */
export function mergeTo(pred, meta) {
  if (!meta.mergedTo) return false;
  
  const target = pred.mergeTo;
  if (typeof target === "string") {
    return meta.mergedTo === target;
  }
  
  return false;
}

/**
 * Match branch creation events
 * @param {object} pred - Predicate object with branchCreate pattern
 * @param {object} meta - Event metadata with branchCreated string
 * @returns {boolean} True if created branch matches pattern
 */
export function branchCreate(pred, meta) {
  if (!meta.branchCreated) return false;
  
  const pattern = pred.branchCreate;
  if (!pattern) return true; // Match any branch creation if no pattern
  
  if (typeof pattern === "string") {
    const regex = new RegExp(pattern);
    return regex.test(meta.branchCreated);
  }
  
  return false;
}

/**
 * Match merges from specific branch
 * @param {object} pred - Predicate object with mergeFrom pattern
 * @param {object} meta - Event metadata with mergedFrom string
 * @returns {boolean} True if merge source matches pattern
 */
export function mergeFrom(pred, meta) {
  if (!meta.mergedFrom) return false;
  
  const pattern = pred.mergeFrom;
  if (!pattern) return true; // Match any merge source if no pattern
  
  if (typeof pattern === "string") {
    const regex = new RegExp(pattern);
    return regex.test(meta.mergedFrom);
  }
  
  return false;
}

/**
 * Match pull request events
 * @param {object} pred - Predicate object with pullRequest boolean
 * @param {object} meta - Event metadata with pullRequest object
 * @returns {boolean} True if pull request event
 */
export function pullRequest(pred, meta) {
  if (!pred.pullRequest) return false;
  
  return !!meta.pullRequest;
}

