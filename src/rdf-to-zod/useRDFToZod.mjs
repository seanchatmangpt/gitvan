/**
 * RDF to Zod Composable
 * Provides easy integration of RDF to Zod conversion with GitVan context
 */

import { RDFToZodConverter } from "./RDFToZodConverter.mjs";
import { useGitVan } from "../core/context.mjs";
import { useTurtle } from "../composables/turtle.mjs";
import { z } from "zod";

export async function useRDFToZod(options = {}) {
  const context = useGitVan();
  const turtle = await useTurtle(options);

  const converter = new RDFToZodConverter({
    namespaces: {
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      owl: "http://www.w3.org/2002/07/owl#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      gv: "https://gitvan.dev/ontology#",
      gh: "https://gitvan.dev/graph-hook#",
      op: "https://gitvan.dev/op#",
      ...options.namespaces,
    },
  });

  return {
    converter,
    turtle,
    context,

    /**
     * Query with Zod validation
     */
    async queryWithValidation(query, schema) {
      return await converter.queryToZod(query, turtle.store, schema);
    },

    /**
     * Generate schema from RDF class
     */
    async generateSchemaFromClass(classUri) {
      return converter.generateSchemaFromClass(classUri, turtle.store);
    },

    /**
     * Generate schema from SPARQL query
     */
    generateSchemaFromQuery(query) {
      return converter.generateSchemaFromQuery(query);
    },

    /**
     * Convert hook results to validated objects
     */
    async convertHookResults(hookResults, schema) {
      return await converter.convertHookResults(hookResults, schema);
    },

    /**
     * Generate TypeScript types
     */
    generateTypeScriptTypes(schemas) {
      return converter.generateTypeScriptTypes(schemas);
    },

    /**
     * Validate Knowledge Hook predicate results
     */
    async validatePredicateResults(predicateResults, schema) {
      const validatedResults = [];

      for (const result of predicateResults) {
        try {
          const validated = schema.parse(result);
          validatedResults.push({
            ...validated,
            _validated: true,
          });
        } catch (error) {
          validatedResults.push({
            ...result,
            _validated: false,
            _validationError: error.message,
          });
        }
      }

      return validatedResults;
    },

    /**
     * Create Zod schema for Knowledge Hook results
     */
    createHookResultSchema() {
      return z.object({
        hookId: z.string(),
        predicateType: z.enum(["ASK", "SELECT", "CONSTRUCT", "DESCRIBE"]),
        result: z.any(),
        timestamp: z.date(),
        success: z.boolean(),
        error: z.string().optional(),
      });
    },

    /**
     * Create Zod schema for workflow execution results
     */
    createWorkflowResultSchema() {
      return z.object({
        workflowId: z.string(),
        stepId: z.string(),
        status: z.enum(["pending", "running", "completed", "failed"]),
        result: z.any().optional(),
        error: z.string().optional(),
        duration: z.number(),
        timestamp: z.date(),
      });
    },

    /**
     * Create Zod schema for Git context
     */
    createGitContextSchema() {
      return z.object({
        commitSha: z.string().optional(),
        branch: z.string().optional(),
        changedFiles: z.array(z.string()),
        eventType: z.string(),
        timestamp: z.date(),
        author: z.string().optional(),
        message: z.string().optional(),
      });
    },
  };
}

export { RDFToZodConverter };
export default useRDFToZod;
