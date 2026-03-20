/**
 * Tests for src/rdf-to-zod/RDFToZodConverter.mjs
 * RDF to Zod schema conversion
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RDFToZodConverter } from "../../src/rdf-to-zod/RDFToZodConverter.mjs";
import { z } from "zod";

// Mock the logger
vi.mock("../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("RDFToZodConverter", () => {
  const XSD = "http://www.w3.org/2001/XMLSchema#";

  describe("constructor", () => {
    it("initializes with default namespaces", () => {
      const converter = new RDFToZodConverter();
      expect(converter.namespaces.rdf).toBe(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      );
      expect(converter.namespaces.rdfs).toBe(
        "http://www.w3.org/2000/01/rdf-schema#"
      );
      expect(converter.namespaces.xsd).toBe(XSD);
      expect(converter.namespaces.gv).toBe("https://gitvan.dev/ontology#");
    });

    it("merges custom namespaces", () => {
      const converter = new RDFToZodConverter({
        namespaces: { custom: "http://custom.example.org/" },
      });
      expect(converter.namespaces.custom).toBe("http://custom.example.org/");
      expect(converter.namespaces.rdf).toBe(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
      );
    });
  });

  describe("rdfTermToValue", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("converts NamedNode to its value", () => {
      const term = { termType: "NamedNode", value: "http://example.org/foo" };
      expect(converter.rdfTermToValue(term)).toBe("http://example.org/foo");
    });

    it("converts BlankNode with _: prefix", () => {
      const term = { termType: "BlankNode", value: "b0" };
      expect(converter.rdfTermToValue(term)).toBe("_:b0");
    });

    it("converts Variable to its value", () => {
      const term = { termType: "Variable", value: "x" };
      expect(converter.rdfTermToValue(term)).toBe("x");
    });

    it("converts string Literal", () => {
      const term = {
        termType: "Literal",
        value: "hello",
        datatype: { value: XSD + "string" },
      };
      expect(converter.rdfTermToValue(term)).toBe("hello");
    });

    it("converts integer Literal", () => {
      const term = {
        termType: "Literal",
        value: "42",
        datatype: { value: XSD + "integer" },
      };
      expect(converter.rdfTermToValue(term)).toBe(42);
    });

    it("converts decimal Literal", () => {
      const term = {
        termType: "Literal",
        value: "3.14",
        datatype: { value: XSD + "decimal" },
      };
      expect(converter.rdfTermToValue(term)).toBeCloseTo(3.14);
    });

    it("converts boolean Literal true", () => {
      const term = {
        termType: "Literal",
        value: "true",
        datatype: { value: XSD + "boolean" },
      };
      expect(converter.rdfTermToValue(term)).toBe(true);
    });

    it("converts boolean Literal false", () => {
      const term = {
        termType: "Literal",
        value: "false",
        datatype: { value: XSD + "boolean" },
      };
      expect(converter.rdfTermToValue(term)).toBe(false);
    });

    it("converts dateTime Literal", () => {
      const term = {
        termType: "Literal",
        value: "2024-01-01T00:00:00Z",
        datatype: { value: XSD + "dateTime" },
      };
      const result = converter.rdfTermToValue(term);
      expect(result).toBeInstanceOf(Date);
    });

    it("converts date Literal", () => {
      const term = {
        termType: "Literal",
        value: "2024-01-01",
        datatype: { value: XSD + "date" },
      };
      const result = converter.rdfTermToValue(term);
      expect(result).toBeInstanceOf(Date);
    });

    it("returns raw value for unknown term type", () => {
      const term = { termType: "Unknown", value: "raw" };
      expect(converter.rdfTermToValue(term)).toBe("raw");
    });

    it("returns raw value for Literal with unknown datatype", () => {
      const term = {
        termType: "Literal",
        value: "custom-val",
        datatype: { value: "http://custom/type" },
      };
      expect(converter.rdfTermToValue(term)).toBe("custom-val");
    });
  });

  describe("literalToValue", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("returns raw value when no datatype present", () => {
      const literal = { value: "plain" };
      expect(converter.literalToValue(literal)).toBe("plain");
    });
  });

  describe("createZodField", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("creates string field for xsd:string", () => {
      const range = { value: XSD + "string" };
      const cardinality = { min: 1, max: 1 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse("test")).toBe("test");
    });

    it("creates integer field for xsd:integer", () => {
      const range = { value: XSD + "integer" };
      const cardinality = { min: 1, max: 1 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse(42)).toBe(42);
      expect(() => field.parse(3.14)).toThrow();
    });

    it("creates number field for xsd:decimal", () => {
      const range = { value: XSD + "decimal" };
      const cardinality = { min: 1, max: 1 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse(3.14)).toBe(3.14);
    });

    it("creates boolean field for xsd:boolean", () => {
      const range = { value: XSD + "boolean" };
      const cardinality = { min: 1, max: 1 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse(true)).toBe(true);
    });

    it("creates date field for xsd:dateTime", () => {
      const range = { value: XSD + "dateTime" };
      const cardinality = { min: 1, max: 1 };
      const field = converter.createZodField(range, cardinality);
      const d = new Date();
      expect(field.parse(d)).toBe(d);
    });

    it("creates optional field for min=0 max=1", () => {
      const range = { value: XSD + "string" };
      const cardinality = { min: 0, max: 1 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse(undefined)).toBeUndefined();
      expect(field.parse("test")).toBe("test");
    });

    it("creates array field for max > 1", () => {
      const range = { value: XSD + "string" };
      const cardinality = { min: 0, max: 5 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse(["a", "b"])).toEqual(["a", "b"]);
    });

    it("creates optional field for min=0 max=Infinity", () => {
      const range = { value: XSD + "string" };
      const cardinality = { min: 0, max: Infinity };
      const field = converter.createZodField(range, cardinality);
      // max is Infinity > 1, so it should be array
      expect(field.parse(["a"])).toEqual(["a"]);
    });

    it("defaults to string for unknown range", () => {
      const range = { value: "http://custom/UnknownType" };
      const cardinality = { min: 1, max: 1 };
      const field = converter.createZodField(range, cardinality);
      expect(field.parse("test")).toBe("test");
    });
  });

  describe("extractSelectVariables", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("extracts variables from SELECT query", () => {
      const query = "SELECT ?name ?email WHERE { ?s ?p ?o }";
      const vars = converter.extractSelectVariables(query);
      expect(vars).toEqual(["name", "email"]);
    });

    it("returns empty array for SELECT *", () => {
      const query = "SELECT * WHERE { ?s ?p ?o }";
      const vars = converter.extractSelectVariables(query);
      expect(vars).toEqual([]);
    });

    it("returns empty array for non-SELECT query", () => {
      const query = "ASK WHERE { ?s ?p ?o }";
      const vars = converter.extractSelectVariables(query);
      expect(vars).toEqual([]);
    });

    it("handles multiple variables with spacing", () => {
      const query = "SELECT ?a  ?b   ?c WHERE { ?s ?p ?o }";
      const vars = converter.extractSelectVariables(query);
      expect(vars).toEqual(["a", "b", "c"]);
    });
  });

  describe("generateSchemaFromQuery", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("generates Zod schema from SELECT query", () => {
      const query = "SELECT ?name ?age WHERE { ?s ?p ?o }";
      const schema = converter.generateSchemaFromQuery(query);
      // All fields default to optional string
      const result = schema.parse({ name: "Alice" });
      expect(result.name).toBe("Alice");
    });

    it("returns empty schema for non-SELECT query", () => {
      const query = "ASK WHERE { ?s ?p ?o }";
      const schema = converter.generateSchemaFromQuery(query);
      const result = schema.parse({});
      expect(result).toEqual({});
    });
  });

  describe("getNode", () => {
    it("creates a NamedNode object", () => {
      const converter = new RDFToZodConverter();
      const node = converter.getNode("http://example.org/Foo");
      expect(node.termType).toBe("NamedNode");
      expect(node.value).toBe("http://example.org/Foo");
    });
  });

  describe("getLocalName", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("extracts local name from hash URI", () => {
      expect(converter.getLocalName("http://example.org#Name")).toBe("Name");
    });

    it("extracts local name from slash URI", () => {
      expect(converter.getLocalName("http://example.org/Name")).toBe("Name");
    });

    it("prefers hash over slash when hash comes later", () => {
      expect(converter.getLocalName("http://example.org/ns#Name")).toBe("Name");
    });
  });

  describe("toPascalCase", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("converts simple string to PascalCase", () => {
      expect(converter.toPascalCase("hello")).toBe("Hello");
    });

    it("converts multi-word string", () => {
      expect(converter.toPascalCase("hello world")).toBe("HelloWorld");
    });

    it("handles already PascalCase", () => {
      expect(converter.toPascalCase("HelloWorld")).toBe("HelloWorld");
    });
  });

  describe("generateTypeScriptTypes", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("generates TypeScript type definitions from schemas", () => {
      const schemas = {
        user: z.object({ name: z.string() }),
        post: z.object({ title: z.string() }),
      };
      const types = converter.generateTypeScriptTypes(schemas);
      expect(types).toContain("export type User");
      expect(types).toContain("export type Post");
    });

    it("returns empty string for empty schemas", () => {
      const types = converter.generateTypeScriptTypes({});
      expect(types).toBe("");
    });
  });

  describe("convertHookResults", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("validates hook results against schema", async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const results = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];
      const validated = await converter.convertHookResults(results, schema);
      expect(validated).toHaveLength(2);
      expect(validated[0].name).toBe("Alice");
    });

    it("includes validation error for invalid results", async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const results = [{ name: "Alice", age: "not-a-number" }];
      const validated = await converter.convertHookResults(results, schema);
      expect(validated).toHaveLength(1);
      expect(validated[0]._validationError).toBeDefined();
    });

    it("handles empty results array", async () => {
      const schema = z.object({ name: z.string() });
      const validated = await converter.convertHookResults([], schema);
      expect(validated).toHaveLength(0);
    });
  });

  describe("getPropertyCardinality", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("returns default cardinality when no restrictions", () => {
      const store = {
        getQuads: vi.fn(() => []),
      };
      const propNode = { value: "http://example.org/prop" };
      const card = converter.getPropertyCardinality(propNode, store);
      expect(card.min).toBe(0);
      expect(card.max).toBe(Infinity);
    });

    it("reads min and max cardinality from store", () => {
      const store = {
        getQuads: vi.fn((subj, pred) => {
          if (pred.includes("minCardinality")) {
            return [{ object: { value: "1" } }];
          }
          if (pred.includes("maxCardinality")) {
            return [{ object: { value: "5" } }];
          }
          return [];
        }),
      };
      const propNode = { value: "http://example.org/prop" };
      const card = converter.getPropertyCardinality(propNode, store);
      expect(card.min).toBe(1);
      expect(card.max).toBe(5);
    });
  });

  describe("getPropertyRange", () => {
    let converter;

    beforeEach(() => {
      converter = new RDFToZodConverter();
    });

    it("returns range from store", () => {
      const rangeNode = { value: XSD + "integer" };
      const store = {
        getQuads: vi.fn(() => [{ object: rangeNode }]),
      };
      const propNode = { value: "http://example.org/prop" };
      const range = converter.getPropertyRange(propNode, store);
      expect(range.value).toBe(XSD + "integer");
    });

    it("defaults to xsd:string when no range", () => {
      const store = {
        getQuads: vi.fn(() => []),
      };
      const propNode = { value: "http://example.org/prop" };
      const range = converter.getPropertyRange(propNode, store);
      expect(range.value).toBe(XSD + "string");
    });
  });
});
