/**
 * GitVan v2 Pack Composer - Manages pack composition and application
 * Orchestrates dependency resolution and applies packs in correct order
 */

import { DependencyResolver } from './resolver.mjs';
import { PackApplier } from '../applier.mjs';
import { createLogger } from '../../utils/logger.mjs';

export class PackComposer {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:composer');
    this.resolver = new DependencyResolver(options);
    this.applier = new PackApplier(options);
  }

  async compose(packIds, targetDir, inputs = {}) {
    this.logger.info(`Composing ${packIds.length} packs to ${targetDir}`);

    try {
      // Validate inputs
      if (!Array.isArray(packIds) || packIds.length === 0) {
        throw new Error('Pack IDs must be a non-empty array');
      }

      if (!targetDir || typeof targetDir !== 'string') {
        throw new Error('Target directory must be a valid string');
      }

      // Resolve dependencies
      this.logger.debug('Resolving dependencies...');
      const resolution = await this.resolver.resolveMultiple(packIds);

      if (resolution.conflicts.length > 0) {
        this.logger.error('Conflicts detected:', resolution.conflicts);
        if (!this.options.ignoreConflicts) {
          return {
            status: 'ERROR',
            message: 'Pack conflicts detected',
            conflicts: resolution.conflicts,
            order: resolution.order
          };
        } else {
          this.logger.warn('Ignoring conflicts due to configuration');
        }
      }

      // Apply packs in dependency order
      const results = {
        status: 'OK',
        applied: [],
        errors: [],
        order: resolution.order,
        totalPacks: resolution.dependencies.length
      };

      this.logger.info(`Applying ${resolution.dependencies.length} packs in order: ${resolution.order.join(', ')}`);

      for (const dep of resolution.dependencies) {
        this.logger.info(`Applying ${dep.id}@${dep.version} (order: ${dep.order})`);

        try {
          const packPath = await this.resolver.registry.resolve(dep.id);
          if (!packPath) {
            throw new Error(`Pack path not found for ${dep.id}`);
          }

          // Use pack-specific inputs if available, fall back to global inputs
          const packInputs = {
            ...inputs,
            ...(inputs[dep.id] || {})
          };

          const result = await this.applier.apply(packPath, targetDir, packInputs);

          if (result.status === 'OK') {
            results.applied.push({
              id: dep.id,
              version: dep.version,
              order: dep.order,
              result
            });
            this.logger.info(`✓ ${dep.id} applied successfully`);
          } else if (result.status === 'SKIP') {
            results.applied.push({
              id: dep.id,
              version: dep.version,
              order: dep.order,
              result,
              skipped: true
            });
            this.logger.info(`→ ${dep.id} skipped (already applied)`);
          } else {
            results.errors.push({
              id: dep.id,
              version: dep.version,
              error: result.errors || result.message
            });
            this.logger.error(`✗ ${dep.id} failed: ${result.message}`);
          }
        } catch (error) {
          results.errors.push({
            id: dep.id,
            version: dep.version || 'unknown',
            error: error.message
          });
          this.logger.error(`✗ ${dep.id} failed with exception: ${error.message}`);

          if (!this.options.continueOnError) {
            results.status = 'ERROR';
            results.message = `Pack application failed at ${dep.id}: ${error.message}`;
            break;
          }
        }
      }

      // Determine final status
      if (results.errors.length > 0 && results.status === 'OK') {
        results.status = results.applied.length > 0 ? 'PARTIAL' : 'ERROR';
        results.message = `${results.errors.length} pack(s) failed, ${results.applied.length} succeeded`;
      } else if (results.status === 'OK') {
        results.message = `All ${results.applied.length} pack(s) applied successfully`;
      }

      return results;
    } catch (error) {
      this.logger.error(`Composition failed: ${error.message}`);
      return {
        status: 'ERROR',
        message: `Composition failed: ${error.message}`,
        errors: [error.message],
        applied: [],
        order: packIds
      };
    }
  }

  async layer(packs, targetDir) {
    this.logger.info(`Applying ${packs.length} packs as layers`);

    // Sort packs by order (later overrides earlier)
    const sorted = packs.sort((a, b) => (a.order || 999) - (b.order || 999));
    const results = [];

    for (const pack of sorted) {
      try {
        this.logger.info(`Applying layer: ${pack.id || pack.path}`);

        const result = await this.applier.apply(
          pack.path,
          targetDir,
          pack.inputs || {},
          { mode: 'layer', overwrite: true }
        );

        results.push({
          ...result,
          pack: pack.id || pack.path,
          order: pack.order || 999
        });

        this.logger.info(`Layer ${pack.id || pack.path} applied`);
      } catch (error) {
        this.logger.error(`Layer ${pack.id || pack.path} failed: ${error.message}`);
        results.push({
          status: 'ERROR',
          message: error.message,
          pack: pack.id || pack.path,
          order: pack.order || 999
        });

        if (!this.options.continueOnError) {
          break;
        }
      }
    }

    return results;
  }

  async preview(packIds, inputs = {}) {
    this.logger.info(`Previewing composition for ${packIds.length} packs`);

    try {
      const resolution = await this.resolver.resolveMultiple(packIds);
      const analysis = await this.resolver.analyzeDependencyTree(packIds);

      const preview = {
        packIds,
        totalPacks: resolution.dependencies.length,
        order: resolution.order,
        conflicts: resolution.conflicts,
        analysis: analysis.analysis,
        timeline: []
      };

      // Build application timeline
      for (const dep of resolution.dependencies) {
        const packPath = await this.resolver.registry.resolve(dep.id);
        const packInfo = await this.resolver.registry.info(dep.id);

        preview.timeline.push({
          order: dep.order,
          id: dep.id,
          version: dep.version,
          name: packInfo?.name || dep.id,
          description: packInfo?.description || 'No description',
          provides: packInfo?.provides || {},
          requires: packInfo?.requires || {},
          path: packPath
        });
      }

      return preview;
    } catch (error) {
      this.logger.error(`Preview failed: ${error.message}`);
      throw error;
    }
  }

  async validateComposition(packIds) {
    this.logger.info(`Validating composition for ${packIds.length} packs`);

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      packs: []
    };

    try {
      const resolution = await this.resolver.resolveMultiple(packIds);

      // Check for conflicts
      if (resolution.conflicts.length > 0) {
        validation.valid = false;
        validation.errors.push({
          type: 'conflicts',
          message: `${resolution.conflicts.length} pack conflicts detected`,
          details: resolution.conflicts
        });
      }

      // Validate each pack
      for (const dep of resolution.dependencies) {
        const packValidation = {
          id: dep.id,
          version: dep.version,
          valid: true,
          errors: [],
          warnings: []
        };

        try {
          const packPath = await this.resolver.registry.resolve(dep.id);
          if (!packPath) {
            packValidation.valid = false;
            packValidation.errors.push(`Pack path not found for ${dep.id}`);
            validation.valid = false;
          }

          // Check compatibility with other packs
          for (const otherDep of resolution.dependencies) {
            if (otherDep.id !== dep.id) {
              const compatibility = await this.resolver.checkCompatibility(dep.id, otherDep.id);
              if (!compatibility.compatible) {
                packValidation.warnings.push(`Potential incompatibility with ${otherDep.id}: ${compatibility.reason}`);
              }
            }
          }
        } catch (error) {
          packValidation.valid = false;
          packValidation.errors.push(error.message);
          validation.valid = false;
        }

        validation.packs.push(packValidation);
      }

      // Summary
      const errorCount = validation.packs.reduce((sum, p) => sum + p.errors.length, 0);
      const warningCount = validation.packs.reduce((sum, p) => sum + p.warnings.length, 0);

      if (errorCount > 0) {
        validation.errors.push({
          type: 'pack_errors',
          message: `${errorCount} pack validation errors found`
        });
      }

      if (warningCount > 0) {
        validation.warnings.push({
          type: 'pack_warnings',
          message: `${warningCount} pack validation warnings found`
        });
      }

      return validation;
    } catch (error) {
      validation.valid = false;
      validation.errors.push({
        type: 'validation_failed',
        message: error.message
      });
      return validation;
    }
  }

  async cleanup(targetDir, packIds = []) {
    this.logger.info(`Cleaning up composition in ${targetDir}`);

    const results = {
      cleaned: [],
      errors: []
    };

    // Would implement cleanup logic here
    // - Remove pack receipts
    // - Revert changes
    // - Clean up generated files

    this.logger.warn('Cleanup not fully implemented yet');

    return results;
  }
}