/**
 * Filesystem Test Helpers
 * Utilities for testing file operations
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, dirname } from "pathe";

/**
 * Create a test file structure
 * @param {string} baseDir - Base directory
 * @param {Object} structure - File structure
 * @example
 * createFileStructure("/tmp/test", {
 *   "file.txt": "content",
 *   "dir/file.txt": "content",
 *   "dir/subdir": {}
 * })
 */
export function createFileStructure(baseDir, structure) {
  for (const [path, content] of Object.entries(structure)) {
    const fullPath = join(baseDir, path);
    const dir = dirname(fullPath);

    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create file or directory
    if (typeof content === "object" && content !== null && !Array.isArray(content)) {
      // It's a directory
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    } else {
      // It's a file
      writeFileSync(fullPath, content || "");
    }
  }
}

/**
 * Read file structure into object
 * @param {string} dir - Directory to read
 * @param {Object} options - Options
 */
export function readFileStructure(dir, options = {}) {
  const structure = {};
  const maxDepth = options.maxDepth || 10;

  function readDir(currentDir, depth = 0) {
    if (depth > maxDepth) return;

    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const relativePath = fullPath.replace(dir + "/", "");
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        structure[relativePath] = {};
        readDir(fullPath, depth + 1);
      } else if (stats.isFile()) {
        if (options.readContent) {
          structure[relativePath] = readFileSync(fullPath, "utf-8");
        } else {
          structure[relativePath] = true;
        }
      }
    }
  }

  if (existsSync(dir)) {
    readDir(dir);
  }

  return structure;
}

/**
 * Assert file exists
 * @param {string} path - File path
 * @param {string} message - Error message
 */
export function assertFileExists(path, message) {
  if (!existsSync(path)) {
    throw new Error(message || `Expected file to exist: ${path}`);
  }
}

/**
 * Assert file does not exist
 * @param {string} path - File path
 * @param {string} message - Error message
 */
export function assertFileNotExists(path, message) {
  if (existsSync(path)) {
    throw new Error(message || `Expected file to not exist: ${path}`);
  }
}

/**
 * Assert file content
 * @param {string} path - File path
 * @param {string|RegExp} expected - Expected content or pattern
 */
export function assertFileContent(path, expected) {
  assertFileExists(path);
  const content = readFileSync(path, "utf-8");

  if (typeof expected === "string") {
    if (content !== expected) {
      throw new Error(`File content mismatch\nExpected: ${expected}\nGot: ${content}`);
    }
  } else if (expected instanceof RegExp) {
    if (!expected.test(content)) {
      throw new Error(`File content does not match pattern\nPattern: ${expected}\nGot: ${content}`);
    }
  }
}

/**
 * Create a temporary directory
 * @param {string} prefix - Directory prefix
 */
export function createTempDir(prefix = "gitvan-test") {
  const { tmpdir } = await import("node:os");
  const tempDir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Clean up directory
 * @param {string} dir - Directory to clean
 */
export function cleanupDir(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
export function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stats = statSync(srcPath);

    if (stats.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const content = readFileSync(srcPath);
      writeFileSync(destPath, content);
    }
  }
}

/**
 * Get file size
 * @param {string} path - File path
 */
export function getFileSize(path) {
  const stats = statSync(path);
  return stats.size;
}

/**
 * Get directory size
 * @param {string} dir - Directory path
 */
export function getDirectorySize(dir) {
  let size = 0;
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      size += getDirectorySize(fullPath);
    } else {
      size += stats.size;
    }
  }

  return size;
}
