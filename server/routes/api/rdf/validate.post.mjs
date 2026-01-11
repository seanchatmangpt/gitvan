/**
 * POST /api/rdf/validate
 * Validate RDF quads against SHACL shapes
 *
 * Request body:
 * {
 *   quads: Array<Quad>,
 *   shapes?: Array<string>, // Optional shape names to validate against
 *   batch?: boolean (default: false)
 * }
 */

import { createLogger } from '../../../../../src/utils/logger.mjs';
import { shaclValidationEngine } from '../../../../../src/validation/shacl-validation-engine.mjs';
import { rdfHooksEngine } from '../../../../../src/hooks/rdf-hooks-engine.mjs';

const logger = createLogger('api:rdf:validate');

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate request
    if (!body.quads || !Array.isArray(body.quads)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          error: 'Missing or invalid field: quads (must be an array)',
          code: 'INVALID_QUADS',
        },
      });
    }

    const { shapes, batch = false } = body;

    logger.info(`Validating ${body.quads.length} quads`, {
      shapes: shapes?.length || 'all',
      batch,
    });

    // Ensure validation engine is initialized
    if (!shaclValidationEngine.runner) {
      await shaclValidationEngine.initialize();
    }

    // Reconstruct quads
    const quads = body.quads.map((q) => ({
      subject: { termType: q.subject.termType, value: q.subject.value },
      predicate: { termType: q.predicate.termType, value: q.predicate.value },
      object: { ...q.object },
      graph: q.graph,
    }));

    let results;

    if (batch) {
      // Batch validation
      results = await shaclValidationEngine.validateBatch(quads);
    } else {
      // Individual validation
      const validationResults = [];
      for (const quad of quads) {
        const result = await shaclValidationEngine.validate(quad);
        validationResults.push(result);
      }

      results = {
        passed: validationResults.every((r) => r.passed),
        totalQuads: quads.length,
        validQuads: validationResults.filter((r) => r.passed).length,
        invalidQuads: validationResults.filter((r) => !r.passed).length,
        results: validationResults,
      };
    }

    // Also run hooks validation for comparison
    const hooksResults = [];
    for (const quad of quads) {
      const hookResult = await rdfHooksEngine.executeHooks(quad, 'before-add');
      hooksResults.push({
        valid: hookResult.valid,
        applied: hookResult.applied,
        errors: hookResult.errors,
      });
    }

    logger.info(
      `Validation complete: ${results.validQuads}/${results.totalQuads} passed`
    );

    return {
      status: results.passed ? 'success' : 'invalid',
      data: {
        validation: {
          passed: results.passed,
          totalQuads: results.totalQuads,
          validQuads: results.validQuads,
          invalidQuads: results.invalidQuads,
        },
        issues:
          results.invalidQuads > 0
            ? results.results
                .filter((r) => !r.passed)
                .slice(0, 10)
                .map((r) => ({
                  quad: r.quad,
                  issues: r.issues,
                }))
            : [],
        hooks: {
          totalApplied: hooksResults.reduce((sum, r) => sum + r.applied, 0),
          hooksFailed: hooksResults.filter((r) => !r.valid).length,
        },
      },
      metadata: {
        validationStats: shaclValidationEngine.getStats(),
        hooksStats: rdfHooksEngine.getStats(),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error('Validation error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        error: error.message,
        code: 'VALIDATE_ERROR',
      },
    });
  }
});
