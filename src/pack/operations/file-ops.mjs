import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, lstatSync, symlinkSync, chmodSync, utimesSync, unlinkSync, renameSync, readlinkSync } from 'node:fs';
import { dirname, basename, join } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';
import { createHash, randomBytes } from 'node:crypto';
import { glob } from 'tinyglobby';

export class FileOperations {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:file');
    this.tempSuffix = '.gitvan-temp';
    this.operationLog = [];
  }

  async apply(step) {
    const { src, target, action, preservePermissions = true } = step;

    // Handle glob patterns in source
    const sources = await this.resolveSources(src);
    if (sources.length === 0) {
      throw new Error(`No files found matching pattern: ${src}`);
    }

    const results = [];
    for (const sourcePath of sources) {
      const result = await this.applySingle({
        src: sourcePath,
        target: sources.length === 1 ? target : this.resolveTargetForMultiple(sourcePath, src, target),
        action,
        preservePermissions
      });
      results.push(result);
    }

    return sources.length === 1 ? results[0] : results;
  }

  async applySingle(step) {
    const { src, target, action, preservePermissions } = step;

    if (!existsSync(src)) {
      throw new Error(`Source file not found: ${src}`);
    }

    const targetDir = dirname(target);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const sourceHash = this.hashFile(src);
    const sourceStats = lstatSync(src);
    const isSymlink = sourceStats.isSymbolicLink();

    if (this.options.dryRun) {
      this.logger.info(`Would ${action}: ${src} -> ${target}${isSymlink ? ' (symlink)' : ''}`);
      return { src, target, sourceHash, action, dryRun: true, isSymlink };
    }

    // Log operation for potential rollback
    this.operationLog.push({ action, src, target, timestamp: Date.now() });

    try {
      switch (action) {
        case 'write':
          await this.atomicWrite(src, target, { preservePermissions, isSymlink });
          this.logger.debug(`Copied: ${src} -> ${target}`);
          break;

        case 'merge':
          if (existsSync(target)) {
            const existing = readFileSync(target, 'utf8');
            const newContent = readFileSync(src, 'utf8');
            const merged = this.mergeContent(existing, newContent);
            await this.atomicWriteContent(target, merged, { preservePermissions });
            this.logger.debug(`Merged: ${src} -> ${target}`);
          } else {
            await this.atomicWrite(src, target, { preservePermissions, isSymlink });
            this.logger.debug(`Created: ${target}`);
          }
          break;

        case 'skip':
          if (!existsSync(target)) {
            await this.atomicWrite(src, target, { preservePermissions, isSymlink });
            this.logger.debug(`Created: ${target}`);
          } else {
            this.logger.debug(`Skipped existing: ${target}`);
          }
          break;

        default:
          throw new Error(`Unknown file operation: ${action}`);
      }

      return {
        src,
        target,
        sourceHash,
        targetHash: existsSync(target) ? this.hashFile(target) : null,
        action,
        isSymlink
      };
    } catch (error) {
      this.logger.error(`Failed to apply operation ${action} from ${src} to ${target}: ${error.message}`);
      throw error;
    }
  }

  mergeContent(existing, newContent) {
    // Simple merge strategy: append with separator
    return existing + '\n\n' + newContent;
  }

  async resolveSources(src) {
    // Check if it's a glob pattern
    if (src.includes('*') || src.includes('?') || src.includes('[')) {
      try {
        // For glob patterns, we need to extract the base directory and relative pattern
        const baseDir = dirname(src.replace(/[*?[\]]/g, ''));
        const pattern = basename(src);

        const files = await glob([pattern], {
          cwd: baseDir,
          absolute: true,
          onlyFiles: true,
          followSymbolicLinks: false,
          dot: false,
          ignore: ['node_modules/**', '.git/**']
        });
        return files.sort(); // Ensure consistent ordering
      } catch (error) {
        this.logger.error(`Failed to resolve glob pattern ${src}: ${error.message}`);
        return [];
      }
    }

    // Single file - check if it exists
    if (existsSync(src)) {
      return [src];
    }

    return [];
  }

  resolveTargetForMultiple(sourcePath, originalPattern, targetPattern) {
    // For multiple files, resolve relative path from pattern
    const patternBase = dirname(originalPattern.replace(/[*?\\[\\]]/g, ''));
    const fileName = basename(sourcePath);
    return join(targetPattern, fileName);
  }

  async atomicWrite(src, target, options = {}) {
    const { preservePermissions = true, isSymlink = false } = options;
    const tempTarget = target + this.tempSuffix + '-' + randomBytes(4).toString('hex');

    try {
      if (isSymlink) {
        const linkTarget = readlinkSync(src);
        symlinkSync(linkTarget, tempTarget);
      } else {
        copyFileSync(src, tempTarget);

        if (preservePermissions) {
          const stats = statSync(src);
          chmodSync(tempTarget, stats.mode);
          utimesSync(tempTarget, stats.atime, stats.mtime);
        }
      }

      // Atomic rename
      renameSync(tempTarget, target);
    } catch (error) {
      // Cleanup temp file on failure
      if (existsSync(tempTarget)) {
        try {
          unlinkSync(tempTarget);
        } catch (cleanupError) {
          this.logger.error(`Failed to cleanup temp file ${tempTarget}: ${cleanupError.message}`);
        }
      }
      throw error;
    }
  }

  async atomicWriteContent(target, content, options = {}) {
    const { preservePermissions = true } = options;
    const tempTarget = target + this.tempSuffix + '-' + randomBytes(4).toString('hex');
    let originalStats;

    try {
      if (preservePermissions && existsSync(target)) {
        originalStats = statSync(target);
      }

      writeFileSync(tempTarget, content, 'utf8');

      if (originalStats) {
        chmodSync(tempTarget, originalStats.mode);
        utimesSync(tempTarget, originalStats.atime, originalStats.mtime);
      }

      // Atomic rename
      renameSync(tempTarget, target);
    } catch (error) {
      // Cleanup temp file on failure
      if (existsSync(tempTarget)) {
        try {
          unlinkSync(tempTarget);
        } catch (cleanupError) {
          this.logger.error(`Failed to cleanup temp file ${tempTarget}: ${cleanupError.message}`);
        }
      }
      throw error;
    }
  }

  async createDirectory(dirPath, options = {}) {
    const { recursive = true, mode = 0o755 } = options;

    if (this.options.dryRun) {
      this.logger.info(`Would create directory: ${dirPath}`);
      return { path: dirPath, dryRun: true };
    }

    if (existsSync(dirPath)) {
      return { path: dirPath, existed: true };
    }

    try {
      mkdirSync(dirPath, { recursive, mode });
      this.logger.debug(`Created directory: ${dirPath}`);
      return { path: dirPath, created: true };
    } catch (error) {
      if (error.code === 'EEXIST') {
        return { path: dirPath, existed: true };
      }
      throw error;
    }
  }

  async rollback() {
    if (this.options.dryRun) {
      this.logger.info('Rollback not needed in dry-run mode');
      return;
    }

    const reversedLog = [...this.operationLog].reverse();
    const errors = [];

    for (const operation of reversedLog) {
      try {
        switch (operation.action) {
          case 'write':
          case 'merge':
            if (existsSync(operation.target)) {
              unlinkSync(operation.target);
              this.logger.debug(`Rolled back: ${operation.target}`);
            }
            break;
          // Add more rollback cases as needed
        }
      } catch (error) {
        errors.push({ operation, error: error.message });
        this.logger.error(`Failed to rollback operation: ${error.message}`);
      }
    }

    this.operationLog = [];

    if (errors.length > 0) {
      throw new Error(`Rollback completed with ${errors.length} errors: ${errors.map(e => e.error).join(', ')}`);
    }
  }

  clearOperationLog() {
    this.operationLog = [];
  }

  hashFile(path) {
    try {
      const content = readFileSync(path);
      return createHash('sha256').update(content).digest('hex');
    } catch (error) {
      this.logger.error(`Failed to hash file ${path}: ${error.message}`);
      return null;
    }
  }
}