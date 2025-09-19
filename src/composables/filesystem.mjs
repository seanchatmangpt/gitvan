/**
 * @fileoverview GitVan v2 — File System Operations Composable
 *
 * This module provides comprehensive file system operations within the GitVan context.
 * It implements an 80/20 approach focusing on essential file operations that
 * GitVan tests actually use, with POSIX-first design and no external dependencies.
 *
 * Key Features:
 * - POSIX-first implementation with no external dependencies
 * - Deterministic environment: TZ=UTC, LANG=C
 * - UnJS context-aware (unctx) to avoid context loss after await
 * - Happy path only: no retries, no shell string interpolation
 * - Essential file operations: mkdir, rmdir, unlink, exists, readdir, writeFile, readFile
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";

/**
 * Convert array-like input to array
 * @param {any} input - Input to convert
 * @returns {Array} Array representation
 */
function toArr(input) {
  if (Array.isArray(input)) return input;
  if (input == null) return [];
  return [input];
}

/**
 * File System Operations Composable
 *
 * Provides file system operations within GitVan context with deterministic
 * environment and proper async context handling.
 *
 * @function useFileSystem
 * @returns {Object} File system operations object
 */
export function useFileSystem() {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory
  const cwd = (ctx && ctx.cwd) || process.cwd();

  // Set up deterministic environment with UTC timezone and C locale
  // Context env should not override TZ and LANG for determinism
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC", // Always override to UTC for determinism
    LANG: "C", // Always override to C locale for determinism
  };

  const base = { cwd, env };

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // ---------- Directory Operations ----------
    /**
     * Create directory
     * @param {string} dirPath - Directory path
     * @param {Object} options - Options
     * @param {boolean} [options.recursive=true] - Create parent directories
     * @param {string} [options.mode] - Directory mode
     * @returns {Promise<string>} Created directory path
     */
    async mkdir(dirPath, options = {}) {
      const fullPath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(base.cwd, dirPath);

      const mkdirOptions = {
        recursive: options.recursive !== false, // Default to true
        ...(options.mode && { mode: options.mode }),
      };

      await fs.mkdir(fullPath, mkdirOptions);
      return fullPath;
    },

    /**
     * Remove directory
     * @param {string} dirPath - Directory path
     * @param {Object} options - Options
     * @param {boolean} [options.recursive=false] - Remove recursively
     * @param {boolean} [options.force=false] - Force removal
     * @returns {Promise<void>}
     */
    async rmdir(dirPath, options = {}) {
      const fullPath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(base.cwd, dirPath);

      const rmOptions = {
        recursive: options.recursive || false,
        force: options.force || false,
      };

      // Use fs.rm for directories (Node.js 14.14+)
      await fs.rm(fullPath, rmOptions);
    },

    /**
     * Remove file or directory (alias for rmdir with recursive)
     * @param {string} targetPath - File or directory path
     * @param {Object} options - Options
     * @param {boolean} [options.recursive=true] - Remove recursively
     * @param {boolean} [options.force=true] - Force removal
     * @returns {Promise<void>}
     */
    async rm(targetPath, options = {}) {
      const fullPath = path.isAbsolute(targetPath)
        ? targetPath
        : path.join(base.cwd, targetPath);

      const rmOptions = {
        recursive: options.recursive !== false, // Default to true
        force: options.force !== false, // Default to true
        ...options,
      };

      await fs.rm(fullPath, rmOptions);
    },

    // ---------- File Operations ----------
    /**
     * Write file content
     * @param {string} filePath - File path
     * @param {string|Buffer} content - File content
     * @param {Object} options - Options
     * @param {string} [options.encoding='utf8'] - File encoding
     * @param {string} [options.mode] - File mode
     * @returns {Promise<string>} Written file path
     */
    async writeFile(filePath, content, options = {}) {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(base.cwd, filePath);

      const writeOptions = {
        encoding: options.encoding || "utf8",
        ...(options.mode && { mode: options.mode }),
      };

      await fs.writeFile(fullPath, content, writeOptions);
      return fullPath;
    },

    /**
     * Read file content
     * @param {string} filePath - File path
     * @param {Object} options - Options
     * @param {string} [options.encoding='utf8'] - File encoding
     * @returns {Promise<string|Buffer>} File content
     */
    async readFile(filePath, options = {}) {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(base.cwd, filePath);

      const readOptions = {
        encoding: options.encoding || "utf8",
        ...options,
      };

      return await fs.readFile(fullPath, readOptions);
    },

    /**
     * Remove file
     * @param {string} filePath - File path
     * @returns {Promise<void>}
     */
    async unlink(filePath) {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(base.cwd, filePath);

      await fs.unlink(fullPath);
    },

    // ---------- File System Queries ----------
    /**
     * Check if path exists
     * @param {string} targetPath - Path to check
     * @returns {Promise<boolean>} True if path exists
     */
    async exists(targetPath) {
      const fullPath = path.isAbsolute(targetPath)
        ? targetPath
        : path.join(base.cwd, targetPath);

      try {
        await fs.access(fullPath);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Get file/directory stats
     * @param {string} targetPath - Path to stat
     * @returns {Promise<Object>} File stats
     */
    async stat(targetPath) {
      const fullPath = path.isAbsolute(targetPath)
        ? targetPath
        : path.join(base.cwd, targetPath);

      return await fs.stat(fullPath);
    },

    /**
     * Check if path is a directory
     * @param {string} targetPath - Path to check
     * @returns {Promise<boolean>} True if path is a directory
     */
    async isDirectory(targetPath) {
      try {
        const stats = await this.stat(targetPath);
        return stats.isDirectory();
      } catch {
        return false;
      }
    },

    /**
     * Check if path is a file
     * @param {string} targetPath - Path to check
     * @returns {Promise<boolean>} True if path is a file
     */
    async isFile(targetPath) {
      try {
        const stats = await this.stat(targetPath);
        return stats.isFile();
      } catch {
        return false;
      }
    },

    /**
     * List directory contents
     * @param {string} dirPath - Directory path
     * @param {Object} options - Options
     * @param {string} [options.encoding='utf8'] - Encoding
     * @param {boolean} [options.withFileTypes=false] - Include file types
     * @returns {Promise<Array>} Directory contents
     */
    async readdir(dirPath, options = {}) {
      const fullPath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(base.cwd, dirPath);

      const readOptions = {
        encoding: options.encoding || "utf8",
        withFileTypes: options.withFileTypes || false,
        ...options,
      };

      return await fs.readdir(fullPath, readOptions);
    },

    // ---------- Path Operations ----------
    /**
     * Resolve path relative to working directory
     * @param {string} targetPath - Path to resolve
     * @returns {string} Resolved absolute path
     */
    resolve(targetPath) {
      return path.isAbsolute(targetPath)
        ? targetPath
        : path.join(base.cwd, targetPath);
    },

    /**
     * Join paths
     * @param {...string} paths - Paths to join
     * @returns {string} Joined path
     */
    join(...paths) {
      return path.join(...paths);
    },

    /**
     * Get relative path
     * @param {string} from - From path
     * @param {string} to - To path
     * @returns {string} Relative path
     */
    relative(from, to) {
      return path.relative(from, to);
    },

    /**
     * Get directory name
     * @param {string} filePath - File path
     * @returns {string} Directory name
     */
    dirname(filePath) {
      return path.dirname(filePath);
    },

    /**
     * Get file name
     * @param {string} filePath - File path
     * @returns {string} File name
     */
    basename(filePath) {
      return path.basename(filePath);
    },

    /**
     * Get file extension
     * @param {string} filePath - File path
     * @returns {string} File extension
     */
    extname(filePath) {
      return path.extname(filePath);
    },

    // ---------- Utility Methods ----------
    /**
     * Create temporary directory
     * @param {Object} options - Options
     * @param {string} [options.prefix='gitvan-'] - Directory prefix
     * @param {string} [options.suffix] - Directory suffix
     * @returns {Promise<string>} Temporary directory path
     */
    async mkdtemp(options = {}) {
      const { mkdtemp } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");

      const prefix = options.prefix || "gitvan-";
      const suffix = options.suffix || "";
      const template = path.join(tmpdir(), prefix + "XXXXXX" + suffix);

      return await mkdtemp(template);
    },

    /**
     * Copy file or directory
     * @param {string} src - Source path
     * @param {string} dest - Destination path
     * @param {Object} options - Options
     * @param {boolean} [options.recursive=false] - Copy recursively
     * @returns {Promise<void>}
     */
    async copy(src, dest, options = {}) {
      const { cp } = await import("node:fs/promises");

      const srcPath = path.isAbsolute(src) ? src : path.join(base.cwd, src);
      const destPath = path.isAbsolute(dest) ? dest : path.join(base.cwd, dest);

      const cpOptions = {
        recursive: options.recursive || false,
        ...options,
      };

      await cp(srcPath, destPath, cpOptions);
    },

    /**
     * Move/rename file or directory
     * @param {string} src - Source path
     * @param {string} dest - Destination path
     * @returns {Promise<void>}
     */
    async rename(src, dest) {
      const srcPath = path.isAbsolute(src) ? src : path.join(base.cwd, src);
      const destPath = path.isAbsolute(dest) ? dest : path.join(base.cwd, dest);

      await fs.rename(srcPath, destPath);
    },

    // ---------- Cleanup Methods ----------
    /**
     * Clean up test directory safely
     * @param {string} dirPath - Directory to clean up
     * @param {Object} options - Options
     * @param {boolean} [options.force=true] - Force cleanup
     * @param {boolean} [options.recursive=true] - Recursive cleanup
     * @returns {Promise<void>}
     */
    async cleanup(dirPath, options = {}) {
      const fullPath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(base.cwd, dirPath);

      try {
        await this.rm(fullPath, {
          recursive: options.recursive !== false,
          force: options.force !== false,
          ...options,
        });
      } catch (error) {
        // Log warning but don't throw - cleanup should be best effort
        if (ctx && ctx.logger) {
          ctx.logger.warn(
            `Failed to cleanup directory ${fullPath}: ${error.message}`
          );
        }
      }
    },

    /**
     * Get file system info
     * @returns {Promise<Object>} File system information
     */
    async info() {
      try {
        const [cwd, tmpdir] = await Promise.all([
          Promise.resolve(base.cwd),
          import("node:os").then((os) => os.tmpdir()),
        ]);

        return {
          cwd,
          tmpdir,
          env: {
            TZ: base.env.TZ,
            LANG: base.env.LANG,
          },
        };
      } catch (error) {
        throw new Error(`Failed to get filesystem info: ${error.message}`);
      }
    },
  };
}
