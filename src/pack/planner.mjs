/**
 * GitVan v2 Pack Planner - Dry-run planning for pack operations
 * Analyzes pack application impact without making changes
 */

import { Pack } from './pack.mjs';
import { PackApplier } from './applier.mjs';
import { createLogger } from '../utils/logger.mjs';
import { resolve, join } from 'pathe';
import { existsSync, statSync, readFileSync } from 'node:fs';

export class PackPlanner {
  constructor(options = {}) {
    this.options = { ...options, dryRun: true };
    this.logger = createLogger('pack:planner');
    this.applier = new PackApplier(this.options);
  }

  async plan(packPath, targetDir, inputs = {}) {
    const pack = new Pack(packPath, { inputs, ...this.options });
    await pack.load();

    targetDir = resolve(targetDir || process.cwd());

    this.logger.info(`Planning pack application: ${pack.manifest.id}@${pack.manifest.version}`);

    // Check constraints
    const { valid, errors } = await pack.checkConstraints();
    if (!valid) {
      return { status: 'ERROR', errors, pack };
    }

    // Detect mode
    const mode = this.options.mode || await pack.detectMode(targetDir);

    // Resolve inputs
    const resolvedInputs = await pack.resolveInputs(inputs);

    // Create detailed plan
    const plan = await this.createDetailedPlan(pack, targetDir, mode, resolvedInputs);

    // Analyze impacts
    const impacts = await this.analyzeImpacts(plan, targetDir);

    // Check for conflicts
    const conflicts = await this.detectConflicts(plan, targetDir);

    return {
      pack: pack.toJSON(),
      plan,
      impacts,
      conflicts,
      mode,
      inputs: resolvedInputs,
      status: conflicts.length > 0 ? 'CONFLICTS' : 'READY'
    };
  }

  async createDetailedPlan(pack, targetDir, mode, inputs) {
    const plan = {
      pack: pack.manifest.id,
      version: pack.manifest.version,
      targetDir,
      mode,
      inputs,
      steps: []
    };

    // Dependencies step
    if (pack.manifest.dependencies?.npm) {
      plan.steps.push({
        type: 'npm-deps',
        action: 'install',
        data: pack.manifest.dependencies.npm,
        description: 'Install npm dependencies'
      });
    }

    // File copy steps
    for (const file of pack.manifest.provides?.files || []) {
      if (await this.evaluateWhen(file.when, { inputs, mode })) {
        const srcPath = join(pack.path, 'assets', file.src);
        const targetPath = join(targetDir, file.target);

        plan.steps.push({
          type: 'file',
          action: file.mode || 'write',
          src: srcPath,
          target: targetPath,
          description: `Copy file: ${file.src} -> ${file.target}`,
          exists: existsSync(targetPath),
          size: existsSync(srcPath) ? statSync(srcPath).size : 0
        });
      }
    }

    // Template steps
    for (const template of pack.manifest.provides?.templates || []) {
      if (await this.evaluateWhen(template.when, { inputs, mode })) {
        const srcPath = join(pack.path, 'templates', template.src);
        const targetPath = join(targetDir, template.target);

        plan.steps.push({
          type: 'template',
          action: template.mode || 'write',
          src: srcPath,
          target: targetPath,
          executable: template.executable,
          description: `Render template: ${template.src} -> ${template.target}`,
          exists: existsSync(targetPath),
          size: existsSync(srcPath) ? statSync(srcPath).size : 0
        });
      }
    }

    // Job installation steps
    for (const job of pack.manifest.provides?.jobs || []) {
      const srcPath = join(pack.path, 'jobs', job.src);
      const jobsDir = join(targetDir, job.targetDir || 'jobs');
      const targetPath = join(jobsDir, job.id ? `${job.id}.mjs` : job.src);

      plan.steps.push({
        type: 'job',
        action: 'install',
        src: srcPath,
        target: targetPath,
        id: job.id,
        description: `Install job: ${job.src}`,
        exists: existsSync(targetPath),
        size: existsSync(srcPath) ? statSync(srcPath).size : 0
      });
    }

    // Event installation steps
    for (const event of pack.manifest.provides?.events || []) {
      const srcPath = join(pack.path, 'events', event.src);
      const eventsDir = join(targetDir, event.targetDir || 'events');
      const targetPath = join(eventsDir, event.id ? `${event.id}.mjs` : event.src);

      plan.steps.push({
        type: 'event',
        action: 'install',
        src: srcPath,
        target: targetPath,
        id: event.id,
        description: `Install event: ${event.src}`,
        exists: existsSync(targetPath),
        size: existsSync(srcPath) ? statSync(srcPath).size : 0
      });
    }

    // Transform steps
    for (const transform of pack.manifest.provides?.transforms || []) {
      const targetPath = join(targetDir, transform.target);

      plan.steps.push({
        type: 'transform',
        action: transform.kind,
        target: targetPath,
        spec: transform.spec,
        anchor: transform.anchor,
        description: `Transform ${transform.kind}: ${transform.target}`,
        exists: existsSync(targetPath)
      });
    }

    // Schedule registration steps
    for (const schedule of pack.manifest.provides?.schedules || []) {
      if (await this.evaluateWhen(schedule.when, { inputs, mode })) {
        plan.steps.push({
          type: 'schedule',
          action: 'register',
          job: schedule.job,
          cron: schedule.cron,
          description: `Register schedule: ${schedule.job} (${schedule.cron})`
        });
      }
    }

    // Post-install steps
    for (const post of pack.manifest.postInstall || []) {
      plan.steps.push({
        type: 'post-install',
        action: post.action,
        args: post.args,
        description: `Post-install: ${post.action} ${post.args.join(' ')}`
      });
    }

    return plan;
  }

