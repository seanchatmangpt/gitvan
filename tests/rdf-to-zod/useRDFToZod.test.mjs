/**
 * Tests for src/rdf-to-zod/useRDFToZod.mjs
 * RDF to Zod composable integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock dependencies
vi.mock("../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ root: "/test", cwd: "/test" })),
}));

vi.mock("../../src/composables/turtle.mjs", () => ({
  useTurtle: vi.fn(async () => ({
    store: {
      getQuads: vi.fn(() => []),
    },
  })),
}));

vi.mock("../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { useRDFToZod } from "../../src/rdf-to-zod/useRDFToZod.mjs";

describe("useRDFToZod", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns composable with expected methods", async () => {
    const rdfToZod = await useRDFToZod();
    expect(rdfToZod.converter).toBeDefined();
    expect(rdfToZod.turtle).toBeDefined();
    expect(rdfToZod.context).toBeDefined();
    expect(typeof rdfToZod.queryWithValidation).toBe("function");
    expect(typeof rdfToZod.generateSchemaFromClass).toBe("function");
    expect(typeof rdfToZod.generateSchemaFromQuery).toBe("function");
    expect(typeof rdfToZod.convertHookResults).toBe("function");
    expect(typeof rdfToZod.generateTypeScriptTypes).toBe("function");
    expect(typeof rdfToZod.validatePredicateResults).toBe("function");
    expect(typeof rdfToZod.createHookResultSchema).toBe("function");
    expect(typeof rdfToZod.createWorkflowResultSchema).toBe("function");
    expect(typeof rdfToZod.createGitContextSchema).toBe("function");
  });

  it("accepts custom namespaces", async () => {
    const rdfToZod = await useRDFToZod({
      namespaces: { ex: "http://example.org/" },
    });
    expect(rdfToZod.converter.namespaces.ex).toBe("http://example.org/");
  });

  describe("generateSchemaFromQuery", () => {
    it("delegates to converter", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.generateSchemaFromQuery(
        "SELECT ?name ?age WHERE { ?s ?p ?o }"
      );
      const result = schema.parse({ name: "Alice" });
      expect(result.name).toBe("Alice");
    });
  });

  describe("validatePredicateResults", () => {
    it("marks valid results as validated", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = z.object({ name: z.string() });
      const results = await rdfToZod.validatePredicateResults(
        [{ name: "Alice" }],
        schema
      );
      expect(results[0]._validated).toBe(true);
      expect(results[0].name).toBe("Alice");
    });

    it("marks invalid results with validation error", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = z.object({ name: z.string(), age: z.number() });
      const results = await rdfToZod.validatePredicateResults(
        [{ name: "Alice", age: "not-number" }],
        schema
      );
      expect(results[0]._validated).toBe(false);
      expect(results[0]._validationError).toBeDefined();
    });

    it("handles empty results", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = z.object({ name: z.string() });
      const results = await rdfToZod.validatePredicateResults([], schema);
      expect(results).toHaveLength(0);
    });
  });

  describe("createHookResultSchema", () => {
    it("returns a valid Zod schema", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.createHookResultSchema();
      const valid = schema.safeParse({
        hookId: "hook-1",
        predicateType: "ASK",
        result: true,
        timestamp: new Date(),
        success: true,
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid predicateType", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.createHookResultSchema();
      const result = schema.safeParse({
        hookId: "hook-1",
        predicateType: "INVALID",
        result: true,
        timestamp: new Date(),
        success: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createWorkflowResultSchema", () => {
    it("validates workflow result", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.createWorkflowResultSchema();
      const valid = schema.safeParse({
        workflowId: "wf-1",
        stepId: "step-1",
        status: "completed",
        duration: 100,
        timestamp: new Date(),
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.createWorkflowResultSchema();
      const result = schema.safeParse({
        workflowId: "wf-1",
        stepId: "step-1",
        status: "unknown",
        duration: 100,
        timestamp: new Date(),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createGitContextSchema", () => {
    it("validates git context", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.createGitContextSchema();
      const valid = schema.safeParse({
        changedFiles: ["file.mjs"],
        eventType: "commit",
        timestamp: new Date(),
      });
      expect(valid.success).toBe(true);
    });

    it("allows optional fields", async () => {
      const rdfToZod = await useRDFToZod();
      const schema = rdfToZod.createGitContextSchema();
      const valid = schema.safeParse({
        changedFiles: [],
        eventType: "push",
        timestamp: new Date(),
        commitSha: "abc123",
        branch: "main",
        author: "dev",
        message: "test",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("generateTypeScriptTypes", () => {
    it("generates type definitions", async () => {
      const rdfToZod = await useRDFToZod();
      const schemas = { user: z.object({ name: z.string() }) };
      const types = rdfToZod.generateTypeScriptTypes(schemas);
      expect(types).toContain("export type User");
    });
  });
});
