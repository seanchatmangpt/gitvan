/**
 * GitVan v2 Commit Matchers - Commit message and author-based event predicates
 * Handles commit message patterns, author matching, and signature verification
 */

/**
 * Match commit message against pattern
 * @param {object} pred - Predicate object with message pattern
 * @param {object} meta - Event metadata with message string
 * @returns {boolean} True if message matches pattern
 */
export function message(pred, meta) {
  if (!pred.message) return false;

  const pattern = new RegExp(pred.message, "i"); // Case insensitive
  return pattern.test(meta.message || "");
}

/**
 * Match commit author email against pattern
 * @param {object} pred - Predicate object with authorEmail pattern
 * @param {object} meta - Event metadata with authorEmail string
 * @returns {boolean} True if author email matches pattern
 */
export function authorEmail(pred, meta) {
  if (!pred.authorEmail) return false;

  const pattern = new RegExp(pred.authorEmail, "i"); // Case insensitive
  return pattern.test(meta.authorEmail || "");
}

/**
 * Match commit author name against pattern
 * @param {object} pred - Predicate object with authorName pattern
 * @param {object} meta - Event metadata with authorName string
 * @returns {boolean} True if author name matches pattern
 */
export function authorName(pred, meta) {
  if (!pred.authorName) return false;

  const pattern = new RegExp(pred.authorName, "i"); // Case insensitive
  return pattern.test(meta.authorName || "");
}

/**
 * Match signed commits
 * @param {object} pred - Predicate object with signed boolean
 * @param {object} meta - Event metadata with signed boolean
 * @returns {boolean} True if commit is signed (when required)
 */
export function signed(pred, meta) {
  if (!pred.signed) return false;

  return !!meta.signed;
}

/**
 * Match commits with specific type (conventional commits)
 * @param {object} pred - Predicate object with commitType string
 * @param {object} meta - Event metadata with message string
 * @returns {boolean} True if commit type matches
 */
export function commitType(pred, meta) {
  if (!pred.commitType) return false;

  const message = meta.message || "";
  const typePattern = new RegExp(`^${pred.commitType}(?:\\(.*\\))?:`, "i");
  return typePattern.test(message);
}

/**
 * Match commits with specific scope (conventional commits)
 * @param {object} pred - Predicate object with commitScope string
 * @param {object} meta - Event metadata with message string
 * @returns {boolean} True if commit scope matches
 */
export function commitScope(pred, meta) {
  if (!pred.commitScope) return false;

  const message = meta.message || "";
  const scopePattern = new RegExp(`^\\w+\\(${pred.commitScope}\\):`, "i");
  return scopePattern.test(message);
}
