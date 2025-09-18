import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join, dirname } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';

export class JobInstaller {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:jobs');
  }

  async install(step) {
    const { src, id, targetDir, type } = step;

    if (!existsSync(src)) {
      throw new Error(`${type} source not found: ${src}`);
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Determine target filename
    const filename = id ? `${id}.mjs` : basename(src);
    const target = join(targetDir, filename);

    if (this.options.dryRun) {
      this.logger.info(`Would install ${type}: ${filename} in ${targetDir}`);
      return { type, id: id || filename.replace(/\.(mjs|js)$/, ''), target, dryRun: true };
    }

    // Copy job/event file
    copyFileSync(src, target);

    this.logger.info(`Installed ${type}: ${filename} in ${targetDir}`);

    return {
      type,
      id: id || filename.replace(/\.(mjs|js)$/, ''),
      target
    };
  }

  async installJob(step) {
    return this.install({ ...step, type: 'job' });
  }

  async installEvent(step) {
    return this.install({ ...step, type: 'event' });
  }

  async installHook(step) {
    return this.install({ ...step, type: 'hook' });
  }

  async validateJobFile(src) {
    try {
      // Basic validation - check if file exists and has expected structure
      if (!existsSync(src)) {
        throw new Error(`Job file not found: ${src}`);
      }

      // Could add more validation here:
      // - Check for required exports
      // - Validate job metadata
      // - Check dependencies

      return true;
    } catch (error) {
      this.logger.error(`Job validation failed: ${error.message}`);
      throw error;
    }
  }
}