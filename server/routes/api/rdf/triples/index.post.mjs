/**
 * POST /api/rdf/triples
 * Add RDF quads to the store
 *
 * Request body:
 * {
 *   quads: Array<{
 *     subject: { termType, value },
 *     predicate: { termType, value },
 *     object: { termType, value, language?, datatype? },
 *     graph?: { termType, value }
 *   }>,
 *   validate?: boolean (default: true),
 *   persist?: boolean (default: true)
 * }
 */

import { createLogger } from '../../../../../src/utils/logger.mjs';
import { unrdfStore } from '../../../../../src/core/unrdf-store.mjs';
import { rdfHooksEngine } from '../../../../../src/hooks/rdf-hooks-engine.mjs';
import { shaclValidationEngine } from '../../../../../src/validation/shacl-validation-engine.mjs';

const logger = createLogger('api:rdf:triples:add');

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

    const { validate = true, persist = true } = body;

    logger.info(`Adding ${body.quads.length} quads to store`, {
      validate,
      persist,
    });

    // Ensure store is initialized
    if (!unrdfStore.initialized) {
      await unrdfStore.initialize();
    }

    // Process each quad
    const results = [];
    const errors = [];

    for (let i = 0; i < body.quads.length; i++) {
      const quadData = body.quads[i];

      try {
        // Reconstruct quad object
        const quad = {
          subject: { termType: quadData.subject.termType, value: quadData.subject.value },
          predicate: {
            termType: quadData.predicate.termType,
            value: quadData.predicate.value,
          },
          object: { ...quadData.object },
          graph: quadData.graph,
        };

        // Execute hooks (before-add)
        let processedQuad = quad;
        let hookErrors = [];

        if (true) {
          // Hooks are always applied
          const hookResult = await rdfHooksEngine.executeHooks(quad, 'before-add');
          if (!hookResult.valid) {
            hookErrors = hookResult.errors;
            throw createError({
              statusCode: 422,
              statusMessage: 'Unprocessable Entity',
              data: {
                error: 'Hook validation failed',
                code: 'HOOK_VALIDATION_FAILED',
                hookErrors,
              },
            });
          }
          processedQuad = hookResult.quad;
        }

        // Validate shape (optional)
        let validationResult = null;
        if (validate) {
          validationResult = await shaclValidationEngine.validate(processedQuad);
          if (!validationResult.passed) {
            throw createError({
              statusCode: 422,
              statusMessage: 'Unprocessable Entity',
              data: {
                error: 'Shape validation failed',
                code: 'SHAPE_VALIDATION_FAILED',
                issues: validationResult.issues,
              },
            });
          }
        }

        // Add to store
        const insertResult = await unrdfStore.insert([processedQuad], null);

        results.push({
          index: i,
          success: true,
          quad: processedQuad,
          hooks: hookResult?.applied || 0,
          validation: validationResult?.passed ? 'passed' : 'skipped',
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message || error.data?.error,
          code: error.data?.code || 'PROCESSING_ERROR',
        });
      }
    }

    logger.info(`Added ${results.length} quads successfully`, {
      failed: errors.length,
    });

    return {
      status: errors.length === 0 ? 'success' : 'partial',
      data: {
        added: results.length,
        failed: errors.length,
        total: body.quads.length,
        results: results.slice(0, 10), // Return first 10 for brevity
        errors: errors.length > 0 ? errors : undefined,
      },
      metadata: {
        storeStats: unrdfStore.getStats(),
        hooksStats: rdfHooksEngine.getStats(),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error('Failed to add quads:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        error: error.message,
        code: 'ADD_QUADS_ERROR',
      },
    });
  }
});
