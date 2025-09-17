/**
 * GitVan v2 Pack Class - Core pack representation and operations
 * Manages pack loading, validation, and lifecycle operations
 */

import { loadPackManifest } from './simple-manifest.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'pathe';
import { createHash } from 'node:crypto';
import { createLogger } from '../utils/logger.mjs';

export class Pack {
  constructor(packPath, options = {}) {
    this.path = resolve(packPath);
    this.options = options;
    this.manifest = null;
    this.loaded = false;
    this.receipts = [];
    this.logger = createLogger('pack');
  }

  async load() {
    if (this.loaded) return;

    try {
      this.manifest = loadPackManifest(this.path);
      this.loaded = true;
      this.logger.debug(`Loaded pack: ${this.manifest.id}@${this.manifest.version}`);
    } catch (error) {
      throw new Error(`Failed to load pack from ${this.path}: ${error.message}`);
    }
  }

  async checkConstraints() {
    const errors = [];

    // Check GitVan version requirement
    if (this.manifest.requires?.gitvan) {
      // Would check version compatibility
      this.logger.debug(`Requires GitVan: ${this.manifest.requires.gitvan}`);
    }

    // Check Node.js version
    if (this.manifest.requires?.node) {
      const nodeVersion = process.version;
      this.logger.debug(`Requires Node.js: ${this.manifest.requires.node}, current: ${nodeVersion}`);
    }

    // Check Git availability
    if (this.manifest.requires?.git) {
      try {
        const { useGit } = await import('../composables/git.mjs');
        const git = useGit();
        await git.run('--version');
      } catch (error) {
        errors.push('Git is required but not available');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async detectMode(targetDir) {
    // Check if target is existing git repo
    const gitDir = join(targetDir, '.git');
    if (existsSync(gitDir)) {
      return 'existing-repo';
    }

    // Check detection patterns
    for (const detect of this.manifest.detects || []) {
      const matches = await this.evaluateDetection(detect, targetDir);
      if (matches && !detect.negate) {
        return 'existing-repo';
      }
      if (!matches && detect.negate) {
        return 'existing-repo';
      }
    }

    return 'new-repo';
  }

  async evaluateDetection(detect, targetDir) {
    const { kind, pattern } = detect;

    switch (kind) {
      case 'file':
        return existsSync(join(targetDir, pattern));
      case 'glob':
        // Simple glob - would use proper glob library in production
        return existsSync(join(targetDir, pattern.replace('*', '')));
      case 'pkg':
        const pkgPath = join(targetDir, 'package.json');
        if (!existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
          return pkg.dependencies?.[pattern] || pkg.devDependencies?.[pattern];
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  async resolveInputs(inputs = {}) {
    const resolved = {};

    for (const inputDef of this.manifest.inputs || []) {
      const { key, type, default: defaultValue } = inputDef;

      if (inputs[key] !== undefined) {
        resolved[key] = this.validateInput(inputs[key], inputDef);
      } else if (defaultValue !== undefined) {
        resolved[key] = defaultValue;
      } else {
        // Would prompt user for required inputs
        this.logger.warn(`Missing required input: ${key}`);
      }
    }

    return resolved;
  }

  validateInput(value, definition) {
    const { type, enum: enumValues } = definition;

    switch (type) {
      case 'boolean':
        return Boolean(value);
      case 'string':
        return String(value);
      case 'path':
        return resolve(String(value));
      case 'enum':
        if (enumValues && !enumValues.includes(value)) {
          throw new Error(`Invalid enum value: ${value}. Must be one of: ${enumValues.join(', ')}`);
        }
        return value;
      default:
        return value;
    }
  }

  async checkIdempotency(targetDir) {
    const receiptPath = join(targetDir, '.gitvan', 'packs', this.manifest.id, 'receipt.json');

    if (!existsSync(receiptPath)) {
      return false;
    }

    try {
      const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
      const currentFingerprint = await this.computeFingerprint();

      if (receipt.fingerprint === currentFingerprint) {
        this.logger.info(`Pack ${this.manifest.id} already applied with same fingerprint`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.warn(`Failed to check idempotency: ${error.message}`);
      return false;
    }
  }

  async computeFingerprint() {
    const fingerprintData = {
      version: this.manifest.version,
      provides: this.manifest.provides,
      dependencies: this.manifest.dependencies
    };

    const fingerprintStr = JSON.stringify(fingerprintData, Object.keys(fingerprintData).sort());
    return createHash('sha256').update(fingerprintStr).digest('hex');
  }

  async writeReceipt(targetDir, status, artifacts = []) {
    const receiptDir = join(targetDir, '.gitvan', 'packs', this.manifest.id);

    if (!existsSync(receiptDir)) {
      mkdirSync(receiptDir, { recursive: true });
    }

    const receipt = {
      id: this.manifest.id,
      version: this.manifest.version,
      applied: new Date().toISOString(),
      status,
      fingerprint: await this.computeFingerprint(),
      mode: this.options.mode || 'unknown',
      artifacts
    };

    const receiptPath = join(receiptDir, 'receipt.json');
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

    this.logger.info(`Wrote receipt: ${receiptPath}`);
    return receipt;
  }

  toJSON() {
    return {
      path: this.path,
      manifest: this.manifest,
      loaded: this.loaded
    };
  }
}