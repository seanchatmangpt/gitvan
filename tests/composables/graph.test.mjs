// Test suite for useGraph composable
import { describe, it, expect, beforeAll } from "vitest";
import { useGraph } from "../../src/composables/graph.mjs";
import { RdfEngine } from "../../src/engines/RdfEngine.mjs";

describe("useGraph", () => {
  let engine;
  let testStore;

  beforeAll(() => {
    engine = new RdfEngine({
      baseIRI: "https://example.org/",
      deterministic: true,
      timeoutMs: 5000,
    });

    // Create test data
    const testTurtle = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice rdf:type foaf:Person ;
    foaf:name "Alice" ;
    foaf:age 30 ;
    foaf:knows ex:bob .

ex:bob rdf:type foaf:Person ;
    foaf:name "Bob" ;
    foaf:age 25 .

ex:charlie rdf:type foaf:Person ;
    foaf:name "Charlie" ;
    foaf:age 35 ;
    foaf:knows ex:alice .`;

    testStore = engine.parseTurtle(testTurtle);
  });

  describe("Constructor and Basic Properties", () => {
    it("should create a useGraph instance", () => {
      const graph = useGraph(testStore);
      expect(graph).toBeDefined();
      expect(graph.store).toBe(testStore);
      expect(graph.engine).toBeDefined();
    });

    it("should throw error for invalid store", () => {
      expect(() => useGraph(null)).toThrow(
        "An N3.Store instance must be provided"
      );
      expect(() => useGraph({})).toThrow(
        "An N3.Store instance must be provided"
      );
    });

    it("should expose store and engine properties", () => {
      const graph = useGraph(testStore);
      expect(graph.store).toBe(testStore);
      expect(graph.engine).toBeInstanceOf(RdfEngine);
    });

    it("should provide stats", () => {
      const graph = useGraph(testStore);
      const stats = graph.stats;
      expect(stats.quads).toBeGreaterThan(0);
      expect(stats.subjects).toBeGreaterThan(0);
      expect(stats.predicates).toBeGreaterThan(0);
      expect(stats.objects).toBeGreaterThan(0);
      expect(stats.graphs).toBeGreaterThan(0);
    });
  });

  describe("SPARQL Querying", () => {
    it("should execute SELECT queries", async () => {
      const graph = useGraph(testStore);
      const query = `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      SELECT ?name ?age WHERE {
        ?person foaf:name ?name .
        ?person foaf:age ?age .
      }`;

      const results = await graph.select(query);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("name");
      expect(results[0]).toHaveProperty("age");
    });

    it("should execute ASK queries", async () => {
      const graph = useGraph(testStore);
      const query = `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      ASK WHERE { ?person foaf:name "Alice" }`;

      const result = await graph.ask(query);
      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });

    it("should execute general queries", async () => {
      const graph = useGraph(testStore);
      const query = `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      SELECT ?name WHERE { ?person foaf:name ?name }`;

      const result = await graph.query(query);
      expect(result.type).toBe("select");
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it("should throw error for wrong query type in select", async () => {
      const graph = useGraph(testStore);
      const query = `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      ASK WHERE { ?person foaf:name "Alice" }`;

      await expect(graph.select(query)).rejects.toThrow(
        "Query is not a SELECT query"
      );
    });

    it("should throw error for wrong query type in ask", async () => {
      const graph = useGraph(testStore);
      const query = `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      SELECT ?name WHERE { ?person foaf:name ?name }`;

      await expect(graph.ask(query)).rejects.toThrow(
        "Query is not an ASK query"
      );
    });
  });

  describe("SHACL Validation", () => {
    const testShapes = `@prefix ex: <https://example.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:PersonShape a sh:NodeShape ;
    sh:targetClass foaf:Person ;
    sh:property [
        sh:path foaf:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
    ] ;
    sh:property [
        sh:path foaf:age ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
    ] .`;

    it("should validate conforming data", async () => {
      const graph = useGraph(testStore);
      const result = await graph.validate(testShapes);
      expect(result.conforms).toBe(true);
      expect(result.results).toBeDefined();
    });

    it("should validate non-conforming data", async () => {
      const invalidStore =
        engine.parseTurtle(`@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
ex:alice rdf:type foaf:Person .
ex:alice foaf:age "not a number" .`);

      const graph = useGraph(invalidStore);
      const result = await graph.validate(testShapes);
      expect(result.conforms).toBe(false);
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe("Serialization", () => {
    it("should serialize to Turtle", async () => {
      const graph = useGraph(testStore);
      const turtle = await graph.serialize({ format: "Turtle" });
      expect(typeof turtle).toBe("string");
      expect(turtle).toContain("Alice");
      expect(turtle).toContain("Bob");
    });

    it("should serialize to Turtle with prefixes", async () => {
      const graph = useGraph(testStore);
      const turtle = await graph.serialize({
        format: "Turtle",
        prefixes: { foaf: "http://xmlns.com/foaf/0.1/" },
      });
      expect(typeof turtle).toBe("string");
      expect(turtle).toContain("@prefix foaf:");
    });

    it("should serialize to N-Quads", async () => {
      const graph = useGraph(testStore);
      const nquads = await graph.serialize({ format: "N-Quads" });
      expect(typeof nquads).toBe("string");
      expect(nquads).toContain("Alice");
    });

    it("should throw error for unsupported format", async () => {
      const graph = useGraph(testStore);
      await expect(graph.serialize({ format: "JSON-LD" })).rejects.toThrow(
        "Unsupported serialization format: JSON-LD"
      );
    });
  });

  describe("Clownface Integration", () => {
    it("should create clownface pointer", () => {
      const graph = useGraph(testStore);
      const pointer = graph.pointer();
      expect(pointer).toBeDefined();
      expect(pointer.dataset).toBeDefined();
    });

    it("should allow clownface traversal", () => {
      const graph = useGraph(testStore);
      const pointer = graph.pointer();

      // Test basic traversal
      const alice = pointer.node("https://example.org/alice");
      expect(alice).toBeDefined();

      // Test property access
      const names = alice.out("http://xmlns.com/foaf/0.1/name");
      expect(names).toBeDefined();
    });
  });

  describe("Set Operations", () => {
    let graph1, graph2;

    beforeAll(() => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:c ex:p ex:d .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:e ex:p ex:f .`);

      graph1 = useGraph(store1);
      graph2 = useGraph(store2);
    });

    it("should compute union", () => {
      const union = graph1.union(graph2);
      expect(union.stats.quads).toBe(3); // 2 + 2 - 1 duplicate = 3
    });

    it("should compute difference", () => {
      const diff = graph1.difference(graph2);
      expect(diff.stats.quads).toBe(1); // Only ex:c ex:p ex:d
    });

    it("should compute intersection", () => {
      const intersection = graph1.intersection(graph2);
      expect(intersection.stats.quads).toBe(1); // Only ex:a ex:p ex:b
    });

    it("should work with raw stores", () => {
      const store3 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:x ex:p ex:y .`);

      const union = graph1.union(store3);
      expect(union.stats.quads).toBe(3); // 2 + 1 = 3
    });
  });

  describe("Isomorphism", () => {
    it.skip("should detect isomorphic graphs", async () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const graph1 = useGraph(store1);
      const graph2 = useGraph(store2);

      const isomorphic = await graph1.isIsomorphic(graph2);
      expect(isomorphic).toBe(true);
    });

    it.skip("should detect non-isomorphic graphs", async () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:c .`);

      const graph1 = useGraph(store1);
      const graph2 = useGraph(store2);

      const isomorphic = await graph1.isIsomorphic(graph2);
      expect(isomorphic).toBe(false);
    });

    it.skip("should work with raw stores", async () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const graph1 = useGraph(store1);
      const isomorphic = await graph1.isIsomorphic(store2);
      expect(isomorphic).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed SPARQL gracefully", async () => {
      const graph = useGraph(testStore);
      await expect(graph.query("INVALID SPARQL")).rejects.toThrow();
    });

    it("should handle empty queries", async () => {
      const graph = useGraph(testStore);
      await expect(graph.query("")).rejects.toThrow();
    });
  });
});
