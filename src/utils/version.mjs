/**
 * GitVan v2 Version Management Utilities
 * Semantic versioning utilities for pack and dependency management
 */

import semver from 'semver';

/**
 * Check if a version satisfies a constraint using semver
 * @param {string} version - Version to check (e.g., "1.2.3")
 * @param {string} constraint - Version constraint (e.g., "^1.0.0", "~1.2.0", ">=2.0.0")
 * @returns {boolean} Whether the version satisfies the constraint
 */
export function satisfiesConstraint(version, constraint) {
  try {
    // Handle special cases and clean up version strings
    const cleanVersion = semver.coerce(version)?.version || version;
    const cleanConstraint = constraint.trim();

    return semver.satisfies(cleanVersion, cleanConstraint);
  } catch (error) {
    console.warn(`Version constraint check failed: ${error.message}`);
    return false;
  }
}

/**
 * Compare two versions using semver
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1, version2) {
  try {
    // Try direct semver comparison first for pre-release versions
    if (semver.valid(version1) && semver.valid(version2)) {
      return semver.compare(version1, version2);
    }

    // Fall back to coerced versions if direct comparison fails
    const clean1 = semver.coerce(version1)?.version || version1;
    const clean2 = semver.coerce(version2)?.version || version2;

    return semver.compare(clean1, clean2);
  } catch (error) {
    console.warn(`Version comparison failed: ${error.message}`);
    // Fallback to string comparison
    return version1.localeCompare(version2);
  }
}

/**
 * Check if version1 is greater than version2
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {boolean} Whether version1 > version2
 */
export function isGreaterThan(version1, version2) {
  try {
    // Try direct semver comparison first for pre-release versions
    if (semver.valid(version1) && semver.valid(version2)) {
      return semver.gt(version1, version2);
    }

    // Fall back to coerced versions if direct comparison fails
    const clean1 = semver.coerce(version1)?.version || version1;
    const clean2 = semver.coerce(version2)?.version || version2;

    return semver.gt(clean1, clean2);
  } catch (error) {
    console.warn(`Version gt check failed: ${error.message}`);
    return false;
  }
}

/**
 * Get the latest version from an array of versions
 * @param {string[]} versions - Array of version strings
 * @returns {string|null} Latest version or null if no valid versions
 */
export function getLatestVersion(versions) {
  if (!Array.isArray(versions) || versions.length === 0) {
    return null;
  }

  try {
    const validVersions = versions
      .map(v => semver.coerce(v)?.version || v)
      .filter(v => semver.valid(v))
      .sort(semver.rcompare);

    return validVersions[0] || null;
  } catch (error) {
    console.warn(`Latest version calculation failed: ${error.message}`);
    return versions[0] || null;
  }
}

/**
 * Parse a version constraint into its components
 * @param {string} constraint - Version constraint (e.g., "^1.0.0")
 * @returns {object} Parsed constraint information
 */
export function parseConstraint(constraint) {
  const trimmed = constraint.trim();

  // Extract operator and version
  const match = trimmed.match(/^([~^>=<]+)?(.+)$/);
  if (!match) {
    return { operator: '=', version: trimmed, original: constraint };
  }

  const [, operator = '=', version] = match;

  return {
    operator,
    version: version.trim(),
    original: constraint,
    isExact: operator === '=' || operator === '',
    isCaret: operator.includes('^'),
    isTilde: operator.includes('~'),
    isGreaterThan: operator.includes('>'),
    isLessThan: operator.includes('<')
  };
}

/**
 * Check if two version constraints are compatible
 * @param {string} constraint1 - First constraint
 * @param {string} constraint2 - Second constraint
 * @returns {boolean} Whether the constraints are compatible
 */
export function areConstraintsCompatible(constraint1, constraint2) {
  try {
    // Find a version range that satisfies both constraints
    const range1 = semver.validRange(constraint1);
    const range2 = semver.validRange(constraint2);

    if (!range1 || !range2) {
      return false;
    }

    // Check if there's any overlap by testing some versions
    const testVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0', '3.0.0'];

    for (const version of testVersions) {
      if (semver.satisfies(version, constraint1) && semver.satisfies(version, constraint2)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn(`Constraint compatibility check failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate that a version string is valid semver
 * @param {string} version - Version to validate
 * @returns {boolean} Whether the version is valid
 */
export function isValidVersion(version) {
  try {
    return semver.valid(version) !== null || semver.coerce(version) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Clean and normalize a version string
 * @param {string} version - Version to clean
 * @returns {string} Cleaned version
 */
export function cleanVersion(version) {
  try {
    const coerced = semver.coerce(version);
    return coerced ? coerced.version : version;
  } catch (error) {
    return version;
  }
}

/**
 * Get all versions that satisfy a constraint from a list
 * @param {string[]} versions - Array of available versions
 * @param {string} constraint - Version constraint
 * @returns {string[]} Versions that satisfy the constraint
 */
export function getVersionsMatching(versions, constraint) {
  try {
    return versions
      .filter(v => semver.valid(semver.coerce(v)?.version || v))
      .filter(v => satisfiesConstraint(v, constraint))
      .sort(semver.rcompare);
  } catch (error) {
    console.warn(`Version matching failed: ${error.message}`);
    return [];
  }
}

/**
 * Check if an update is available (current < latest)
 * @param {string} currentVersion - Current version
 * @param {string} latestVersion - Latest available version
 * @returns {boolean} Whether an update is available
 */
export function isUpdateAvailable(currentVersion, latestVersion) {
  try {
    return isGreaterThan(latestVersion, currentVersion);
  } catch (error) {
    console.warn(`Update check failed: ${error.message}`);
    return false;
  }
}

/**
 * Get suggested update for a version constraint
 * @param {string} currentVersion - Current version
 * @param {string} constraint - Version constraint (e.g., "^1.0.0")
 * @param {string[]} availableVersions - Available versions
 * @returns {string|null} Suggested version to update to
 */
export function getSuggestedUpdate(currentVersion, constraint, availableVersions) {
  try {
    const matchingVersions = getVersionsMatching(availableVersions, constraint);
    const latest = getLatestVersion(matchingVersions);

    if (latest && isGreaterThan(latest, currentVersion)) {
      return latest;
    }

    return null;
  } catch (error) {
    console.warn(`Suggested update calculation failed: ${error.message}`);
    return null;
  }
}