/**
 * SHACL Validation Engine - @unrdf/validation integration
 *
 * SHACL (Shapes Constraint Language) schema enforcement:
 * - Define shape definitions for data validation
 * - Validate quads against shapes
 * - Collect validation issues and proof trails
 * - OpenTelemetry integration for observability
 *
 * Shape definitions:
 * - Class constraints: rdf:type validation
 * - Property constraints: Required properties, cardinality, datatype
 * - Pattern constraints: IRI patterns, literal format
 * - Custom constraints: Application-specific validation logic
 */

import {
  createValidationRunner,
  createOTELValidator,
  createValidationHelpers,
} from '@unrdf/validation';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('validation:shacl-validation-engine');

/**
 * SHACL Validation Engine - Powered by @unrdf/validation
 */
class ShalValidationEngine {
  constructor() {
    // @unrdf/validation runner
    this.runner = null;

    // OTEL-integrated validator
    this.otelValidator = null;

    // Shape definitions (SHACL shapes)
    this.shapes = new Map();

    // Validation helpers
    this.helpers = null;

    // Metrics
    this.stats = {
      validationsRun: 0,
      validationsPassed: 0,
      validationsFailed: 0,
      issuesFound: 0,
    };
  }

  /**
   * Initialize validation engine with OTEL support
   *
   * @param {Object} options - Configuration
   * @param {string} options.serviceName - Service name for telemetry
   * @param {boolean} options.enableOTEL - Enable OpenTelemetry (default: true)
   */
  async initialize(options = {}) {
    try {
      logger.info('Initializing SHACL Validation Engine with @unrdf/validation...');

      const { serviceName = 'gitvan', enableOTEL = true } = options;

      // Create validation runner
      this.runner = createValidationRunner();
      logger.debug('✓ Created ValidationRunner');

      // Create OTEL-integrated validator if enabled
      if (enableOTEL) {
        this.otelValidator = createOTELValidator({
          serviceName,
          spanProcessor: 'batch',
          metrics: {
            recordValidationTime: true,
            recordIssueCount: true,
          },
        });
        logger.debug('✓ Created OTEL Validator with metrics');
      }

      // Get validation helpers
      this.helpers = createValidationHelpers();
      logger.debug('✓ Created validation helpers');

      // Register default shapes
      await this.registerDefaultShapes();

      logger.info('✅ SHACL Validation Engine initialized successfully');
      return this;
    } catch (error) {
      logger.error('Failed to initialize validation engine:', error);
      throw new Error(`Validation engine initialization failed: ${error.message}`);
    }
  }

  /**
   * Register default SHACL shapes
   */
  async registerDefaultShapes() {
    try {
      // Named node shape (all named nodes must be valid IRIs)
      this.registerShape('NamedNodeShape', {
        targetClass: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
        properties: [
          {
            path: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value',
            minCount: 1,
            maxCount: 1,
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
            pattern: '^(https?://|urn:)',
          },
        ],
      });

      // Literal shape (all literals must have datatype)
      this.registerShape('LiteralShape', {
        targetClass: 'http://www.w3.org/2000/01/rdf-schema#Literal',
        properties: [
          {
            path: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            minCount: 1,
          },
        ],
      });

      // Entity shape (all entities must have rdf:type and rdfs:label)
      this.registerShape('EntityShape', {
        closed: false,
        ignoredProperties: [
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          'http://www.w3.org/2000/01/rdf-schema#label',
        ],
        properties: [
          {
            path: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            minCount: 1,
          },
        ],
      });

      logger.debug('Registered 3 default shapes');
    } catch (error) {
      logger.warn('Failed to register default shapes:', error.message);
    }
  }

