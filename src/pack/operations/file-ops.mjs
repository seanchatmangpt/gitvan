import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';
import { createHash } from 'node:crypto';

export class FileOperations {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:file');
  }

  async apply(step) {
    const { src, target, action } = step;

    if (!existsSync(src)) {
      throw new Error(`Source file not found: ${src}`);
    }

    const targetDir = dirname(target);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const sourceHash = this.hashFile(src);

    if (this.options.dryRun) {
      this.logger.info(`Would ${action}: ${src} -> ${target}`);
      return { src, target, sourceHash, action, dryRun: true };
    }

    switch (action) {
      case 'write':
        copyFileSync(src, target);
        this.logger.debug(`Copied: ${src} -> ${target}`);
        break;

      case 'merge':
        // Basic merge: append to existing file
        if (existsSync(target)) {
          const existing = readFileSync(target, 'utf8');
          const newContent = readFileSync(src, 'utf8');
          const merged = this.mergeContent(existing, newContent);
          writeFileSync(target, merged);
          this.logger.debug(`Merged: ${src} -> ${target}`);
        } else {
          copyFileSync(src, target);
          this.logger.debug(`Created: ${target}`);
        }
        break;

      case 'skip':
        if (!existsSync(target)) {
          copyFileSync(src, target);
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
      action
    };
  }

  mergeContent(existing, newContent) {
    // Simple merge strategy: append with separator
    return existing + '\n\n' + newContent;
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