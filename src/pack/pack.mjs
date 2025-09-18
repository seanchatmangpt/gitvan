/**
 * GitVan v2 Pack Class - Core pack representation and operations
 * Manages pack loading, validation, and lifecycle operations
 */

import { loadPackManifest } from './simple-manifest.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'pathe';
import { createHash } from 'node:crypto';
import { createLogger } from '../utils/logger.mjs';
import { PromptingContext, promptForInputs, validateInputValue } from '../utils/prompts.mjs';

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
        try {
          const { glob } = await import('tinyglobby');
          const files = await glob([pattern], {
            cwd: targetDir,
            absolute: false,
            onlyFiles: true,
            followSymbolicLinks: false
          });
          return files.length > 0;
        } catch (error) {
          this.logger?.error(`Failed to evaluate glob pattern ${pattern}: ${error.message}`);
          return false;
        }
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

  async resolveInputs(inputs = {}, promptingOptions = {}) {
    const resolved = {};
    const inputsToPrompt = [];

    // Create prompting context with options
    const context = new PromptingContext({
      noPrompt: promptingOptions.noPrompt || this.options.noPrompt,
      nonInteractive: promptingOptions.nonInteractive || this.options.nonInteractive,
      defaults: { ...promptingOptions.defaults, ...inputs },
      answers: promptingOptions.answers || {},
      ...promptingOptions
    });

    // First pass: collect inputs that need prompting
    for (const inputDef of this.manifest.inputs || []) {
      const { key, default: defaultValue } = inputDef;

      if (inputs[key] !== undefined) {
        // First convert/validate the input using Pack's validateInput
        try {
          const convertedValue = this.validateInput(inputs[key], inputDef);
          // Then validate the converted value
          validateInputValue(convertedValue, inputDef);
          resolved[key] = convertedValue;
        } catch (error) {
          this.logger.error(`Invalid input for '${key}': ${error.message}`);
          throw error;
        }
      } else {
        // Check for context-provided values (defaults or answers)
        const contextValue = context.getPreAnswer(key);
        if (contextValue !== undefined) {
          const convertedValue = this.validateInput(contextValue, inputDef);
          validateInputValue(convertedValue, inputDef);
          resolved[key] = convertedValue;
        } else if (defaultValue !== undefined) {
          resolved[key] = defaultValue;
        } else {
          // Mark for prompting
          inputsToPrompt.push(inputDef);
        }
      }
    }

    // Prompt for missing inputs if any
    if (inputsToPrompt.length > 0) {
      try {
        this.logger.debug(`Prompting for ${inputsToPrompt.length} missing inputs`);
        const promptedValues = await promptForInputs(inputsToPrompt, context);

        // Validate and add prompted values
        for (const inputDef of inputsToPrompt) {
          const { key } = inputDef;
          if (promptedValues[key] !== undefined) {
            const convertedValue = this.validateInput(promptedValues[key], inputDef);
            validateInputValue(convertedValue, inputDef);
            resolved[key] = convertedValue;
          }
        }
      } catch (error) {
        this.logger.error(`Failed to resolve inputs: ${error.message}`);
        throw error;
      }
    }

    // Final validation: check for missing required inputs
    for (const inputDef of this.manifest.inputs || []) {
      const { key, required = false } = inputDef;
      if (required && resolved[key] === undefined) {
        throw new Error(
          `Required input '${key}' is missing. ` +
          `Provide it via --input ${key}=value or enable prompting.`
        );
      }
    }

    this.logger.debug(`Resolved ${Object.keys(resolved).length} inputs`);
    return resolved;
  }

  validateInput(value, definition) {
    const { type, enum: enumValues } = definition;

    // Return undefined/null as-is
    if (value === undefined || value === null) {
      return value;
    }

    switch (type) {
      case 'boolean':
        // Handle string representations of booleans
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === 'yes' || lower === '1') return true;
          if (lower === 'false' || lower === 'no' || lower === '0') return false;
        }
        return Boolean(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        return num;

      case 'string':
      case 'text':
        return String(value);

      case 'path':
        return resolve(String(value));

      case 'select':
      case 'enum':
        if (enumValues && !enumValues.includes(value)) {
          throw new Error(`Invalid enum value: ${value}. Must be one of: ${enumValues.join(', ')}`);
        }
        return value;

      case 'multiselect':
        // Ensure it's an array
        if (!Array.isArray(value)) {
          // Try to parse comma-separated string
          if (typeof value === 'string') {
            return value.split(',').map(v => v.trim());
          }
          throw new Error(`Multiselect value must be an array, got: ${typeof value}`);
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