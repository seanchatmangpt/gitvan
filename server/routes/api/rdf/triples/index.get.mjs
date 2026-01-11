/**
 * GET /api/rdf/triples
 * Query RDF triples/quads from the store
 *
 * Query parameters:
 * - subject: Filter by subject IRI
 * - predicate: Filter by predicate IRI
 * - object: Filter by object value (string or IRI)
 * - limit: Max results (default: 100, max: 1000)
 * - offset: Result offset (default: 0)
 * - format: Result format (json|ntriples|turtle, default: json)
 *
 * Examples:
 * GET /api/rdf/triples?subject=http://example.com/alice
 * GET /api/rdf/triples?predicate=http://xmlns.com/foaf/0.1/name
 * GET /api/rdf/triples?object=Alice
 */

import { createLogger } from '../../../../../src/utils/logger.mjs';
import { unrdfStore } from '../../../../../src/core/unrdf-store.mjs';
import { namedNode, literal } from '@unrdf/core';

const logger = createLogger('api:rdf:triples:query');

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    const {
      subject,
      predicate,
      object,
      limit = '100',
      offset = '0',
      format = 'json',
    } = query;

    // Parse and validate parameters
    const parsedLimit = Math.min(parseInt(limit), 1000);
    const parsedOffset = parseInt(offset);

    if (parsedLimit < 0 || parsedOffset < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: {
          error: 'limit and offset must be non-negative',
          code: 'INVALID_PAGINATION',
        },
      });
    }

    logger.info('Querying RDF triples', {
      subject,
      predicate,
      object,
      limit: parsedLimit,
      offset: parsedOffset,
      format,
    });

    // Ensure store is initialized
    if (!unrdfStore.initialized) {
      await unrdfStore.initialize();
    }

    // Build SPARQL query for pattern matching
    let sparqlQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?s ?p ?o
      WHERE {
        ?s ?p ?o .
    `;

    // Add filters
    if (subject) {
      sparqlQuery += `FILTER (?s = <${subject}>) `;
    }
    if (predicate) {
      sparqlQuery += `FILTER (?p = <${predicate}>) `;
    }
    if (object) {
      // Try both IRI and literal matching
      sparqlQuery += `FILTER (?o = <${object}> || ?o = "${object}") `;
    }

    sparqlQuery += `}
      LIMIT ${parsedLimit}
      OFFSET ${parsedOffset}
    `;

    // Execute query
    const results = await unrdfStore.sparql(sparqlQuery);

    // Transform results based on format
    const triples = results.map((binding) => ({
      subject: binding.s.value,
      predicate: binding.p.value,
      object: binding.o.value,
      objectType: binding.o.termType,
      language: binding.o.language,
      datatype: binding.o.datatype?.value,
    }));

    logger.info(`Found ${triples.length} matching triples`);

    return {
      status: 'success',
      data: {
        triples,
        count: triples.length,
        total: unrdfStore.getStats().totalQuads,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: triples.length === parsedLimit,
        },
      },
      metadata: {
        filters: {
          subject: subject || null,
          predicate: predicate || null,
          object: object || null,
        },
        storeStats: unrdfStore.getStats(),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error('Failed to query triples:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        error: error.message,
        code: 'QUERY_TRIPLES_ERROR',
      },
    });
  }
});