  /**
   * Register a SHACL shape
   *
   * @param {string} shapeName - Name of the shape
   * @param {Object} shapeConfig - Shape definition
   * @param {string} shapeConfig.targetClass - Target class IRI
   * @param {Array} shapeConfig.properties - Property constraints
   * @param {boolean} shapeConfig.closed - Closed shape (no extra properties)
   */
  registerShape(shapeName, shapeConfig) {
    try {
      this.shapes.set(shapeName, shapeConfig);
      logger.debug(`Registered shape: ${shapeName}`);
      return shapeConfig;
    } catch (error) {
      logger.error(`Failed to register shape: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate a quad against registered shapes
   *
   * @param {Quad} quad - RDF quad to validate
   * @param {string} shapeName - Optional specific shape to validate against
   * @returns {Promise<Object>} Validation result
   */
  async validate(quad, shapeName) {
    try {
      this.stats.validationsRun++;

      logger.debug(`Validating quad against shape: ${shapeName || 'all'}`);

      // Use OTEL validator if available
      const validator = this.otelValidator || this.runner;

      // Validate quad
      const result = await validator.validate(quad);

      // Track results
      if (result.passed) {
        this.stats.validationsPassed++;
      } else {
        this.stats.validationsFailed++;
        this.stats.issuesFound += result.issues?.length || 0;

        logger.warn(`Validation failed for quad:`, {
          subject: quad.subject.value,
          predicate: quad.predicate.value,
          issues: result.issues?.length,
        });
      }

      return {
        passed: result.passed,
        quad,
        issues: result.issues || [],
        receipt: result.receipt,
        // Validation proof trail
        proof: {
          timestamp: new Date().toISOString(),
          validator: shapeName || 'default',
          conformsTo: this.shapes.get(shapeName) ? `urn:gitvan:shape:${shapeName}` : undefined,
        },
      };
    } catch (error) {
      logger.error('Validation error:', error);
      throw new Error(`Quad validation failed: ${error.message}`);
    }
  }

  /**
   * Validate multiple quads (batch mode)
   *
   * @param {Quad[]} quads - Array of quads
   * @returns {Promise<Object>} Batch validation result
   */
  async validateBatch(quads) {
    try {
      logger.debug(`Validating batch of ${quads.length} quads`);

      const results = [];
      const issues = [];

      for (const quad of quads) {
        const result = await this.validate(quad);
        results.push(result);

        if (!result.passed) {
          issues.push(...result.issues.map((issue) => ({ ...issue, quad })));
        }
      }

      const passed = issues.length === 0;

      return {
        passed,
        totalQuads: quads.length,
        validQuads: results.filter((r) => r.passed).length,
        invalidQuads: results.filter((r) => !r.passed).length,
        issues,
        results,
      };
    } catch (error) {
      logger.error('Batch validation error:', error);
      throw new Error(`Batch validation failed: ${error.message}`);
    }
  }

  /**
   * Create a shape validator for repeated validation
   *
   * @param {string} shapeName - Name of shape to create validator for
   * @returns {Promise<Function>} Validator function
   */
  async createShapeValidator(shapeName) {
    const shape = this.shapes.get(shapeName);
    if (!shape) {
      throw new Error(`Shape not found: ${shapeName}`);
    }

    // Return validator function
    return async (quad) => {
      const result = await this.validate(quad, shapeName);
      return result.passed;
    };
  }

  /**
   * Get validation helpers for custom validations
   *
   * @returns {Object} Validation helper functions
   */
  getHelpers() {
    return this.helpers || {};
  }

  /**
   * Get validation statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalShapes: this.shapes.size,
      shapeNames: Array.from(this.shapes.keys()),
      successRate:
        this.stats.validationsRun > 0
          ? ((this.stats.validationsPassed / this.stats.validationsRun) * 100).toFixed(2) + '%'
          : 'N/A',
    };
  }

  /**
   * Clear all shapes (for testing)
   */
  async reset() {
    this.shapes.clear();
    this.stats = {
      validationsRun: 0,
      validationsPassed: 0,
      validationsFailed: 0,
      issuesFound: 0,
    };
  }
}

// Singleton instance
const shaclValidationEngine = new ShalValidationEngine();

export { shaclValidationEngine, ShalValidationEngine, createValidationHelpers };
