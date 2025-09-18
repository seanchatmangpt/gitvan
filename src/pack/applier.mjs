import { Pack } from './pack.mjs';
import { createLogger } from '../utils/logger.mjs';
import { join, resolve, dirname } from 'pathe';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import nunjucks from 'nunjucks';
import grayMatter from './helpers/gray-matter.mjs';

export class PackApplier {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:applier');
  }

  async apply(packPath, targetDir, inputs = {}) {
    const pack = new Pack(packPath, { ...this.options, inputs });
    await pack.load();

    this.logger.info(`Applying pack ${pack.manifest.id} v${pack.manifest.version}`);

    try {
      // Check constraints
      const constraints = await pack.checkConstraints();
      if (!constraints.valid) {
        return {
          status: 'ERROR',
          message: 'Pack constraints not satisfied',
          errors: constraints.errors
        };
      }

      // Resolve inputs
      const resolvedInputs = await pack.resolveInputs(inputs);

      // Check idempotency
      if (await pack.checkIdempotency(targetDir)) {
        return {
          status: 'SKIP',
          message: `Pack ${pack.manifest.id} already applied (fingerprint match)`,
          pack
        };
      }

      // Apply pack components
      const results = [];
      const errors = [];

      // Apply templates
      for (const template of pack.manifest.provides.templates || []) {
        try {
          const result = await this.applyTemplate(pack, template, targetDir, resolvedInputs);
          results.push(result);
          pack.receipts.push(result);
        } catch (e) {
          errors.push({ step: 'template', template: template.src, error: e.message });
        }
      }

      // Apply files
      for (const file of pack.manifest.provides.files || []) {
        try {
          const result = await this.applyFile(pack, file, targetDir, resolvedInputs);
          results.push(result);
          pack.receipts.push(result);
        } catch (e) {
          errors.push({ step: 'file', file: file.src, error: e.message });
        }
      }

      // Apply jobs
      for (const job of pack.manifest.provides.jobs || []) {
        try {
          const result = await this.applyJob(pack, job, targetDir, resolvedInputs);
          results.push(result);
          pack.receipts.push(result);
        } catch (e) {
          errors.push({ step: 'job', job: job.src, error: e.message });
        }
      }

      // Apply dependencies
      if (pack.manifest.dependencies?.npm) {
        try {
          const result = await this.applyNpmDependencies(pack, targetDir, resolvedInputs);
          results.push(result);
          pack.receipts.push(result);
        } catch (e) {
          errors.push({ step: 'npm-deps', error: e.message });
        }
      }

      // Write receipt
      const status = errors.length === 0 ? 'OK' : (results.length > 0 ? 'PARTIAL' : 'ERROR');
      await pack.writeReceipt(targetDir, status);

      if (errors.length === 0) {
        this.logger.info(`Pack ${pack.manifest.id} applied successfully`);
        return {
          status: 'OK',
          message: `Pack applied successfully`,
          applied: results,
          pack
        };
      } else if (results.length > 0) {
        this.logger.warn(`Pack ${pack.manifest.id} partially applied with ${errors.length} errors`);
        return {
          status: 'PARTIAL',
          message: `Pack partially applied with errors`,
          applied: results,
          errors,
          pack
        };
      } else {
        this.logger.error(`Pack ${pack.manifest.id} application failed`);
        return {
          status: 'ERROR',
          message: `Pack application failed`,
          errors,
          pack
        };
      }
    } catch (e) {
      this.logger.error(`Pack application failed:`, e);
      return {
        status: 'ERROR',
        message: `Pack application failed: ${e.message}`,
        errors: [e.message]
      };
    }
  }

  async applyTemplate(pack, template, targetDir, inputs) {
    const srcPath = join(pack.path, 'templates', template.src);
    const targetPath = join(targetDir, template.target);

    if (!existsSync(srcPath)) {
      throw new Error(`Template not found: ${template.src}`);
    }

    // Read template content
    const content = readFileSync(srcPath, 'utf8');

    // Parse front-matter if present
    const parsed = grayMatter.default(content);
    const templateContent = parsed.content;
    const frontMatter = parsed.data;

    // Merge inputs with front-matter data
    const renderData = { ...inputs, ...frontMatter };

    // Render template
    const rendered = nunjucks.renderString(templateContent, renderData);

    // Check if target exists and handle mode
    if (existsSync(targetPath) && template.mode === 'skip') {
      return {
        action: 'skip',
        target: template.target,
        reason: 'File exists and mode is skip'
      };
    }

    // Ensure target directory exists
    mkdirSync(dirname(targetPath), { recursive: true });

    // Write rendered content
    writeFileSync(targetPath, rendered, 'utf8');

    // Make executable if specified
    if (template.executable) {
      // Would set executable permissions here
    }

    return {
      action: 'write',
      target: template.target,
      source: template.src,
      type: 'template'
    };
  }

  async applyFile(pack, file, targetDir, inputs) {
    const srcPath = join(pack.path, 'assets', file.src);
    const targetPath = join(targetDir, file.target);

    if (!existsSync(srcPath)) {
      throw new Error(`File not found: ${file.src}`);
    }

    // Check if target exists and handle mode
    if (existsSync(targetPath) && file.mode === 'skip') {
      return {
        action: 'skip',
        target: file.target,
        reason: 'File exists and mode is skip'
      };
    }

    // Ensure target directory exists
    mkdirSync(dirname(targetPath), { recursive: true });

    // Copy file
    copyFileSync(srcPath, targetPath);

    return {
      action: 'copy',
      target: file.target,
      source: file.src,
      type: 'file'
    };
  }

  async applyJob(pack, job, targetDir, inputs) {
    const srcPath = join(pack.path, 'jobs', job.src);
    const jobsDir = join(targetDir, job.targetDir || 'jobs');
    const jobId = job.id || job.src.replace('.mjs', '');
    const targetPath = join(jobsDir, `${jobId}.mjs`);

    if (!existsSync(srcPath)) {
      throw new Error(`Job not found: ${job.src}`);
    }

    // Ensure jobs directory exists
    mkdirSync(jobsDir, { recursive: true });

    // Copy job file
    copyFileSync(srcPath, targetPath);

    return {
      action: 'copy',
      target: targetPath,
      source: job.src,
      type: 'job',
      id: jobId
    };
  }

  async applyNpmDependencies(pack, targetDir, inputs) {
    const packageJsonPath = join(targetDir, 'package.json');
    const npmDeps = pack.manifest.dependencies.npm;

    let packageJson = {};
    if (existsSync(packageJsonPath)) {
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    }

    let modified = false;

    // Add dependencies
    if (npmDeps.dependencies) {
      packageJson.dependencies = packageJson.dependencies || {};
      for (const [name, version] of Object.entries(npmDeps.dependencies)) {
        if (!packageJson.dependencies[name]) {
          packageJson.dependencies[name] = version;
          modified = true;
        }
      }
    }

    // Add devDependencies
    if (npmDeps.devDependencies) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      for (const [name, version] of Object.entries(npmDeps.devDependencies)) {
        if (!packageJson.devDependencies[name]) {
          packageJson.devDependencies[name] = version;
          modified = true;
        }
      }
    }

    // Add scripts
    if (npmDeps.scripts) {
      packageJson.scripts = packageJson.scripts || {};
      for (const [name, script] of Object.entries(npmDeps.scripts)) {
        if (!packageJson.scripts[name]) {
          packageJson.scripts[name] = script;
          modified = true;
        }
      }
    }

    if (modified) {
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }

    return {
      action: modified ? 'update' : 'skip',
      target: 'package.json',
      type: 'npm-deps',
      modified
    };
  }
}