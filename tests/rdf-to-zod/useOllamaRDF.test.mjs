/**
 * Tests for src/rdf-to-zod/useOllamaRDF.mjs
 * Ollama RDF composable
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies
vi.mock("ollama-ai-provider-v2", () => ({
  ollama: vi.fn(() => "mock-model"),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({ text: "mock-text" })),
  generateObject: vi.fn(async () => ({
    object: {
      isValid: true,
      syntaxErrors: [],
      semanticErrors: [],
      typeErrors: [],
      cardinalityErrors: [],
      recommendations: [],
      score: 90,
    },
  })),
  streamText: vi.fn(async () => ({
    textStream: (async function* () {
      yield "stream-chunk";
    })(),
  })),
}));

vi.mock("../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ root: "/test", cwd: "/test" })),
}));

vi.mock("../../src/composables/turtle.mjs", () => ({
  useTurtle: vi.fn(async () => ({ store: {} })),
}));

vi.mock("../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { useOllamaRDF } from "../../src/rdf-to-zod/useOllamaRDF.mjs";
import { generateText, generateObject } from "ai";

describe("useOllamaRDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns composable with expected methods", async () => {
    const composable = await useOllamaRDF();
    expect(composable.ollamaRDF).toBeDefined();
    expect(composable.turtle).toBeDefined();
    expect(composable.context).toBeDefined();
    expect(typeof composable.generateOntology).toBe("function");
    expect(typeof composable.generateSPARQLQuery).toBe("function");
    expect(typeof composable.generateZodSchemaFromOntology).toBe("function");
    expect(typeof composable.generateRDFData).toBe("function");
    expect(typeof composable.validateRDFData).toBe("function");
    expect(typeof composable.generateKnowledgeHook).toBe("function");
    expect(typeof composable.generateRDFDocumentation).toBe("function");
    expect(typeof composable.generateRDFFromDescription).toBe("function");
    expect(typeof composable.generateAndValidateRDF).toBe("function");
    expect(typeof composable.completeRDFWorkflow).toBe("function");
    expect(typeof composable.generateKnowledgeHookWithValidation).toBe("function");
    expect(typeof composable.generateRDFWithZodValidation).toBe("function");
    expect(typeof composable.generateKnowledgeHookSystem).toBe("function");
  });

  it("accepts custom model option", async () => {
    const composable = await useOllamaRDF({ model: "llama3" });
    expect(composable.ollamaRDF.model).toBe("llama3");
  });

  describe("generateOntology", () => {
    it("delegates to OllamaRDF instance", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.generateOntology("test description");
      expect(generateText).toHaveBeenCalled();
      expect(result).toBe("mock-text");
    });
  });

  describe("generateSPARQLQuery", () => {
    it("delegates to OllamaRDF instance", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.generateSPARQLQuery("query", "onto");
      expect(generateText).toHaveBeenCalled();
      expect(result).toBe("mock-text");
    });
  });

  describe("validateRDFData", () => {
    it("delegates to OllamaRDF instance", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.validateRDFData("data", "onto");
      expect(generateObject).toHaveBeenCalled();
      expect(result.isValid).toBe(true);
    });
  });

  describe("completeRDFWorkflow", () => {
    it("chains ontology generation, data generation, validation, and docs", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.completeRDFWorkflow("workflow test");
      expect(result.ontology).toBeDefined();
      expect(result.sampleData).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.documentation).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(90);
    });
  });

  describe("generateKnowledgeHookWithValidation", () => {
    it("returns hook definition, query, and schema", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.generateKnowledgeHookWithValidation(
        "detect changes",
        "onto"
      );
      expect(result.hookDefinition).toBeDefined();
      expect(result.sparqlQuery).toBeDefined();
      expect(result.zodSchema).toBeDefined();
      expect(result.description).toBe("detect changes");
    });
  });

  describe("generateRDFWithZodValidation", () => {
    it("returns rdf data, zod schema, and validation", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.generateRDFWithZodValidation(
        "generate data",
        "onto"
      );
      expect(result.rdfData).toBeDefined();
      expect(result.zodSchema).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.isValid).toBe(true);
    });
  });

  describe("generateKnowledgeHookSystem", () => {
    it("returns full hook system with ontology, hooks, queries, schemas", async () => {
      const composable = await useOllamaRDF();
      const result = await composable.generateKnowledgeHookSystem("system test");
      expect(result.ontology).toBeDefined();
      expect(result.hooks).toHaveLength(3);
      expect(result.queries).toHaveLength(3);
      expect(result.schemas).toHaveLength(3);
      expect(result.sampleData).toBeDefined();
      expect(result.documentation).toBeDefined();
      expect(result.description).toBe("system test");
    });
  });
});
