/**
 * GitVan v2 Crypto Utilities - Content hashing and fingerprinting
 * Provides deterministic hashing for receipts and content verification
 */

import { createHash } from "node:crypto";

/**
 * Generate SHA256 hash as hex string
 * @param {string|Buffer} input - Input to hash
 * @returns {string} SHA256 hash as hex
 */
export function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Generate content fingerprint for deterministic identification
 * @param {object} obj - Object to fingerprint
 * @returns {string} Short fingerprint with fp_ prefix
 */
export function fingerprint(obj) {
  const stable = JSON.stringify(obj, Object.keys(obj).sort());
  return "fp_" + sha256Hex(stable).slice(0, 16);
}

/**
 * Generate receipt hash for verification
 * @param {object} receipt - Receipt object
 * @returns {string} Receipt hash
 */
export function receiptHash(receipt) {
  const { kind, id, status, ts, commit, action, env, outputHash, artifacts } =
    receipt;
  const content = JSON.stringify({
    kind,
    id,
    status,
    ts,
    commit,
    action,
    env,
    outputHash,
    artifacts,
  });
  return sha256Hex(content);
}

/**
 * Generate job fingerprint for caching and identification
 * @param {object} job - Job definition
 * @returns {string} Job fingerprint
 */
export function jobFingerprint(job) {
  const { id, kind, cron, meta, on, mode, filename, version } = job;
  return fingerprint({ id, kind, cron, meta, on, mode, filename, version });
}

/**
 * Generate deterministic seed for reproducible operations
 * @param {string} base - Base string for seed
 * @param {object} context - Additional context
 * @returns {number} Deterministic seed
 */
export function generateSeed(base, context = {}) {
  const content = JSON.stringify({ base, context });
  const hash = sha256Hex(content);
  return parseInt(hash.slice(0, 8), 16);
}
