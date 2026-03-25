/**
 * RDF Hooks Engine - @unrdf/hooks policy enforcement
 *
 * Validates and transforms RDF quads using configurable hooks:
 * - Validation hooks: Enforce constraints (IRI format, datatype, etc.)
 * - Transformation hooks: Normalize data (lowercase, canonicalize, etc.)
 * - Hook chains: Execute multiple hooks in sequence
 *
 * Integration with store:
 * - before-add: Validate/transform quad before store insertion
 * - after-add: Post-insert validations or notifications
 * - before-delete: Prevent deletion of protected quads
 * - custom: Application-specific triggers
 */

import { defineHook, executeHook, executeHookChain, KnowledgeHookEngine } from '@unrdf/hooks';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('hooks:rdf-hooks-engine');

/**
 * Singleton hooks engine
 */
class RdfHooksEngine {
  constructor() {
    // @unrdf/hooks KnowledgeHookEngine (high-performance execution)
    this.engine = null;

    // Registered hooks by trigger
    this.hooks = {
      'before-add': [],
      'after-add': [],
      'before-delete': [],
      'custom': [],
    };

    // Compiled hook chains (JIT compiled)
    this.compiled = new Map();

    // Metrics
    this.stats = {
      hooksExecuted: 0,
      hooksApplied: 0,
      hooksFailed: 0,
    };
  }

  /**
   * Initialize hooks engine
   */
  async initialize() {
    try {
      logger.info('Initializing RDF Hooks Engine with @unrdf/hooks...');

      // Create high-performance execution engine
      this.engine = new KnowledgeHookEngine();
      logger.debug('✓ Created KnowledgeHookEngine');

      // Register built-in hooks
      await this.registerBuiltInHooks();

      logger.info('✅ RDF Hooks Engine initialized successfully');
      return this;
    } catch (error) {
      logger.error('Failed to initialize hooks engine:', error);
      throw new Error(`Hooks engine initialization failed: ${error.message}`);
    }
  }

  /**
   * Register built-in validation and transformation hooks
   */
  async registerBuiltInHooks() {
    try {
      // IRI validation hook
      this.registerHook(
        defineHook({
          name: 'validate-iri',
          type: 'validate-before-write',
          trigger: 'before-add',
          validate: (quad) => {
            // Subject and predicate must be NamedNodes or BlankNodes
            if (quad.subject.termType !== 'NamedNode' && quad.subject.termType !== 'BlankNode') {
              return false;
            }
            if (quad.predicate.termType !== 'NamedNode') {
              return false;
            }
            // Validate IRI format (basic check)
            if (
              quad.subject.termType === 'NamedNode' &&
              !quad.subject.value.match(/^https?:\/\/|^urn:/)
            ) {
              logger.warn(`Invalid IRI format: ${quad.subject.value}`);
              return false;
            }
            return true;
          },
        })
      );

      // Language tag validation hook
      this.registerHook(
        defineHook({
          name: 'validate-language-tag',
          type: 'validate-before-write',
          trigger: 'before-add',
          validate: (quad) => {
            // If literal has language tag, validate it
            if (quad.object.termType === 'Literal' && quad.object.language) {
              // Match BCP 47 language tag pattern (simplified)
              return /^[a-z]{2,3}(-[A-Z]{2})?(-\w+)*$/.test(quad.object.language);
            }
            return true;
          },
        })
      );

      // Email normalization hook
      this.registerHook(
        defineHook({
          name: 'normalize-email',
          type: 'transform',
          trigger: 'before-add',
          transform: (quad) => {
            // Normalize email objects to lowercase
            if (
              quad.object.termType === 'Literal' &&
              quad.predicate.value.includes('email')
            ) {
              return {
                ...quad,
                object: {
                  ...quad.object,
                  value: quad.object.value.toLowerCase(),
                },
              };
            }
            return quad;
          },
        })
      );

      logger.debug('Registered 3 built-in hooks');
    } catch (error) {
      logger.warn('Failed to register built-in hooks:', error.message);
    }
  }

  /**
   * Register a hook
   *
   * @param {Object} hook - Hook definition from @unrdf/hooks.defineHook
   */
  registerHook(hook) {
    try {
      const trigger = hook.trigger || 'custom';
      if (!this.hooks[trigger]) {
        this.hooks[trigger] = [];
      }

      this.hooks[trigger].push(hook);
      logger.debug(`Registered hook: ${hook.name} (trigger: ${trigger})`);

      // Clear compiled chain cache for this trigger
      this.compiled.delete(trigger);

      return hook;
    } catch (error) {
      logger.error(`Failed to register hook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute hooks for a quad
   *
   * @param {Quad} quad - RDF quad
   * @param {string} trigger - Hook trigger ('before-add', 'after-add', etc.)
   * @returns {Promise<Object>} { quad, valid, applied, errors }
   */
  async executeHooks(quad, trigger = 'before-add') {
    try {
      if (!this.hooks[trigger] || this.hooks[trigger].length === 0) {
        return { quad, valid: true, applied: 0, errors: [] };
      }

      this.stats.hooksExecuted++;

      // Get or compile hook chain for this trigger
      let chain = this.compiled.get(trigger);
      if (!chain) {
        chain = await this.engine.compileChain(this.hooks[trigger], {
          useQuadPool: true,
          cacheConds: true,
        });
        this.compiled.set(trigger, chain);
      }

      // Execute compiled chain
      const results = await chain.execute(quad, {
        batchMode: false,
      });

      // Process results
      let transformedQuad = quad;
      const errors = [];

      for (const result of results) {
        if (!result.valid) {
          errors.push({
            hook: result.hookName,
            error: result.error,
            details: result.errorDetails,
          });
          this.stats.hooksFailed++;
        } else {
          // Apply transformations
          if (result.quad && result.quad !== transformedQuad) {
            transformedQuad = result.quad;
            this.stats.hooksApplied++;
          }
        }
      }

      return {
        quad: transformedQuad,
        valid: errors.length === 0,
        applied: results.length,
        errors,
      };
    } catch (error) {
      logger.error('Failed to execute hooks:', error);
      throw new Error(`Hook execution failed: ${error.message}`);
    }
  }

  /**
   * Validate quad (shortcut for 'before-add' trigger)
   *
   * @param {Quad} quad - RDF quad
   * @returns {Promise<boolean>} Whether quad is valid
   */
  async validate(quad) {
    const result = await this.executeHooks(quad, 'before-add');
    return result.valid;
  }

  /**
   * Get hook statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalHooks: Object.values(this.hooks).reduce((sum, arr) => sum + arr.length, 0),
      hooksByTrigger: Object.entries(this.hooks).reduce(
        (acc, [trigger, hooks]) => {
          acc[trigger] = hooks.length;
          return acc;
        },
        {}
      ),
    };
  }

  /**
   * Clear all hooks (for testing)
   */
  async reset() {
    this.hooks = {
      'before-add': [],
      'after-add': [],
      'before-delete': [],
      'custom': [],
    };
    this.compiled.clear();
    this.stats = {
      hooksExecuted: 0,
      hooksApplied: 0,
      hooksFailed: 0,
    };
  }
}

// Singleton instance
const rdfHooksEngine = new RdfHooksEngine();

export { rdfHooksEngine, RdfHooksEngine, defineHook };