  async analyzeImpacts(plan, targetDir) {
    const impacts = {
      creates: [],
      modifies: [],
      conflicts: [],
      commands: [],
      dependencies: [],
      estimatedChanges: 0
    };

    for (const step of plan.steps) {
      switch (step.type) {
        case 'file':
        case 'template':
          if (step.exists) {
            if (step.action === 'write') {
              impacts.modifies.push({
                path: step.target,
                type: step.type,
                risk: 'overwrite',
                size: step.size
              });
              impacts.estimatedChanges++;
            } else if (step.action === 'skip') {
              // No change
            } else if (step.action === 'merge') {
              impacts.modifies.push({
                path: step.target,
                type: step.type,
                risk: 'merge',
                size: step.size
              });
              impacts.estimatedChanges++;
            }
          } else {
            impacts.creates.push({
              path: step.target,
              type: step.type,
              size: step.size
            });
            impacts.estimatedChanges++;
          }
          break;

        case 'job':
        case 'event':
          if (step.exists) {
            impacts.modifies.push({
              path: step.target,
              type: step.type,
              risk: 'overwrite'
            });
          } else {
            impacts.creates.push({
              path: step.target,
              type: step.type
            });
          }
          impacts.estimatedChanges++;
          break;

        case 'transform':
          if (step.exists) {
            impacts.modifies.push({
              path: step.target,
              type: step.type,
              risk: 'transform'
            });
            impacts.estimatedChanges++;
          } else {
            impacts.conflicts.push({
              step,
              reason: 'Transform target does not exist'
            });
          }
          break;

        case 'npm-deps':
          if (step.data.dependencies) {
            impacts.dependencies.push(...Object.keys(step.data.dependencies));
          }
          if (step.data.devDependencies) {
            impacts.dependencies.push(...Object.keys(step.data.devDependencies));
          }
          impacts.estimatedChanges++;
          break;

        case 'post-install':
          impacts.commands.push({
            action: step.action,
            args: step.args,
            risk: 'execution'
          });
          break;
      }
    }

    return impacts;
  }

  async detectConflicts(plan, targetDir) {
    const conflicts = [];

    // Check for file conflicts
    for (const step of plan.steps) {
      if ((step.type === 'file' || step.type === 'template') && step.exists && step.action === 'write') {
        // Check if file has been modified recently
        try {
          const stats = statSync(step.target);
          const lastModified = new Date(stats.mtime);
          const hoursSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60);

          if (hoursSinceModified < 24) {
            conflicts.push({
              type: 'recent-modification',
              step,
              message: `File ${step.target} was modified recently (${Math.round(hoursSinceModified)}h ago)`
            });
          }
        } catch (error) {
          // File might not exist, ignore
        }
      }

      // Check for transform targets
      if (step.type === 'transform' && !step.exists) {
        conflicts.push({
          type: 'missing-target',
          step,
          message: `Transform target does not exist: ${step.target}`
        });
      }
    }

    // Check for dependency conflicts
    const packageJsonPath = join(targetDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const depsStep = plan.steps.find(s => s.type === 'npm-deps');

        if (depsStep) {
          for (const [name, version] of Object.entries(depsStep.data.dependencies || {})) {
            if (packageJson.dependencies?.[name] && packageJson.dependencies[name] !== version) {
              conflicts.push({
                type: 'dependency-version',
                step: depsStep,
                message: `Dependency version conflict: ${name}@${packageJson.dependencies[name]} vs ${version}`
              });
            }
          }
        }
      } catch (error) {
        // Invalid package.json
      }
    }

    return conflicts;
  }

  async evaluateWhen(expr, context) {
    if (!expr) return true;

    // Simple evaluation - would need proper expression parser
    if (typeof expr === 'string') {
      if (expr.includes('mode')) {
        return expr.includes(context.mode);
      }
      if (expr.includes('inputs.')) {
        const key = expr.split('.')[1];
        return context.inputs[key] !== undefined;
      }
    }

    return true;
  }
}