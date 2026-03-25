/**
 * POST /api/rdf/query/sparql
 * Execute SPARQL queries against the RDF store
 *
 * Request body:
 * {
 *   query: string (required) - SPARQL query (SELECT, ASK, CONSTRUCT, DESCRIBE)
 *   baseIRI?: string - Base IRI for relative IRIs
 *   timeout?: number - Query timeout in ms
 * }
 *
 * Returns: Query results in SPARQL JSON Results format
 */

import { createLogger } from '../../../../../src/utils/logger.mjs';
import { unrdfStore } from '../../../../../src/core/unrdf-store.mjs';

const logger = createLogger('api:rdf:sparql');

/**
 * Validates SPARQL query is well-formed
 */
function validateQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const queryUpper = query.trim().toUpperCase();

  // Detect query type
  const supportedTypes = ['SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE'];
  const isSupported = supportedTypes.some((type) => queryUpper.startsWith(type));

  if (!isSupported) {
    throw new Error(
      `Unsupported query type. Supported types: ${supportedTypes.join(', ')}`
    );
  }

  return query.trim();
}

/**
 * Format query results based on type
 */
function formatResults(results, queryType) {
  if (queryType.startsWith('ASK')) {
    return {
      head: {},
      boolean: results,
    };
  }

  if (queryType.startsWith('SELECT')) {
    return {
      head: {
        vars: results.variables || [],
      },
      results: {
        bindings: results.bindings || [],
      },
    };
  }

  if (queryType.startsWith('CONSTRUCT') || queryType.startsWith('DESCRIBE')) {
    return {
      results: {
        quads: results || [],
      },
    };
  }

  return results;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate request
    if (!body.query) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          error: 'Missing required field: query',
          code: 'MISSING_QUERY',
        },
      });
    }

    // Validate and normalize query
    const query = validateQuery(body.query);

    logger.info('Executing SPARQL query', {
      queryLength: query.length,
      type: query.trim().split(/\s+/)[0],
    });

    // Ensure store is initialized
    if (!unrdfStore.initialized) {
      await unrdfStore.initialize();
    }

    // Execute query with timeout
    const timeout = body.timeout || 30000; // 30s default
    const queryPromise = unrdfStore.sparql(query, {
      baseIRI: body.baseIRI || 'http://gitvan.local/',
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeout)
    );

    const results = await Promise.race([queryPromise, timeoutPromise]);

    // Detect query type for formatting
    const queryType = query.trim().split(/\s+/)[0].toUpperCase();
    const formattedResults = formatResults(results, queryType);

    logger.info('SPARQL query executed successfully');

    return {
      status: 'success',
      data: formattedResults,
      metadata: {
        queryType,
        executionTime: Date.now(),
        storeStats: unrdfStore.getStats(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error('SPARQL query failed:', error);

    const statusCode = error.message.includes('timeout') ? 408 : 400;
    const errorCode = error.message.includes('timeout')
      ? 'QUERY_TIMEOUT'
      : 'QUERY_ERROR';

    throw createError({
      statusCode,
      statusMessage: statusCode === 408 ? 'Request Timeout' : 'Bad Request',
      data: {
        error: error.message,
        code: errorCode,
        query: body.query?.substring(0, 100), // Include truncated query for debugging
      },
    });
  }
});
