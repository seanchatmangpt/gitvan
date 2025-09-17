/**
 * GitVan v2 Path Matchers - File path-based event predicates
 * Handles pathChanged, pathAdded, pathModified with glob pattern matching
 */

/**
 * Simple glob pattern matcher (supports * wildcard only)
 * @param {string} pattern - Glob pattern
 * @returns {RegExp} Compiled regex
 */
function compileGlob(pattern) {
  const escaped = pattern.split("*").map(escapeRegex).join(".*");
  return new RegExp("^" + escaped + "$");
}

/**
 * Escape regex special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if any files match the given glob patterns
 * @param {Array<string>} globs - Array of glob patterns
 * @param {Array<string>} files - Array of file paths
 * @returns {boolean} True if any file matches any pattern
 */
function anyMatch(globs = [], files = []) {
  if (!globs?.length || !files?.length) return false;
  
  const patterns = globs.map(compileGlob);
  return files.some(file => patterns.some(pattern => pattern.test(file)));
}

/**
 * Match files that have changed
 * @param {object} pred - Predicate object with pathChanged array
 * @param {object} meta - Event metadata with filesChanged array
 * @returns {boolean} True if any changed file matches
 */
export function pathChanged(pred, meta) {
  const files = meta.filesChanged || [];
  return anyMatch(pred.pathChanged, files);
}

/**
 * Match files that have been added
 * @param {object} pred - Predicate object with pathAdded array
 * @param {object} meta - Event metadata with filesAdded array
 * @returns {boolean} True if any added file matches
 */
export function pathAdded(pred, meta) {
  const files = meta.filesAdded || [];
  return anyMatch(pred.pathAdded, files);
}

/**
 * Match files that have been modified
 * @param {object} pred - Predicate object with pathModified array
 * @param {object} meta - Event metadata with filesModified array
 * @returns {boolean} True if any modified file matches
 */
export function pathModified(pred, meta) {
  const files = meta.filesModified || [];
  return anyMatch(pred.pathModified, files);
}

/**
 * Match files that have been deleted
 * @param {object} pred - Predicate object with pathDeleted array
 * @param {object} meta - Event metadata with filesDeleted array
 * @returns {boolean} True if any deleted file matches
 */
export function pathDeleted(pred, meta) {
  const files = meta.filesDeleted || [];
  return anyMatch(pred.pathDeleted, files);
}

