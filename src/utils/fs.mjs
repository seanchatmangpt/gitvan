/**
 * GitVan v2 Safe Filesystem Utilities - Path-safe file operations
 * Prevents directory traversal attacks and ensures operations stay within bounds
 */

import { resolve, normalize, sep } from "pathe";
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";

/**
 * Safely resolve path within root directory
 * @param {string} root - Root directory
 * @param {string} p - Path to resolve
 * @returns {string} Absolute resolved path
 * @throws {Error} If path escapes root directory
 */
export function resolveSafe(root, p) {
  const abs = normalize(resolve(root, p));
  const normRoot = normalize(resolve(root));
  
  if (!abs.startsWith(normRoot + sep) && abs !== normRoot) {
    throw new Error(`Path escapes root: ${p}`);
  }
  
  return abs;
}

/**
 * Safely write file within root directory
 * @param {string} root - Root directory
 * @param {string} out - Output path relative to root
 * @param {string} contents - File contents
 * @returns {string} Absolute path of written file
 */
export function writeFileSafe(root, out, contents) {
  const abs = resolveSafe(root, out);
  const dir = abs.substring(0, abs.lastIndexOf(sep));
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(abs, contents);
  return abs;
}

/**
 * Safely read file within root directory
 * @param {string} root - Root directory
 * @param {string} p - File path relative to root
 * @param {string} enc - Encoding (default: utf8)
 * @returns {string} File contents
 */
export function readFileSafe(root, p, enc = "utf8") {
  return readFileSync(resolveSafe(root, p), enc);
}

/**
 * Check if path exists within root directory
 * @param {string} root - Root directory
 * @param {string} p - Path relative to root
 * @returns {boolean} True if path exists
 */
export function existsSafe(root, p) {
  try {
    const abs = resolveSafe(root, p);
    return existsSync(abs);
  } catch {
    return false;
  }
}

/**
 * Get file stats within root directory
 * @param {string} root - Root directory
 * @param {string} p - Path relative to root
 * @returns {object|null} File stats or null if not found
 */
export function statSafe(root, p) {
  try {
    const abs = resolveSafe(root, p);
    return statSync(abs);
  } catch {
    return null;
  }
}

/**
 * Ensure directory exists within root directory
 * @param {string} root - Root directory
 * @param {string} p - Directory path relative to root
 * @returns {string} Absolute path of directory
 */
export function ensureDirSafe(root, p) {
  const abs = resolveSafe(root, p);
  
  if (!existsSync(abs)) {
    mkdirSync(abs, { recursive: true });
  }
  
  return abs;
}

