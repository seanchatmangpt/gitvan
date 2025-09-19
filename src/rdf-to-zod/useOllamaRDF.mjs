/**
 * Ollama RDF Composable
 * Provides AI-powered RDF processing with GitVan context integration
 */

import { OllamaRDF } from "./OllamaRDF.mjs";
import { useGitVan } from "../core/context.mjs";
import { useTurtle } from "../composables/turtle.mjs";
import { z } from "zod";

export async function useOllamaRDF(options = {}) {
  const context = useGitVan();
  const turtle = await useTurtle(options);

  const ollamaRDF = new OllamaRDF({
    model: options.model || "qwen3-coder",
    baseURL: options.baseURL || "http://localhost:11434",
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
    ollamaRDF,
    turtle,
    context,

    /**
     * Generate RDF ontology from natural language
     */
    async generateOntology(description, options = {}) {
      return await ollamaRDF.generateOntology(description, options);
    },

    /**
     * Generate SPARQL query from natural language
     */
    async generateSPARQLQuery(description, ontology, options = {}) {
      return await ollamaRDF.generateSPARQLQuery(
        description,
        ontology,
        options
      );
    },

    /**
     * Generate Zod schema from RDF ontology using AI
     */
    async generateZodSchemaFromOntology(ontology, className, options = {}) {
      return await ollamaRDF.generateZodSchemaFromOntology(
        ontology,
        className,
        options
      );
    },

    /**
     * Generate RDF data from structured input
     */
    async generateRDFData(data, ontology, options = {}) {
      return await ollamaRDF.generateRDFData(data, ontology, options);
    },

    /**
     * Validate RDF data using AI
     */
    async validateRDFData(rdfData, ontology, options = {}) {
      return await ollamaRDF.validateRDFData(rdfData, ontology, options);
    },

    /**
     * Generate Knowledge Hook definitions
     */
    async generateKnowledgeHook(description, ontology, options = {}) {
      return await ollamaRDF.generateKnowledgeHook(
        description,
        ontology,
        options
      );
    },

    /**
     * Generate SPARQL query with streaming
     */
    async *generateSPARQLQueryStream(description, ontology, options = {}) {
      yield* ollamaRDF.generateSPARQLQueryStream(
        description,
        ontology,
        options
      );
    },

    /**
     * Generate RDF ontology with streaming
     */
    async *generateOntologyStream(description, options = {}) {
      yield* ollamaRDF.generateOntologyStream(description, options);
    },

    /**
     * Generate comprehensive RDF documentation
     */
    async generateRDFDocumentation(ontology, options = {}) {
      return await ollamaRDF.generateRDFDocumentation(ontology, options);
    },

    /**
     * Generate RDF data from natural language description
     */
    async generateRDFFromDescription(description, ontology, options = {}) {
      return await ollamaRDF.generateRDFFromDescription(
        description,
        ontology,
        options
      );
    },

    /**
     * Generate and validate RDF data
     */
    async generateAndValidateRDF(description, ontology, options = {}) {
      return await ollamaRDF.generateAndValidateRDF(
        description,
        ontology,
        options
      );
    },

    /**
     * Complete RDF workflow: Generate ontology, data, and validation
     */
    async completeRDFWorkflow(description, options = {}) {
      // Generate ontology
      const ontology = await ollamaRDF.generateOntology(description, options);

      // Generate sample data
      const sampleData = await ollamaRDF.generateRDFFromDescription(
        `Generate sample data for: ${description}`,
        ontology,
        options
      );

      // Validate the data
      const validation = await ollamaRDF.validateRDFData(
        sampleData,
        ontology,
        options
      );

      // Generate documentation
      const documentation = await ollamaRDF.generateRDFDocumentation(
        ontology,
        options
      );

      return {
        ontology,
        sampleData,
        validation,
        documentation,
        isValid: validation.isValid,
        score: validation.score,
      };
    },

    /**
     * Generate Knowledge Hook with validation
     */
    async generateKnowledgeHookWithValidation(
      description,
      ontology,
      options = {}
    ) {
      // Generate the hook
      const hookDefinition = await ollamaRDF.generateKnowledgeHook(
        description,
        ontology,
        options
      );

      // Generate sample SPARQL query
      const sparqlQuery = await ollamaRDF.generateSPARQLQuery(
        description,
        ontology,
        options
      );

      // Generate Zod schema for validation
      const zodSchema = await ollamaRDF.generateZodSchemaFromOntology(
        ontology,
        "HookResult",
        options
      );

      return {
        hookDefinition,
        sparqlQuery,
        zodSchema,
        description,
      };
    },

    /**
     * Generate RDF data with Zod validation
     */
    async generateRDFWithZodValidation(description, ontology, options = {}) {
      // Generate RDF data
      const rdfData = await ollamaRDF.generateRDFFromDescription(
        description,
        ontology,
        options
      );

      // Generate Zod schema
      const zodSchema = await ollamaRDF.generateZodSchemaFromOntology(
        ontology,
        "GeneratedData",
        options
      );

      // Validate RDF data
      const validation = await ollamaRDF.validateRDFData(
        rdfData,
        ontology,
        options
      );

      return {
        rdfData,
        zodSchema,
        validation,
        isValid: validation.isValid,
        score: validation.score,
      };
    },

    /**
     * Generate complete Knowledge Hook system
     */
    async generateKnowledgeHookSystem(description, options = {}) {
      // Generate ontology
      const ontology = await ollamaRDF.generateOntology(description, options);

      // Generate multiple hooks
      const hooks = await Promise.all([
        ollamaRDF.generateKnowledgeHook(
          `ASK query for: ${description}`,
          ontology,
          options
        ),
        ollamaRDF.generateKnowledgeHook(
          `SELECT query for: ${description}`,
          ontology,
          options
        ),
        ollamaRDF.generateKnowledgeHook(
          `CONSTRUCT query for: ${description}`,
          ontology,
          options
        ),
      ]);

      // Generate SPARQL queries
      const queries = await Promise.all([
        ollamaRDF.generateSPARQLQuery(
          `ASK query for: ${description}`,
          ontology,
          options
        ),
        ollamaRDF.generateSPARQLQuery(
          `SELECT query for: ${description}`,
          ontology,
          options
        ),
        ollamaRDF.generateSPARQLQuery(
          `CONSTRUCT query for: ${description}`,
          ontology,
          options
        ),
      ]);

      // Generate Zod schemas
      const schemas = await Promise.all([
        ollamaRDF.generateZodSchemaFromOntology(ontology, "AskResult", options),
        ollamaRDF.generateZodSchemaFromOntology(
          ontology,
          "SelectResult",
          options
        ),
        ollamaRDF.generateZodSchemaFromOntology(
          ontology,
          "ConstructResult",
          options
        ),
      ]);

      // Generate sample data
      const sampleData = await ollamaRDF.generateRDFFromDescription(
        description,
        ontology,
        options
      );

      // Generate documentation
      const documentation = await ollamaRDF.generateRDFDocumentation(
        ontology,
        options
      );

      return {
        ontology,
        hooks,
        queries,
        schemas,
        sampleData,
        documentation,
        description,
      };
    },
  };
}

export { OllamaRDF };
export default useOllamaRDF;
