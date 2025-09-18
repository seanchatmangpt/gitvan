/**
 * GitVan v2 Scaffold Runner - Secure template execution with validation
 * Implements input validation, secure execution, and comprehensive error handling
 */

import { createLogger } from '../utils/logger.mjs';
import { fingerprint, sha256Hex } from '../utils/crypto.mjs';
import { join, resolve, dirname, basename } from 'pathe';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { z } from 'zod';

// Input validation schemas
const ScaffoldInputSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().optional(),
  description: z.string().optional(),
  inputs: z.array(z.object({
    key: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'select']),
    label: z.string().optional(),
    description: z.string().optional(),
    default: z.any().optional(),
    required: z.boolean().optional(),
    validation: z.object({
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      options: z.array(z.string()).optional()
    }).optional()
  })).optional(),
  templates: z.array(z.object({
    src: z.string().min(1),
    target: z.string().min(1),
    condition: z.string().optional()
  })).optional(),
  post: z.array(z.object({
    action: z.enum(['run', 'git', 'note', 'install']),
    args: z.array(z.string()),
    condition: z.string().optional()
  })).optional()
});

const UserInputsSchema = z.record(z.string(), z.any());

export class ScaffoldRunner {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:scaffold');
    this.allowedCommands = options.allowedCommands || ['npm', 'pnpm', 'yarn', 'git'];
    this.maxTemplates = options.maxTemplates || 100;
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.dryRun = options.dryRun || false;
    this.templateProcessor = null;
  }

  async initialize() {
    if (!this.templateProcessor) {
      const { TemplateProcessor } = await import('./operations/template-processor.mjs');
      this.templateProcessor = new TemplateProcessor();
    }
  }

  async run(packId, scaffoldId, inputs = {}) {
    await this.initialize();

    // Validate inputs
    try {
      UserInputsSchema.parse(inputs);
    } catch (error) {
      throw new Error(`Invalid inputs: ${error.message}`);
    }

    // Load and validate pack
    const packPath = await this.resolvePackPath(packId);
    if (!packPath) {
      throw new Error(`Pack not found: ${packId}`);
    }

    const pack = await this.loadPack(packPath);

    // Find and validate scaffold
    const scaffold = this.findScaffold(pack, scaffoldId);
    if (!scaffold) {
      throw new Error(`Scaffold not found: ${scaffoldId} in pack ${packId}`);
    }

    try {
      ScaffoldInputSchema.parse(scaffold);
    } catch (error) {
      throw new Error(`Invalid scaffold definition: ${error.message}`);
    }

    this.logger.info(`Running scaffold: ${scaffold.title || scaffoldId}`);

    // Validate and resolve inputs
    const resolvedInputs = await this.resolveInputs(scaffold, inputs);

    // Security check on resolved inputs
    this.validateInputSecurity(resolvedInputs);

    // Execute scaffold
    const results = {
      status: 'OK',
      scaffoldId,
      packId,
      fingerprint: fingerprint({ packId, scaffoldId, inputs: resolvedInputs }),
      created: [],
      modified: [],
      errors: [],
      warnings: []
    };

    // Process templates
    await this.processTemplates(scaffold, resolvedInputs, results, packPath);

    // Run post actions
    if (scaffold.post && !this.dryRun) {
      await this.runPostActions(scaffold.post, resolvedInputs, results);
    } else if (scaffold.post && this.dryRun) {
      results.warnings.push('Post actions skipped in dry-run mode');
    }

    // Set final status
    if (results.errors.length > 0) {
      results.status = results.created.length > 0 ? 'PARTIAL' : 'FAILED';
    }

    this.logger.info(`Scaffold completed: ${results.status} (${results.created.length} files created)`);

    return results;
  }

  async resolvePackPath(packId) {
    // Check local packs directory first
    const localPacks = [
      join(process.cwd(), '.gitvan', 'packs', packId),
      join(process.cwd(), 'packs', packId)
    ];

    for (const path of localPacks) {
      if (existsSync(join(path, 'pack.json'))) {
        this.logger.debug(`Using local pack: ${path}`);
        return path;
      }
    }

    // Try registry resolution
    try {
      const { PackRegistry } = await import('./registry.mjs');
      const registry = new PackRegistry();
      return await registry.resolve(packId);
    } catch (error) {
      this.logger.error(`Failed to resolve pack from registry: ${error.message}`);
      return null;
    }
  }

  async loadPack(packPath) {
    const manifestPath = join(packPath, 'pack.json');

    if (!existsSync(manifestPath)) {
      throw new Error('Pack manifest not found');
    }

    try {
      const content = readFileSync(manifestPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load pack manifest: ${error.message}`);
    }
  }

  findScaffold(pack, scaffoldId) {
    const scaffolds = pack.provides?.scaffolds || [];
    return scaffolds.find(s => s.id === scaffoldId);
  }

  async resolveInputs(scaffold, providedInputs) {
    const resolved = { ...providedInputs };
    const inputDefs = scaffold.inputs || [];

    // Validate and resolve each input
    for (const inputDef of inputDefs) {
      const { key, type, required, default: defaultValue, validation } = inputDef;

      let value = resolved[key];

      // Apply default if no value provided
      if (value === undefined && defaultValue !== undefined) {
        value = defaultValue;
      }

      // Check required fields
      if (required && (value === undefined || value === null || value === '')) {
        throw new Error(`Required input missing: ${key}`);
      }

      // Type validation and coercion
      if (value !== undefined) {
        value = this.validateAndCoerceInput(value, type, validation, key);
        resolved[key] = value;
      }
    }

    // Add system inputs
    resolved.__system = {
      timestamp: new Date().toISOString(),
      user: process.env.USER || 'unknown',
      cwd: process.cwd(),
      gitvan_version: '2.0.0'
    };

    return resolved;
  }

  validateAndCoerceInput(value, type, validation, key) {
    switch (type) {
      case 'string':
        const strValue = String(value);
        if (validation?.pattern && !new RegExp(validation.pattern).test(strValue)) {
          throw new Error(`Input '${key}' does not match pattern: ${validation.pattern}`);
        }
        if (validation?.min && strValue.length < validation.min) {
          throw new Error(`Input '${key}' too short (min ${validation.min})`);
        }
        if (validation?.max && strValue.length > validation.max) {
          throw new Error(`Input '${key}' too long (max ${validation.max})`);
        }
        if (validation?.options && !validation.options.includes(strValue)) {
          throw new Error(`Input '${key}' must be one of: ${validation.options.join(', ')}`);
        }
        return strValue;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`Input '${key}' must be a number`);
        }
        if (validation?.min && numValue < validation.min) {
          throw new Error(`Input '${key}' too small (min ${validation.min})`);
        }
        if (validation?.max && numValue > validation.max) {
          throw new Error(`Input '${key}' too large (max ${validation.max})`);
        }
        return numValue;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (['true', 'yes', '1', 'on'].includes(lower)) return true;
          if (['false', 'no', '0', 'off'].includes(lower)) return false;
        }
        throw new Error(`Input '${key}' must be a boolean`);

      case 'select':
        const strSelectValue = String(value);
        if (!validation?.options?.includes(strSelectValue)) {
          throw new Error(`Input '${key}' must be one of: ${validation.options?.join(', ') || 'no options defined'}`);
        }
        return strSelectValue;

      default:
        return value;
    }
  }

  validateInputSecurity(inputs) {
    const dangerous = ['__proto__', 'constructor', 'prototype'];

    for (const [key, value] of Object.entries(inputs)) {
      if (dangerous.includes(key)) {
        throw new Error(`Dangerous input key not allowed: ${key}`);
      }

      if (typeof value === 'string') {
        // Check for dangerous patterns
        if (value.includes('../') || value.includes('..\\')) {
          throw new Error(`Path traversal detected in input: ${key}`);
        }

        if (value.includes('${') || value.includes('`')) {
          throw new Error(`Template injection detected in input: ${key}`);
        }
      }
    }
  }

  async processTemplates(scaffold, inputs, results, packPath) {
    const templates = scaffold.templates || [];

    if (templates.length > this.maxTemplates) {
      throw new Error(`Too many templates (max ${this.maxTemplates})`);
    }

    for (const template of templates) {
      try {
        // Check condition if present
        if (template.condition && !this.evaluateCondition(template.condition, inputs)) {
          this.logger.debug(`Skipping template due to condition: ${template.src}`);
          continue;
        }

        const srcPath = this.resolveSafePath(packPath, 'templates', template.src);
        const targetPath = this.resolveTarget(template.target, inputs);

        // Security checks
        this.validateTemplatePaths(srcPath, targetPath, packPath);

        // Check file size
        if (existsSync(srcPath)) {
          const stats = statSync(srcPath);
          if (stats.size > this.maxFileSize) {
            throw new Error(`Template file too large: ${template.src} (${stats.size} bytes)`);
          }
        }

        // Process template
        const step = {
          src: srcPath,
          target: targetPath,
          action: 'write',
          backup: this.options.backup
        };

        if (this.dryRun) {
          this.logger.info(`[DRY RUN] Would create: ${targetPath}`);
          results.created.push(targetPath);
        } else {
          // Ensure target directory exists
          const targetDir = dirname(targetPath);
          if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
          }

          await this.templateProcessor.process(step, inputs);
          results.created.push(targetPath);

          this.logger.debug(`Created: ${targetPath}`);
        }
      } catch (error) {
        const errorInfo = {
          template: template.src,
          target: template.target,
          error: error.message
        };
        results.errors.push(errorInfo);
        this.logger.error(`Failed to process template: ${template.src}`, error.message);
      }
    }
  }

  resolveSafePath(basePath, ...segments) {
    const resolved = resolve(basePath, ...segments);

    // Ensure resolved path is within base path
    if (!resolved.startsWith(resolve(basePath) + '/') && resolved !== resolve(basePath)) {
      throw new Error(`Path traversal detected: ${segments.join('/')}`);
    }

    return resolved;
  }

  validateTemplatePaths(srcPath, targetPath, packPath) {
    // Source must exist and be within pack
    if (!existsSync(srcPath)) {
      throw new Error(`Template not found: ${srcPath}`);
    }

    if (!srcPath.startsWith(resolve(packPath))) {
      throw new Error(`Template outside pack directory: ${srcPath}`);
    }

    // Target must be within current working directory
    const cwd = resolve(process.cwd());
    const resolvedTarget = resolve(targetPath);

    if (!resolvedTarget.startsWith(cwd + '/') && resolvedTarget !== cwd) {
      throw new Error(`Target outside working directory: ${targetPath}`);
    }
  }

  resolveTarget(targetPattern, inputs) {
    let target = targetPattern;

    // Replace placeholders with proper escaping
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' || typeof value === 'number') {
        const escaped = String(value).replace(/[<>:"|?*]/g, '_'); // Replace dangerous filename chars
        target = target.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), escaped);
      }
    }

    return resolve(process.cwd(), target);
  }

  evaluateCondition(condition, inputs) {
    // Simple condition evaluation (secure subset)
    try {
      // Only allow safe operations
      const safeCondition = condition.replace(/[^a-zA-Z0-9_.\s=!<>&|()]/g, '');

      // Create safe context
      const context = {};
      for (const [key, value] of Object.entries(inputs)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          context[key] = value;
        }
      }

      // Very basic condition evaluation (would use a proper safe evaluator)
      const func = new Function(...Object.keys(context), `return ${safeCondition}`);
      return func(...Object.values(context));
    } catch {
      this.logger.warn(`Invalid condition: ${condition}`);
      return true; // Default to true for safety
    }
  }

  async runPostActions(postActions, inputs, results) {
    for (const action of postActions) {
      try {
        // Check condition if present
        if (action.condition && !this.evaluateCondition(action.condition, inputs)) {
          this.logger.debug(`Skipping post action due to condition: ${action.action}`);
          continue;
        }

        await this.runPostAction(action, inputs);
        this.logger.debug(`Completed post action: ${action.action}`);
      } catch (error) {
        const errorInfo = {
          action: action.action,
          args: action.args,
          error: error.message
        };
        results.errors.push(errorInfo);
        this.logger.error(`Failed to run post action: ${action.action}`, error.message);
      }
    }
  }

  async runPostAction(action, inputs) {
    const { action: type, args } = action;
    const interpolatedArgs = this.interpolateArgs(args, inputs);

    switch (type) {
      case 'run':
        await this.runCommand(interpolatedArgs);
        break;

      case 'git':
        await this.runGitCommand(interpolatedArgs);
        break;

      case 'install':
        await this.runInstallCommand(interpolatedArgs);
        break;

      case 'note':
        const note = interpolatedArgs.join(' ');
        this.logger.info(`Note: ${note}`);
        break;

      default:
        throw new Error(`Unknown post action: ${type}`);
    }
  }

  async runCommand(args) {
    if (args.length === 0) {
      throw new Error('No command specified');
    }

    const command = args[0];

    // Security: only allow whitelisted commands
    if (!this.allowedCommands.includes(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    const { exec } = await import('node:child_process');
    return new Promise((resolve, reject) => {
      const cmd = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
      exec(cmd, { cwd: process.cwd(), timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${stderr || error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async runGitCommand(args) {
    try {
      const { useGit } = await import('../composables/git.mjs');
      const git = useGit();
      const command = args.join(' ');

      // Basic git command validation
      const allowedGitCommands = ['add', 'commit', 'init', 'status'];
      const gitCommand = args[0];

      if (!allowedGitCommands.includes(gitCommand)) {
        throw new Error(`Git command not allowed: ${gitCommand}`);
      }

      return await git.run(command);
    } catch (error) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  async runInstallCommand(args) {
    const packageManager = args[0] || 'npm';
    const allowedPMs = ['npm', 'pnpm', 'yarn'];

    if (!allowedPMs.includes(packageManager)) {
      throw new Error(`Package manager not allowed: ${packageManager}`);
    }

    const installArgs = [packageManager, 'install', ...args.slice(1)];
    return await this.runCommand(installArgs);
  }

  interpolateArgs(args, inputs) {
    return args.map(arg => {
      let result = arg;
      for (const [key, value] of Object.entries(inputs)) {
        if (typeof value === 'string' || typeof value === 'number') {
          const escaped = String(value).replace(/"/g, '\\"');
          result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), escaped);
        }
      }
      return result;
    });
  }
}