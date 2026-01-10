/**
 * GitVan Graph Persistence Helper
 * Handles file system operations for graph persistence
 *
 * This module provides the persistence layer for the GitVan graph architecture,
 * implementing the "default graph location with save/load" feature.
 */

import { promises as fs } from "node:fs";
import { join, dirname } from "pathe";
import { parseTurtle, toTurtle } from "unrdf";
import { namespaceManager } from "./namespace-manager.mjs";

/**
 * Persistence Helper Class
 *
 * Provides file system operations for graph persistence including:
 * - Directory creation and management
 * - Turtle file writing and reading
 * - Default graph file management
 * - Atomic operations with proper error handling
 */
export class PersistenceHelper {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.atomicWrites = options.atomicWrites !== false;
  }

  /**
   * Ensure directory exists, creating it if necessary
   * @param {string} dirPath - Directory path to ensure
   * @returns {Promise<string>} The directory path
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Directory ensured: ${dirPath}`);
      return dirPath;
    } catch (error) {
      this.logger.error(`Failed to create directory ${dirPath}:`, error);
      throw new Error(
        `Failed to create directory ${dirPath}: ${error.message}`
      );
    }
  }

  /**
   * Write Turtle content to file with atomic operation
   * @param {string} filePath - Target file path
   * @param {string} content - Turtle content to write
   * @param {object} options - Write options
   * @returns {Promise<{path: string, bytes: number}>} Write result
   */
  async writeTurtleFile(filePath, content, options = {}) {
    const { encoding = "utf8", createBackup = false } = options;

    try {
      // Ensure directory exists
      await this.ensureDirectory(dirname(filePath));

      // Validate Turtle content if requested
      if (options.validate) {
        await this.validateTurtleContent(content);
      }

      let finalPath = filePath;

      if (this.atomicWrites) {
        // Atomic write: write to temp file first, then rename
        const tempPath = `${filePath}.tmp`;
        await fs.writeFile(tempPath, content, encoding);

        // Create backup if requested
        if (createBackup && (await this.fileExists(filePath))) {
          const backupPath = `${filePath}.backup`;
          await fs.copyFile(filePath, backupPath);
        }

        // Atomic rename
        await fs.rename(tempPath, filePath);
        finalPath = filePath;
      } else {
        // Direct write
        await fs.writeFile(filePath, content, encoding);
      }

      const stats = await fs.stat(finalPath);
      const bytes = stats.size;

      this.logger.debug(`Turtle file written: ${finalPath} (${bytes} bytes)`);
      return { path: finalPath, bytes };
    } catch (error) {
      this.logger.error(`Failed to write Turtle file ${filePath}:`, error);
      throw new Error(
        `Failed to write Turtle file ${filePath}: ${error.message}`
      );
    }
  }

  /**
   * Read Turtle content from file
   * @param {string} filePath - File path to read
   * @param {object} options - Read options
   * @returns {Promise<string>} Turtle content
   */
  async readTurtleFile(filePath, options = {}) {
    const { encoding = "utf8", validate = false } = options;

    try {
      const content = await fs.readFile(filePath, encoding);

      if (validate) {
        await this.validateTurtleContent(content);
      }

      this.logger.debug(
        `Turtle file read: ${filePath} (${content.length} chars)`
      );
      return content;
    } catch (error) {
      if (error.code === "ENOENT") {
        this.logger.debug(`Turtle file not found: ${filePath}`);
        return null;
      }
      this.logger.error(`Failed to read Turtle file ${filePath}:`, error);
      throw new Error(
        `Failed to read Turtle file ${filePath}: ${error.message}`
      );
    }
  }

  /**
   * Write default.ttl file to graph directory
   * @param {string} graphDir - Graph directory path
   * @param {string} content - Default Turtle content
   * @param {object} options - Write options
   * @returns {Promise<{path: string, bytes: number}>} Write result
   */
  async writeDefaultGraph(graphDir, content, options = {}) {
    const defaultPath = join(graphDir, "default.ttl");
    return await this.writeTurtleFile(defaultPath, content, {
      validate: true,
      createBackup: false,
      ...options,
    });
  }

  /**
   * Read default.ttl file from graph directory
   * @param {string} graphDir - Graph directory path
   * @param {object} options - Read options
   * @returns {Promise<string|null>} Default Turtle content or null if not found
   */
  async readDefaultGraph(graphDir, options = {}) {
    const defaultPath = join(graphDir, "default.ttl");
    return await this.readTurtleFile(defaultPath, {
      validate: true,
      ...options,
    });
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path to check
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   * @param {string} dirPath - Directory path to check
   * @returns {Promise<boolean>} True if directory exists
   */
  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * List Turtle files in directory
   * @param {string} dirPath - Directory path to scan
   * @returns {Promise<string[]>} Array of Turtle file names
   */
  async listTurtleFiles(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      return files.filter((file) => file.endsWith(".ttl"));
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      this.logger.error(`Failed to list Turtle files in ${dirPath}:`, error);
      throw new Error(
        `Failed to list Turtle files in ${dirPath}: ${error.message}`
      );
    }
  }

  /**
   * Validate Turtle content with enhanced error reporting
   * @param {string} content - Turtle content to validate
   * @param {string} filePath - Optional file path for error context
   * @returns {Promise<void>}
   */
  async validateTurtleContent(content, filePath = null) {
    try {
      // Use unrdf's parseTurtle to validate
      parseTurtle(content);
    } catch (error) {
      // Extract line information from error if available
      const lineMatch = error.message.match(/line (\d+)/i);
      const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;

      // Generate context lines for error message
      let context = "";
      if (lineNumber) {
        const lines = content.split("\n");
        const contextStart = Math.max(0, lineNumber - 3);
        const contextEnd = Math.min(lines.length, lineNumber + 2);
        context = "\nContext:\n" + lines.slice(contextStart, contextEnd).join("\n");
      }

      const errorMsg = `Invalid Turtle content${filePath ? ` in ${filePath}` : ""}${lineNumber ? ` at line ${lineNumber}` : ""}: ${error.message}${context}`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Validate namespace prefixes in Turtle content
   * @param {string} content - Turtle content to validate
   * @param {string} filePath - Optional file path for error context
   * @returns {object} Validation result
   */
  validateNamespacePrefixes(content, filePath = null) {
    const result = namespaceManager.validatePrefixDeclarations(content);

    if (!result.valid) {
      this.logger.warn(
        `Namespace validation issues in ${filePath || "Turtle content"}:`,
        result.issues
      );
    }

    return {
      valid: result.valid,
      issues: result.issues,
      file: filePath,
      summary: result.summary,
    };
  }

  /**
   * Comprehensive Turtle file validation
   * @param {string} content - Turtle content
   * @param {string} filePath - Optional file path for error context
   * @param {object} options - Validation options
   * @returns {Promise<object>} Comprehensive validation result
   */
  async validateTurtleFile(content, filePath = null, options = {}) {
    const { checkNamespaces = true, checkSyntax = true } = options;

    const result = {
      valid: true,
      errors: [],
      warnings: [],
      file: filePath,
    };

    // Syntax validation
    if (checkSyntax) {
      try {
        await this.validateTurtleContent(content, filePath);
      } catch (error) {
        result.valid = false;
        result.errors.push(error.message);
      }
    }

    // Namespace validation
    if (checkNamespaces) {
      const nsResult = this.validateNamespacePrefixes(content, filePath);
      if (!nsResult.valid) {
        result.warnings.push(...nsResult.issues.map((i) => i.message));
      }
    }

    return result;
  }

  /**
   * Serialize Store to Turtle string
   * @param {Store} store - Store to serialize
   * @param {object} options - Serialization options
   * @returns {Promise<string>} Turtle string
   */
  async serializeStore(store, options = {}) {
    try {
      return await toTurtle(store, options);
    } catch (error) {
      this.logger.error("Failed to serialize store to Turtle:", error);
      throw new Error(`Failed to serialize store to Turtle: ${error.message}`);
    }
  }

  /**
   * Parse Turtle string to Store
   * @param {string} turtle - Turtle string to parse
   * @param {object} options - Parse options
   * @returns {Store} Store
   */
  parseTurtle(turtle, options = {}) {
    try {
      return parseTurtle(turtle, options);
    } catch (error) {
      this.logger.error("Failed to parse Turtle to store:", error);
      throw new Error(`Failed to parse Turtle to store: ${error.message}`);
    }
  }

  /**
   * Get file statistics
   * @param {string} filePath - File path
   * @returns {Promise<object>} File statistics
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw new Error(
        `Failed to get file stats for ${filePath}: ${error.message}`
      );
    }
  }

  /**
   * Create backup of file
   * @param {string} filePath - File to backup
   * @param {string} backupPath - Backup file path
   * @returns {Promise<void>}
   */
  async createBackup(filePath, backupPath) {
    try {
      await fs.copyFile(filePath, backupPath);
      this.logger.debug(`Backup created: ${filePath} -> ${backupPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to create backup ${filePath} -> ${backupPath}:`,
        error
      );
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Remove file safely
   * @param {string} filePath - File to remove
   * @returns {Promise<boolean>} True if file was removed, false if it didn't exist
   */
  async removeFile(filePath) {
    try {
      await fs.unlink(filePath);
      this.logger.debug(`File removed: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return false;
      }
      this.logger.error(`Failed to remove file ${filePath}:`, error);
      throw new Error(`Failed to remove file ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Create a persistence helper instance
 * @param {object} options - Options for the persistence helper
 * @returns {PersistenceHelper} Persistence helper instance
 */
export function createPersistenceHelper(options = {}) {
  return new PersistenceHelper(options);
}

/**
 * Default persistence helper instance
 */
export const persistenceHelper = new PersistenceHelper();
