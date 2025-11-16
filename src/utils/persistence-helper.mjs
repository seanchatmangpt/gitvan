/**
 * src/utils/persistence-helper.mjs
 * Pure unrdf persistence - file system operations for graphs
 * Fail-fast error handling: all errors throw immediately
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'pathe';
import {
  parseTurtle,
  toTurtle,
  Store
} from 'unrdf';

/**
 * Persistence Helper - File system operations for RDF graphs
 * Uses pure unrdf for all RDF operations
 * Fail-fast: errors bubble up immediately with error codes
 */
export class PersistenceHelper {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.atomicWrites = options.atomicWrites !== false;
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   * @returns {Promise<string>} The directory path
   * @throws {Error} If directory creation fails
   */
  async ensureDirectory(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
      const error = new Error('[PersistenceHelper] dirPath must be non-empty string');
      error.code = 'INVALID_PATH';
      throw error;
    }

    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Directory ensured: ${dirPath}`);
      return dirPath;
    } catch (err) {
      const error = new Error(`[PersistenceHelper] Failed to create directory: ${err.message}`);
      error.code = 'MKDIR_FAILED';
      error.path = dirPath;
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Write Turtle file atomically
   * @param {string} filePath - File path
   * @param {string} content - Turtle content
   * @param {object} opts - Options (validate, createBackup)
   * @returns {Promise<{path: string, bytes: number}>} Write result
   * @throws {Error} If write fails
   */
  async writeTurtleFile(filePath, content, opts = {}) {
    if (!filePath || typeof filePath !== 'string') {
      const error = new Error('[PersistenceHelper.writeTurtleFile] filePath is required');
      error.code = 'INVALID_PATH';
      throw error;
    }

    if (content === null || content === undefined) {
      const error = new Error('[PersistenceHelper.writeTurtleFile] content is required');
      error.code = 'INVALID_CONTENT';
      throw error;
    }

    const { encoding = 'utf8', createBackup = false, validate = false } = opts;

    try {
      // Validate Turtle if requested
      if (validate) {
        try {
          parseTurtle(content);
        } catch (err) {
          const error = new Error(
            `[PersistenceHelper.writeTurtleFile] Invalid Turtle content: ${err.message}`
          );
          error.code = 'INVALID_TURTLE';
          error.cause = err;
          throw error;
        }
      }

      // Ensure directory exists
      await this.ensureDirectory(dirname(filePath));

      if (this.atomicWrites) {
        // Atomic write: temp file → rename
        const tempPath = `${filePath}.tmp`;

        try {
          await fs.writeFile(tempPath, content, encoding);
        } catch (err) {
          const error = new Error(`[PersistenceHelper] Failed to write temp file: ${err.message}`);
          error.code = 'WRITE_TEMP_FAILED';
          error.cause = err;
          throw error;
        }

        // Create backup if requested
        if (createBackup) {
          try {
            const exists = await this.fileExists(filePath);
            if (exists) {
              await fs.copyFile(filePath, `${filePath}.backup`);
            }
          } catch (err) {
            // Backup failure is not fatal - log and continue
            this.logger.warn(`[PersistenceHelper] Backup creation failed: ${err.message}`);
          }
        }

        // Atomic rename
        try {
          await fs.rename(tempPath, filePath);
        } catch (err) {
          const error = new Error(`[PersistenceHelper] Atomic rename failed: ${err.message}`);
          error.code = 'RENAME_FAILED';
          error.cause = err;
          throw error;
        }
      } else {
        // Direct write (non-atomic)
        try {
          await fs.writeFile(filePath, content, encoding);
        } catch (err) {
          const error = new Error(`[PersistenceHelper] Direct write failed: ${err.message}`);
          error.code = 'WRITE_FAILED';
          error.cause = err;
          throw error;
        }
      }

      // Get file stats
      let bytes = 0;
      try {
        const stats = await fs.stat(filePath);
        bytes = stats.size;
      } catch (err) {
        this.logger.warn(`[PersistenceHelper] Could not get file size: ${err.message}`);
      }

      this.logger.debug(`Turtle file written: ${filePath} (${bytes} bytes)`);
      return { path: filePath, bytes };
    } catch (err) {
      if (err.code && err.code.startsWith('INVALID') || err.code === 'RENAME_FAILED') {
        throw err;
      }
      const error = new Error(`[PersistenceHelper.writeTurtleFile] Write failed: ${err.message}`);
      error.code = 'FILE_WRITE_ERROR';
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Read Turtle file
   * @param {string} filePath - File path
   * @param {object} opts - Options (validate)
   * @returns {Promise<string|null>} Turtle content or null if not found
   * @throws {Error} If read/validation fails
   */
  async readTurtleFile(filePath, opts = {}) {
    if (!filePath || typeof filePath !== 'string') {
      const error = new Error('[PersistenceHelper.readTurtleFile] filePath is required');
      error.code = 'INVALID_PATH';
      throw error;
    }

    const { encoding = 'utf8', validate = false } = opts;

    try {
      let content;
      try {
        content = await fs.readFile(filePath, encoding);
      } catch (err) {
        if (err.code === 'ENOENT') {
          this.logger.debug(`Turtle file not found: ${filePath}`);
          return null;
        }
        const error = new Error(`[PersistenceHelper] Failed to read file: ${err.message}`);
        error.code = 'READ_FAILED';
        error.cause = err;
        throw error;
      }

      // Validate if requested
      if (validate) {
        try {
          parseTurtle(content);
        } catch (err) {
          const error = new Error(
            `[PersistenceHelper] Invalid Turtle in file: ${err.message}`
          );
          error.code = 'INVALID_TURTLE';
          error.path = filePath;
          error.cause = err;
          throw error;
        }
      }

      this.logger.debug(`Turtle file read: ${filePath} (${content.length} chars)`);
      return content;
    } catch (err) {
      if (err.code && err.code.startsWith('INVALID') || err.code === 'READ_FAILED') {
        throw err;
      }
      const error = new Error(`[PersistenceHelper.readTurtleFile] Read failed: ${err.message}`);
      error.code = 'FILE_READ_ERROR';
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Write default.ttl file
   * @param {string} graphDir - Graph directory
   * @param {string} content - Turtle content
   * @param {object} opts - Options
   * @returns {Promise<{path: string, bytes: number}>} Result
   * @throws {Error} If write fails
   */
  async writeDefaultGraph(graphDir, content, opts = {}) {
    if (!graphDir || typeof graphDir !== 'string') {
      const error = new Error('[PersistenceHelper] graphDir is required');
      error.code = 'INVALID_DIR';
      throw error;
    }

    const defaultPath = join(graphDir, 'default.ttl');

    return await this.writeTurtleFile(defaultPath, content, {
      validate: true,
      createBackup: false,
      ...opts
    });
  }

  /**
   * Read default.ttl file
   * @param {string} graphDir - Graph directory
   * @param {object} opts - Options
   * @returns {Promise<string|null>} Turtle content or null
   * @throws {Error} If read fails
   */
  async readDefaultGraph(graphDir, opts = {}) {
    if (!graphDir || typeof graphDir !== 'string') {
      const error = new Error('[PersistenceHelper] graphDir is required');
      error.code = 'INVALID_DIR';
      throw error;
    }

    const defaultPath = join(graphDir, 'default.ttl');

    return await this.readTurtleFile(defaultPath, {
      validate: true,
      ...opts
    });
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {Promise<boolean>} True if exists
   */
  async fileExists(filePath) {
    if (!filePath) return false;

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   * @param {string} dirPath - Directory path
   * @returns {Promise<boolean>} True if exists and is directory
   */
  async directoryExists(dirPath) {
    if (!dirPath) return false;

    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * List Turtle files in directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<string[]>} Array of .ttl file names
   * @throws {Error} If list fails
   */
  async listTurtleFiles(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
      const error = new Error('[PersistenceHelper.listTurtleFiles] dirPath is required');
      error.code = 'INVALID_PATH';
      throw error;
    }

    try {
      try {
        const files = await fs.readdir(dirPath);
        return files.filter((f) => f.endsWith('.ttl'));
      } catch (err) {
        if (err.code === 'ENOENT') {
          return [];
        }
        throw err;
      }
    } catch (err) {
      const error = new Error(
        `[PersistenceHelper.listTurtleFiles] Failed to list files: ${err.message}`
      );
      error.code = 'LIST_FAILED';
      error.path = dirPath;
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Serialize N3 Store to Turtle string
   * @param {Store} store - RDF store
   * @param {object} opts - Options
   * @returns {Promise<string>} Turtle string
   * @throws {Error} If serialization fails
   */
  async serializeStore(store, opts = {}) {
    if (!store) {
      const error = new Error('[PersistenceHelper.serializeStore] store is required');
      error.code = 'INVALID_STORE';
      throw error;
    }

    try {
      return await toTurtle(store, opts);
    } catch (err) {
      const error = new Error(
        `[PersistenceHelper.serializeStore] Serialization failed: ${err.message}`
      );
      error.code = 'SERIALIZE_FAILED';
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Parse Turtle string to RDF store
   * @param {string} turtleContent - Turtle content
   * @param {object} opts - Options
   * @returns {Store} RDF store
   * @throws {Error} If parsing fails
   */
  parseTurtle(turtleContent, opts = {}) {
    if (!turtleContent || typeof turtleContent !== 'string') {
      const error = new Error('[PersistenceHelper.parseTurtle] turtleContent is required');
      error.code = 'INVALID_CONTENT';
      throw error;
    }

    try {
      return parseTurtle(turtleContent, opts.baseIRI);
    } catch (err) {
      const error = new Error(
        `[PersistenceHelper.parseTurtle] Parse failed: ${err.message}`
      );
      error.code = 'PARSE_FAILED';
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Get file statistics
   * @param {string} filePath - File path
   * @returns {Promise<object|null>} File stats or null if not found
   * @throws {Error} If stat fails
   */
  async getFileStats(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      const error = new Error('[PersistenceHelper.getFileStats] filePath is required');
      error.code = 'INVALID_PATH';
      throw error;
    }

    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      const error = new Error(
        `[PersistenceHelper.getFileStats] Failed to get stats: ${err.message}`
      );
      error.code = 'STAT_FAILED';
      error.cause = err;
      throw error;
    }
  }

  /**
   * Create backup of file
   * @param {string} filePath - Source file
   * @param {string} backupPath - Backup file path
   * @returns {Promise<void>}
   * @throws {Error} If backup fails
   */
  async createBackup(filePath, backupPath) {
    if (!filePath || typeof filePath !== 'string') {
      const error = new Error('[PersistenceHelper.createBackup] filePath is required');
      error.code = 'INVALID_SOURCE_PATH';
      throw error;
    }

    if (!backupPath || typeof backupPath !== 'string') {
      const error = new Error('[PersistenceHelper.createBackup] backupPath is required');
      error.code = 'INVALID_BACKUP_PATH';
      throw error;
    }

    try {
      await fs.copyFile(filePath, backupPath);
      this.logger.debug(`Backup created: ${filePath} → ${backupPath}`);
    } catch (err) {
      const error = new Error(
        `[PersistenceHelper.createBackup] Backup failed: ${err.message}`
      );
      error.code = 'BACKUP_FAILED';
      error.source = filePath;
      error.backup = backupPath;
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Remove file safely
   * @param {string} filePath - File to remove
   * @returns {Promise<boolean>} True if removed, false if not found
   * @throws {Error} If removal fails (other than ENOENT)
   */
  async removeFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      const error = new Error('[PersistenceHelper.removeFile] filePath is required');
      error.code = 'INVALID_PATH';
      throw error;
    }

    try {
      await fs.unlink(filePath);
      this.logger.debug(`File removed: ${filePath}`);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      const error = new Error(
        `[PersistenceHelper.removeFile] Removal failed: ${err.message}`
      );
      error.code = 'REMOVE_FAILED';
      error.path = filePath;
      error.cause = err;
      this.logger.error(error.message);
      throw error;
    }
  }
}

/**
 * Create a persistence helper instance
 * @param {object} opts - Constructor options
 * @returns {PersistenceHelper} Helper instance
 */
export function createPersistenceHelper(opts = {}) {
  return new PersistenceHelper(opts);
}

/**
 * Default persistence helper instance
 */
export const persistenceHelper = new PersistenceHelper();
