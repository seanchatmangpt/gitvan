/**
 * Tests for src/rdf-to-zod/OllamaRDF.mjs
 * AI-powered RDF data processing using Ollama
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies before import
vi.mock("ollama-ai-provider-v2", () => ({
  ollama: vi.fn(() => "mock-model"),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({
    text: "mock generated text",
  })),
  generateObject: vi.fn(async () => ({
    object: {
      isValid: true,
      syntaxErrors: [],
      semanticErrors: [],
      typeErrors: [],
      cardinalityErrors: [],
      recommendations: ["looks good"],
      score: 95,
    },
  })),
  streamText: vi.fn(async () => ({
    textStream: (async function* () {
      yield "chunk1 ";
      yield "chunk2";
    })(),
  })),
}));

vi.mock("../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ root: "/test" })),
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

import { OllamaRDF } from "../../src/rdf-to-zod/OllamaRDF.mjs";
import { generateText, generateObject, streamText } from "ai";

describe("OllamaRDF", () => {
  let instance;

  beforeEach(() => {
    vi.clearAllMocks();
    instance = new OllamaRDF();
  });

  describe("constructor", () => {
    it("uses default model and baseURL", () => {
      expect(instance.model).toBe("qwen3-coder");
      expect(instance.baseURL).toBe("http://localhost:11434");
    });

    it("accepts custom options", () => {
      const custom = new OllamaRDF({
        model: "llama3",
        baseURL: "http://custom:1234",
      });
      expect(custom.model).toBe("llama3");
      expect(custom.baseURL).toBe("http://custom:1234");
    });

    it("initializes default namespaces", () => {
      expect(instance.namespaces.rdf).toBe(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      );
      expect(instance.namespaces.gv).toBe("https://gitvan.dev/ontology#");
    });

    it("merges custom namespaces", () => {
      const custom = new OllamaRDF({
        namespaces: { ex: "http://example.org/" },
      });
      expect(custom.namespaces.ex).toBe("http://example.org/");
      expect(custom.namespaces.rdf).toBeDefined();
    });

    it("creates RDFToZodConverter instance", () => {
      expect(instance.rdfToZod).toBeDefined();
    });
  });

  describe("generateOntology", () => {
    it("calls generateText with description prompt", async () => {
      const result = await instance.generateOntology("A person model");
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });

    it("passes custom options", async () => {
      await instance.generateOntology("test", { temperature: 0.5 });
      const call = generateText.mock.calls[0][0];
      expect(call.temperature).toBe(0.5);
    });
  });

  describe("generateSPARQLQuery", () => {
    it("calls generateText with ontology and description", async () => {
      const result = await instance.generateSPARQLQuery(
        "find all persons",
        "ontology-ttl"
      );
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });
  });

  describe("generateZodSchemaFromOntology", () => {
    it("calls generateText with ontology and class name", async () => {
      const result = await instance.generateZodSchemaFromOntology(
        "ontology-ttl",
        "Person"
      );
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });
  });

  describe("generateRDFData", () => {
    it("calls generateText with data and ontology", async () => {
      const data = { name: "Alice", age: 30 };
      const result = await instance.generateRDFData(data, "ontology-ttl");
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });
  });

  describe("validateRDFData", () => {
    it("calls generateObject with validation schema", async () => {
      const result = await instance.validateRDFData(
        "rdf-data",
        "ontology-ttl"
      );
      expect(generateObject).toHaveBeenCalledTimes(1);
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(95);
    });
  });

  describe("generateKnowledgeHook", () => {
    it("calls generateText with hook description", async () => {
      const result = await instance.generateKnowledgeHook(
        "detect new commits",
        "ontology-ttl"
      );
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });
  });

  describe("generateSPARQLQueryStream", () => {
    it("yields streaming chunks", async () => {
      const chunks = [];
      for await (const chunk of instance.generateSPARQLQueryStream(
        "query desc",
        "ontology-ttl"
      )) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["chunk1 ", "chunk2"]);
      expect(streamText).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateOntologyStream", () => {
    it("yields streaming chunks", async () => {
      const chunks = [];
      for await (const chunk of instance.generateOntologyStream("description")) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe("generateRDFDocumentation", () => {
    it("calls generateText for documentation", async () => {
      const result = await instance.generateRDFDocumentation("ontology-ttl");
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });
  });

  describe("generateRDFFromDescription", () => {
    it("generates RDF data from description", async () => {
      const result = await instance.generateRDFFromDescription(
        "three people",
        "ontology-ttl"
      );
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(result).toBe("mock generated text");
    });
  });

  describe("generateAndValidateRDF", () => {
    it("generates and validates RDF data", async () => {
      const result = await instance.generateAndValidateRDF(
        "test description",
        "ontology-ttl"
      );
      expect(result.rdfData).toBe("mock generated text");
      expect(result.validation.isValid).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(95);
    });

    it("calls both generateText and generateObject", async () => {
      await instance.generateAndValidateRDF("desc", "onto");
      expect(generateText).toHaveBeenCalledTimes(1);
      expect(generateObject).toHaveBeenCalledTimes(1);
    });
  });
});
