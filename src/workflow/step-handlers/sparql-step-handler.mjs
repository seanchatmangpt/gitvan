// src/workflow/step-handlers/SparqlStepHandler.mjs
// SPARQL step handler with enhanced useGraph integration

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useLog } from "../../composables/log.mjs";
import { useTemplate } from "../../composables/template.mjs";

/**
 * Handler for SPARQL query steps
 */
export class SparqlStepHandler extends BaseStepHandler {
  getStepType() {
    return "sparql";
  }

  validate(step) {
    if (!step.config || !step.config.query) {
      throw new Error("SPARQL step missing query configuration");
    }
    return true;
  }

  /**
   * Execute SPARQL query step with enhanced useGraph integration
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context with graph instance
   * @returns {Promise<object>} Step execution result
   */
  async execute(step, inputs, context) {
    const { graph } = context;

    if (!graph) {
      throw new Error("SPARQL step requires graph context");
    }

    this.logger.info(`🔍 Executing SPARQL query`);

    // Replace variables in query with inputs using useTemplate
    const template = await useTemplate();
    const query = template.renderString(step.config.query, inputs);

    // Inject prefixes automatically if not present
    const queryWithPrefixes = this._injectPrefixes(query, graph);

    // Execute query using useGraph composable with enhanced error handling
    let result;
    try {
      result = await graph.query(queryWithPrefixes);
    } catch (error) {
      this.logger.error(`❌ SPARQL query failed: ${error.message}`);
      return this.createResult(
        null,
        false,
        `SPARQL query execution failed: ${error.message}`
      );
    }

    // Transform result based on query type with enhanced data
    const processedResult = this.processQueryResult(result, query);

    // Add graph statistics if available
    try {
      const stats = this.getGraphStats(graph);
      if (stats) {
        processedResult.graphStats = stats;
      }
    } catch (error) {
      this.logger.warn(`⚠️ Could not get graph statistics: ${error.message}`);
    }

    return this.createResult(processedResult);
  }

  /**
   * Process query result based on query type
   * @param {object} result - Raw query result from useGraph
   * @param {string} query - Original query string
   * @returns {object} Processed result
   */
  processQueryResult(result, query) {
    const baseResult = {
      type: result.type,
      query: query,
      timestamp: new Date().toISOString(),
    };

    switch (result.type) {
      case "select":
        return {
          ...baseResult,
          variables: result.variables,
          results: result.results,
          count: result.results.length,
          hasResults: result.results.length > 0,
          // Add metadata about the query
          queryMetadata: {
            variableCount: result.variables.length,
            resultCount: result.results.length,
            isEmpty: result.results.length === 0,
          },
        };

      case "ask":
        return {
          ...baseResult,
          boolean: result.boolean,
          // Add metadata about the query
          queryMetadata: {
            isBooleanQuery: true,
            result: result.boolean,
          },
        };

      case "construct":
        return {
          ...baseResult,
          quads: result.quads.length,
          store: result.store,
          hasResults: result.quads.length > 0,
          // Add metadata about the query
          queryMetadata: {
            quadCount: result.quads.length,
            isEmpty: result.quads.length === 0,
          },
        };

      case "describe":
        return {
          ...baseResult,
          quads: result.quads.length,
          store: result.store,
          hasResults: result.quads.length > 0,
          // Add metadata about the query
          queryMetadata: {
            quadCount: result.quads.length,
            isEmpty: result.quads.length === 0,
          },
        };

      case "update":
        return {
          ...baseResult,
          ok: result.ok,
          // Add metadata about the query
          queryMetadata: {
            isUpdateQuery: true,
            success: result.ok,
          },
        };

      default:
        return {
          ...baseResult,
          result: result,
          // Add metadata about the query
          queryMetadata: {
            unknownType: true,
            rawResult: result,
          },
        };
    }
  }

  /**
   * Get query statistics from the graph
   * @param {object} graph - useGraph instance
   * @returns {object} Graph statistics
   */
  getGraphStats(graph) {
    try {
      return graph.stats;
    } catch (error) {
      this.logger.warn(`⚠️ Could not get graph stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Inject prefixes into SPARQL query if not already present
   * @param {string} query - SPARQL query string
   * @param {object} graph - useGraph instance
   * @returns {string} Query with prefixes injected
   */
  _injectPrefixes(query, graph) {
    // If query already has PREFIX declarations, return as-is
    if (query.includes("PREFIX ")) {
      return query;
    }

    // Extract prefixes from the graph store
    const prefixes = this._extractPrefixesFromStore(graph.store);

    if (prefixes.length === 0) {
      return query;
    }

    // Build prefix declarations
    const prefixDeclarations = prefixes
      .map((prefix) => `PREFIX ${prefix.name}: <${prefix.uri}>`)
      .join("\n");

    // Inject prefixes at the beginning of the query
    return `${prefixDeclarations}\n\n${query}`;
  }

  /**
   * Extract prefixes from the graph store
   * @param {object} store - N3.Store instance
   * @returns {Array} Array of prefix objects with name and uri
   */
  _extractPrefixesFromStore(store) {
    const prefixes = [];

    try {
      // Get all quads from the store
      const quads = store.getQuads();

      // Common prefixes that might be used
      const commonPrefixes = [
        { name: "rdf", uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
        { name: "rdfs", uri: "http://www.w3.org/2000/01/rdf-schema#" },
        { name: "owl", uri: "http://www.w3.org/2002/07/owl#" },
        { name: "xsd", uri: "http://www.w3.org/2001/XMLSchema#" },
        { name: "dct", uri: "http://purl.org/dc/terms/" },
        { name: "gv", uri: "https://gitvan.dev/ontology#" },
        { name: "gh", uri: "https://gitvan.dev/graph-hook#" },
        { name: "op", uri: "https://gitvan.dev/op#" },
        { name: "ex", uri: "http://example.org/" },
      ];

      // Check which prefixes are actually used in the data
      for (const prefix of commonPrefixes) {
        const prefixUri = prefix.uri;
        const hasUsage = quads.some(
          (quad) =>
            quad.subject.value.startsWith(prefixUri) ||
            quad.predicate.value.startsWith(prefixUri) ||
            quad.object.value.startsWith(prefixUri)
        );

        if (hasUsage) {
          prefixes.push(prefix);
        }
      }
    } catch (error) {
      this.logger.warn(`⚠️ Failed to extract prefixes: ${error.message}`);
    }

    return prefixes;
  }
}
