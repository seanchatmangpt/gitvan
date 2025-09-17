/**
 * GitVan v2 Tag Matchers - Git tag-based event predicates
 * Handles tag creation and semantic version tag detection
 */

/**
 * Match created tags against pattern
 * @param {object} pred - Predicate object with tagCreate pattern
 * @param {object} meta - Event metadata with tagsCreated array
 * @returns {boolean} True if any created tag matches pattern
 */
export function tagCreate(pred, meta) {
  if (!meta.tagsCreated?.length) return false;
  
  if (typeof pred.tagCreate === "string") {
    const pattern = new RegExp(pred.tagCreate);
    return meta.tagsCreated.some(tag => pattern.test(tag));
  }
  
  return true; // If no pattern specified, match any tag creation
}

/**
 * Match semantic version tags
 * @param {object} pred - Predicate object with semverTag boolean
 * @param {object} meta - Event metadata with tagsCreated array
 * @returns {boolean} True if any created tag is semantic version
 */
export function semverTag(pred, meta) {
  if (!pred.semverTag) return false;
  
  const semverPattern = /^v?\d+\.\d+\.\d+(?:[-+].*)?$/;
  return (meta.tagsCreated || []).some(tag => semverPattern.test(tag));
}

/**
 * Match tags with specific prefix
 * @param {object} pred - Predicate object with tagPrefix string
 * @param {object} meta - Event metadata with tagsCreated array
 * @returns {boolean} True if any created tag has prefix
 */
export function tagPrefix(pred, meta) {
  if (!pred.tagPrefix || !meta.tagsCreated?.length) return false;
  
  return meta.tagsCreated.some(tag => tag.startsWith(pred.tagPrefix));
}

/**
 * Match tags with specific suffix
 * @param {object} pred - Predicate object with tagSuffix string
 * @param {object} meta - Event metadata with tagsCreated array
 * @returns {boolean} True if any created tag has suffix
 */
export function tagSuffix(pred, meta) {
  if (!pred.tagSuffix || !meta.tagsCreated?.length) return false;
  
  return meta.tagsCreated.some(tag => tag.endsWith(pred.tagSuffix));
}

