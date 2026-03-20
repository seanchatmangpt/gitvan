/**
 * @fileoverview SHACL Validator Composable for GitVan
 *
 * Provides declarative RDF validation using SHACL (Shapes Constraint Language)
 * Complements Zod-based runtime validation with RDF-native semantic constraints
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createStore } from "@unrdf/core";
import { parseTurtle } from "../lib/unrdf-compat.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SHACL Validator composable for validating RDF graphs against SHACL shapes
 * @returns {Object} Validator interface with validation methods
 */
export function useSHACLValidator() {
  const shapeCache = new Map();
  const logger = console;

  return {
    /**
     * Validate a workflow definition against SHACL shapes
     * @param {Object} graph - RDF graph to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation report
     */
    async validateWorkflow(graph, options = {}) {
      const shapesGraph = await this._loadShapes('workflow-shapes.ttl');
      return this._validate(graph, shapesGraph, options);
    },

    /**
     * Validate hook definition against SHACL shapes
     * @param {Object} graph - RDF graph to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation report
     */
    async validateHook(graph, options = {}) {
      const shapesGraph = await this._loadShapes('hook-shapes.ttl');
      return this._validate(graph, shapesGraph, options);
    },

    /**
     * Validate git event against SHACL shapes
     * @param {Object} graph - RDF graph to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation report
     */
    async validateGitEvent(graph, options = {}) {
      const shapesGraph = await this._loadShapes('git-event-shapes.ttl');
      return this._validate(graph, shapesGraph, options);
    },

    /**
     * Validate configuration against SHACL shapes
     * @param {Object} graph - RDF graph to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation report
     */
    async validateConfig(graph, options = {}) {
      const shapesGraph = await this._loadShapes('config-shapes.ttl');
      return this._validate(graph, shapesGraph, options);
    },

    /**
     * Validate pack against SHACL shapes
     * @param {Object} graph - RDF graph to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation report
     */
    async validatePack(graph, options = {}) {
      const shapesGraph = await this._loadShapes('pack-shapes.ttl');
      return this._validate(graph, shapesGraph, options);
    },

    /**
     * Core validation method using rdf-validate-shacl
     * @private
     */
    async _validate(dataGraph, shapesGraph, options = {}) {
      try {
        const SHACLValidator =
          (await import('rdf-validate-shacl')).default;

        const validator = new SHACLValidator();
        const report = validator.validate(dataGraph, shapesGraph);

        // Parse violations and normalize data
        const violations = (report.results || []).map(result => ({
          focusNode: result.focusNode?.value || result.focusNode?.toString(),
          severity: this._normalizeSeverity(result.severity?.value),
          path: result.resultPath?.value || result.resultPath?.toString(),
          message: result.resultMessage?.[0]?.value || result.resultMessage?.[0]?.toString() || 'Unknown violation',
          sourceShape: result.sourceShape?.value || result.sourceShape?.toString(),
        }));

        // Calculate statistics
        const stats = {
          totalViolations: violations.length,
          violations: violations.filter(v => v.severity === 'Violation').length,
          warnings: violations.filter(v => v.severity === 'Warning').length,
          info: violations.filter(v => v.severity === 'Info').length,
        };

        return {
          conforms: report.conforms === true,
          violations: violations,
          stats: stats,
          timestamp: new Date().toISOString(),
          strict: options.strict === true,
        };
      } catch (error) {
        logger.error(`SHACL validation error: ${error.message}`);
        if (options.strict === true) {
          throw error;
        }
        return {
          conforms: false,
          violations: [],
          stats: {
            totalViolations: 0,
            violations: 0,
            warnings: 0,
            info: 0,
          },
          error: error.message,
          timestamp: new Date().toISOString(),
          strict: options.strict === true,
        };
      }
    },

    /**
     * Load SHACL shapes from file with caching
     * @private
     */
    async _loadShapes(shapeName) {
      if (shapeCache.has(shapeName)) {
        return shapeCache.get(shapeName);
      }

      try {
        const shapePath = join(
          dirname(dirname(__dirname)),
          'config',
          'shacl',
          shapeName
        );

        const turtleContent = readFileSync(shapePath, 'utf-8');
        const shapesStore = await createStore();

        // Parse Turtle content into store
        const quads = parseTurtle(turtleContent);
        for (const quad of quads) {
          shapesStore.addQuad(quad);
        }

        shapeCache.set(shapeName, shapesStore);
        return shapesStore;
      } catch (error) {
        logger.warn(`Failed to load shapes ${shapeName}: ${error.message}`);
        throw new Error(`Failed to load SHACL shapes: ${error.message}`);
      }
    },

    /**
     * Normalize severity URI to simple string
     * @private
     */
    _normalizeSeverity(severityUri) {
      if (!severityUri) return 'Info';
      if (severityUri.includes('Violation')) return 'Violation';
      if (severityUri.includes('Warning')) return 'Warning';
      if (severityUri.includes('Info')) return 'Info';
      return 'Info';
    },

    /**
     * Generate user-friendly error messages from violations
     * @param {Object} report - Validation report
     * @returns {Object} Formatted error messages
     */
    formatErrorReport(report) {
      if (report.conforms) {
        return {
          success: true,
          message: 'All validations passed',
        };
      }

      const grouped = {
        critical: [],
        warnings: [],
        info: [],
      };

      for (const violation of report.violations) {
        const formatted = {
          path: violation.path,
          message: violation.message,
          node: violation.focusNode,
          shape: violation.sourceShape,
        };

        if (violation.severity === 'Violation') {
          grouped.critical.push(formatted);
        } else if (violation.severity === 'Warning') {
          grouped.warnings.push(formatted);
        } else {
          grouped.info.push(formatted);
        }
      }

      return {
        success: false,
        summary: `${report.stats.violations} violations, ${report.stats.warnings} warnings`,
        violations: grouped.critical,
        warnings: grouped.warnings,
        info: grouped.info,
        stats: report.stats,
      };
    },
  };
}
