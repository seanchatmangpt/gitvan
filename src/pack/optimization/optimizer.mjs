import { createLogger } from '../../utils/logger.mjs';
import { PackCache } from './cache.mjs';
import { createHash } from 'node:crypto';
import { dirname } from 'pathe';

export class PackOptimizer {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:optimizer');
    this.cache = new PackCache(options);
    this.metrics = {
      templateRenders: 0,
      fileOperations: 0,
      transformations: 0,
      optimizations: 0
    };
  }

  async optimizeManifest(manifest) {
    const optimized = { ...manifest };

    // Remove empty arrays
    for (const key in optimized.provides) {
      if (Array.isArray(optimized.provides[key]) && optimized.provides[key].length === 0) {
        delete optimized.provides[key];
      }
    }

    // Sort arrays for deterministic output
    if (optimized.provides?.templates) {
      optimized.provides.templates.sort((a, b) => a.target.localeCompare(b.target));
    }
    if (optimized.provides?.files) {
      optimized.provides.files.sort((a, b) => a.target.localeCompare(b.target));
    }
    if (optimized.provides?.jobs) {
      optimized.provides.jobs.sort((a, b) => (a.id || a.src).localeCompare(b.id || b.src));
    }

    this.metrics.optimizations++;

    return optimized;
  }

  async optimizeTemplate(template, context) {
    const cacheKey = { template, context };

    // Check cache
    const cached = await this.cache.get('template', cacheKey);
    if (cached) {
      return cached;
    }

    // Process template
    const result = await this.processTemplate(template, context);

    // Cache result
    await this.cache.set('template', cacheKey, result);

    this.metrics.templateRenders++;

    return result;
  }

  async processTemplate(template, context) {
    // Template processing logic
    // This would be the actual template rendering
    return { rendered: template, context };
  }

  async optimizePlan(plan) {
    const optimized = { ...plan };

    // Group operations by type for batching
    const grouped = {
      files: [],
      templates: [],
      transforms: [],
      others: []
    };

    for (const step of plan.steps) {
      switch (step.type) {
        case 'file':
          grouped.files.push(step);
          break;
        case 'template':
          grouped.templates.push(step);
          break;
        case 'transform':
          grouped.transforms.push(step);
          break;
        default:
          grouped.others.push(step);
      }
    }

    // Reorder for optimal execution
    optimized.steps = [
      ...grouped.files,      // Fast file operations first
      ...grouped.templates,  // Then templates
      ...grouped.transforms, // Then transforms
      ...grouped.others      // Finally other operations
    ];

    // Mark for parallel execution where possible
    optimized.parallel = {
      files: grouped.files.length > 1,
      templates: grouped.templates.length > 1
    };

    this.metrics.optimizations++;

    return optimized;
  }

  async batchFileOperations(operations) {
    const results = [];

    // Sort by target directory to minimize directory changes
    const sorted = operations.sort((a, b) =>
      dirname(a.target).localeCompare(dirname(b.target))
    );

    // Process in batches
    const batchSize = this.options.batchSize || 10;
    for (let i = 0; i < sorted.length; i += batchSize) {
      const batch = sorted.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(op => this.processFileOperation(op))
      );
      results.push(...batchResults);
    }

    this.metrics.fileOperations += operations.length;

    return results;
  }

  async processFileOperation(operation) {
    // File operation processing
    return { ...operation, processed: true };
  }

  async deduplicateSteps(steps) {
    const seen = new Set();
    const deduplicated = [];

    for (const step of steps) {
      const fingerprint = this.generateStepFingerprint(step);

      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        deduplicated.push(step);
      } else {
        this.logger.debug(`Skipping duplicate step: ${step.type} ${step.target}`);
      }
    }

    return deduplicated;
  }

  generateStepFingerprint(step) {
    const data = {
      type: step.type,
      target: step.target,
      action: step.action,
      src: step.src
    };

    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);
  }

  async preloadDependencies(manifest) {
    const dependencies = [];

    // Preload templates
    if (manifest.provides?.templates) {
      for (const template of manifest.provides.templates) {
        dependencies.push({
          type: 'template',
          path: template.src,
          priority: 1
        });
      }
    }

    // Preload files
    if (manifest.provides?.files) {
      for (const file of manifest.provides.files) {
        dependencies.push({
          type: 'file',
          path: file.src,
          priority: 2
        });
      }
    }

    // Sort by priority and preload
    dependencies.sort((a, b) => a.priority - b.priority);

    const preloaded = [];
    for (const dep of dependencies) {
      const cached = await this.cache.get(dep.type, dep.path);
      if (!cached) {
        // Load and cache
        const content = await this.loadDependency(dep);
        await this.cache.set(dep.type, dep.path, content);
        preloaded.push(dep.path);
      }
    }

    this.logger.debug(`Preloaded ${preloaded.length} dependencies`);

    return preloaded;
  }

  async loadDependency(dep) {
    // Load dependency from disk
    return { type: dep.type, path: dep.path, loaded: true };
  }

  async parallelApply(steps, applier) {
    const { files, templates } = this.groupByParallelizable(steps);

    const results = [];

    // Apply files in parallel
    if (files.length > 0) {
      const fileResults = await Promise.all(
        files.map(step => applier.applyStep(step))
      );
      results.push(...fileResults);
    }

    // Apply templates in parallel
    if (templates.length > 0) {
      const templateResults = await Promise.all(
        templates.map(step => applier.applyStep(step))
      );
      results.push(...templateResults);
    }

    // Apply remaining steps sequentially
    const remaining = steps.filter(s =>
      !files.includes(s) && !templates.includes(s)
    );

    for (const step of remaining) {
      const result = await applier.applyStep(step);
      results.push(result);
    }

    return results;
  }

  groupByParallelizable(steps) {
    const files = [];
    const templates = [];

    for (const step of steps) {
      if (step.type === 'file' && !step.dependencies) {
        files.push(step);
      } else if (step.type === 'template' && !step.dependencies) {
        templates.push(step);
      }
    }

    return { files, templates };
  }

  getMetrics() {
    const cacheStats = this.cache.getStats();

    return {
      ...this.metrics,
      cache: cacheStats,
      efficiency: {
        templateCacheHitRate: cacheStats.hitRate,
        averageOptimizationsPerPlan: this.metrics.optimizations / (this.metrics.templateRenders || 1)
      }
    };
  }

  reset() {
    this.metrics = {
      templateRenders: 0,
      fileOperations: 0,
      transformations: 0,
      optimizations: 0
    };
    this.cache.clear();
  }
}