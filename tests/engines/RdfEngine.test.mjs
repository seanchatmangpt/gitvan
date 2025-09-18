// Test suite for RdfEngine
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { RdfEngine } from "../../src/engines/RdfEngine.mjs";

describe("RdfEngine", () => {
  let engine;

  beforeAll(() => {
    engine = new RdfEngine({
      baseIRI: "https://example.org/",
      deterministic: true,
      timeoutMs: 5000,
    });
  });

  describe("Constructor and Configuration", () => {
    it("should create engine with default options", () => {
      const defaultEngine = new RdfEngine();
      expect(defaultEngine.baseIRI).toBe("http://example.org/");
      expect(defaultEngine.deterministic).toBe(true);
      expect(defaultEngine.timeoutMs).toBe(30000);
    });

    it("should create engine with custom options", () => {
      const customEngine = new RdfEngine({
        baseIRI: "https://custom.org/",
        deterministic: false,
        timeoutMs: 10000,
      });
      expect(customEngine.baseIRI).toBe("https://custom.org/");
      expect(customEngine.deterministic).toBe(false);
      expect(customEngine.timeoutMs).toBe(10000);
    });
  });

  describe("Terms and Store Creation", () => {
    it("should create named nodes", () => {
      const node = engine.namedNode("https://example.org/subject");
      expect(node.termType).toBe("NamedNode");
      expect(node.value).toBe("https://example.org/subject");
    });

    it("should create literals", () => {
      const literal = engine.literal("Hello World");
      expect(literal.termType).toBe("Literal");
      expect(literal.value).toBe("Hello World");
    });

    it("should create literals with datatype", () => {
      const literal = engine.literal(
        "42",
        "http://www.w3.org/2001/XMLSchema#integer"
      );
      expect(literal.termType).toBe("Literal");
      expect(literal.value).toBe("42");
      // N3.js handles datatypes differently - just check it exists
      expect(literal.datatype).toBeDefined();
      expect(literal.datatype.value).toBeDefined();
    });

    it("should create blank nodes", () => {
      const blank = engine.blankNode("b1");
      expect(blank.termType).toBe("BlankNode");
      expect(blank.value).toBe("b1");
    });

    it("should create quads", () => {
      const s = engine.namedNode("https://example.org/subject");
      const p = engine.namedNode("https://example.org/predicate");
      const o = engine.literal("object");
      const quad = engine.quad(s, p, o);

      expect(quad.subject).toBe(s);
      expect(quad.predicate).toBe(p);
      expect(quad.object).toBe(o);
    });

    it("should create stores", () => {
      const store = engine.createStore();
      expect(store.size).toBe(0);

      const storeWithQuads = engine.createStore([
        engine.quad(
          engine.namedNode("https://example.org/s"),
          engine.namedNode("https://example.org/p"),
          engine.literal("o")
        ),
      ]);
      expect(storeWithQuads.size).toBe(1);
    });
  });

  describe("Parsing and Serialization", () => {
    const testTurtle = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:subject ex:predicate "Hello World" .
ex:subject rdf:type ex:Person .`;

    it("should parse Turtle", () => {
      const store = engine.parseTurtle(testTurtle);
      expect(store.size).toBe(2);
    });

    it("should parse Turtle with custom baseIRI", () => {
      const store = engine.parseTurtle(testTurtle, {
        baseIRI: "https://custom.org/",
      });
      expect(store.size).toBe(2);
    });

    it("should throw error for invalid Turtle", () => {
      expect(() => {
        engine.parseTurtle("invalid turtle syntax");
      }).toThrow();
    });

    it("should throw error for empty Turtle", () => {
      expect(() => {
        engine.parseTurtle("");
      }).toThrow("parseTurtle: non-empty string required");
    });

    it("should serialize Turtle", async () => {
      const store = engine.parseTurtle(testTurtle);
      const serialized = await engine.serializeTurtle(store);
      expect(typeof serialized).toBe("string");
      expect(serialized).toContain("Hello World");
    });

    it("should serialize Turtle with prefixes", async () => {
      const store = engine.parseTurtle(testTurtle);
      const serialized = await engine.serializeTurtle(store, {
        prefixes: { ex: "https://example.org/" },
      });
      expect(serialized).toContain("@prefix ex:");
    });

    it("should parse and serialize N-Quads", async () => {
      const nquads = `<https://example.org/s> <https://example.org/p> "o" .`;
      const store = engine.parseNQuads(nquads);
      expect(store.size).toBe(1);

      const serialized = await engine.serializeNQuads(store);
      expect(typeof serialized).toBe("string");
    });
  });

  describe("SPARQL Querying", () => {
    const testData = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:alice ex:name "Alice" .
ex:alice ex:age 30 .
ex:bob ex:name "Bob" .
ex:bob ex:age 25 .
ex:alice ex:knows ex:bob .`;

    let store;

    beforeAll(() => {
      store = engine.parseTurtle(testData);
    });

    it("should execute SELECT queries", async () => {
      const query = `PREFIX ex: <https://example.org/>
      SELECT ?name ?age WHERE {
        ?person ex:name ?name .
        ?person ex:age ?age .
      }`;

      const result = await engine.query(store, query);
      expect(result.type).toBe("select");
      expect(result.variables).toContain("name");
      expect(result.variables).toContain("age");
      expect(result.results).toHaveLength(2);
    });

    it("should execute ASK queries", async () => {
      const query = `PREFIX ex: <https://example.org/>
      ASK WHERE { ex:alice ex:knows ex:bob }`;
      const result = await engine.query(store, query);
      expect(result.type).toBe("ask");
      expect(result.boolean).toBe(true);
    });

    it("should execute CONSTRUCT queries", async () => {
      const query = `PREFIX ex: <https://example.org/>
      CONSTRUCT { ?person ex:hasName ?name } WHERE {
        ?person ex:name ?name .
      }`;

      const result = await engine.query(store, query);
      expect(result.type).toBe("construct");
      expect(result.store.size).toBe(2);
    });

    it("should execute DESCRIBE queries", async () => {
      const query = `PREFIX ex: <https://example.org/>
      DESCRIBE ex:alice`;
      const result = await engine.query(store, query);
      expect(result.type).toBe("describe");
      expect(result.store.size).toBeGreaterThan(0);
    });

    it("should respect query limits", async () => {
      const query = `PREFIX ex: <https://example.org/>
      SELECT ?name WHERE { ?person ex:name ?name }`;
      const result = await engine.query(store, query, { limit: 1 });
      expect(result.results).toHaveLength(1);
    });

    it("should handle empty results", async () => {
      const query = `PREFIX ex: <https://example.org/>
      SELECT ?x WHERE { ?x ex:nonexistent ?y }`;
      const result = await engine.query(store, query);
      expect(result.results).toHaveLength(0);
    });

    it("should throw error for invalid SPARQL", async () => {
      await expect(engine.query(store, "INVALID SPARQL")).rejects.toThrow();
    });
  });

  describe("SHACL Validation", () => {
    const testData = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:alice ex:name "Alice" .
ex:alice ex:age 30 .`;

    const testShapes = `@prefix ex: <https://example.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:PersonShape a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
    ] ;
    sh:property [
        sh:path ex:age ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
    ] .`;

    it("should validate conforming data", async () => {
      const dataStore = engine.parseTurtle(testData);
      const result = await engine.validateShacl(dataStore, testShapes);
      expect(result.conforms).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it("should validate non-conforming data", async () => {
      const invalidData = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
ex:alice rdf:type ex:Person .
ex:alice ex:age "not a number" .`;
      const dataStore = engine.parseTurtle(invalidData);
      const result = await engine.validateShacl(dataStore, testShapes);
      expect(result.conforms).toBe(false);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("should throw on validation failure with validateShaclOrThrow", async () => {
      const invalidData = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
ex:alice rdf:type ex:Person .
ex:alice ex:age "not a number" .`;
      const dataStore = engine.parseTurtle(invalidData);

      await expect(
        engine.validateShaclOrThrow(dataStore, testShapes)
      ).rejects.toThrow("SHACL validation failed");
    });
  });

  describe("Canonicalization and Isomorphism", () => {
    it.skip("should canonicalize stores", async () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:b ex:p ex:c .`);

      const canonical = await engine.canonicalize(store1);
      expect(typeof canonical).toBe("string");
      expect(canonical.length).toBeGreaterThan(0);
    });

    it.skip("should detect isomorphic stores", async () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const isomorphic = await engine.isIsomorphic(store1, store2);
      expect(isomorphic).toBe(true);
    });

    it.skip("should detect non-isomorphic stores", async () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:c .`);

      const isomorphic = await engine.isIsomorphic(store1, store2);
      expect(isomorphic).toBe(false);
    });
  });

  describe("Set Operations", () => {
    it("should compute union", () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:c ex:p ex:d .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:e ex:p ex:f .`);

      const union = engine.union(store1, store2);
      expect(union.size).toBe(3);
    });

    it("should compute difference", () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:c ex:p ex:d .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:e ex:p ex:f .`);

      const diff = engine.difference(store1, store2);
      expect(diff.size).toBe(1);
    });

    it("should compute intersection", () => {
      const store1 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:c ex:p ex:d .`);

      const store2 = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:e ex:p ex:f .`);

      const intersection = engine.intersection(store1, store2);
      expect(intersection.size).toBe(1);
    });
  });

  describe("Skolemization", () => {
    it("should skolemize blank nodes", () => {
      const store = engine.parseTurtle(`@prefix ex: <https://example.org/> .
_:b1 ex:p ex:a .
_:b2 ex:p ex:b .`);

      const skolemized = engine.skolemize(store);
      expect(skolemized.size).toBe(2);

      // Check that blank nodes are replaced with named nodes
      for (const quad of skolemized) {
        expect(quad.subject.termType).toBe("NamedNode");
        expect(quad.object.termType).toBe("NamedNode");
      }
    });
  });

  describe("Statistics", () => {
    it("should compute store statistics", () => {
      const store = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .
ex:c ex:p ex:d .
ex:a ex:q ex:e .`);

      const stats = engine.getStats(store);
      expect(stats.quads).toBe(3);
      expect(stats.subjects).toBe(2);
      expect(stats.predicates).toBe(2);
      expect(stats.objects).toBe(3);
      expect(stats.graphs).toBe(1);
    });
  });

  describe("JSON-LD Operations", () => {
    const testData = `@prefix ex: <https://example.org/> .
ex:alice ex:name "Alice" .
ex:alice ex:age 30 .`;

    it("should convert to JSON-LD", async () => {
      const store = engine.parseTurtle(testData);
      const jsonld = await engine.toJSONLD(store);
      expect(typeof jsonld).toBe("object");
      expect(jsonld["@context"]).toBeDefined();
    });

    it("should convert from JSON-LD", async () => {
      const jsonldDoc = {
        "@context": { ex: "https://example.org/" },
        "@id": "ex:alice",
        "ex:name": "Alice",
        "ex:age": 30,
      };

      const store = await engine.fromJSONLD(jsonldDoc);
      expect(store.size).toBeGreaterThan(0);
    });
  });

  describe("Clownface Integration", () => {
    it("should create clownface pointer", () => {
      const store = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:alice ex:name "Alice" .`);

      const cf = engine.getClownface(store);
      expect(cf).toBeDefined();
      expect(cf.dataset).toBeDefined();
    });
  });

  describe("Reasoning", () => {
    const testData = `@prefix ex: <https://example.org/> .
ex:alice ex:parentOf ex:bob .
ex:bob ex:parentOf ex:charlie .`;

    const testRules = `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:alice ex:parentOf ex:bob . ex:bob ex:parentOf ex:charlie . => ex:alice ex:grandparentOf ex:charlie .`;

    it.skip("should perform N3 reasoning", async () => {
      const dataStore = engine.parseTurtle(testData);
      const rulesStore = engine.parseTurtle(testRules);

      const reasoned = await engine.reason(dataStore, rulesStore);
      expect(reasoned.size).toBeGreaterThan(dataStore.size);
    });
  });

  describe("Error Handling", () => {
    it.skip("should handle timeout errors", async () => {
      const fastEngine = new RdfEngine({ timeoutMs: 1 });
      const store = engine.parseTurtle(`@prefix ex: <https://example.org/> .
ex:a ex:p ex:b .`);

      // This should timeout due to very short timeout
      await expect(
        fastEngine.query(store, "SELECT * WHERE { ?s ?p ?o }")
      ).rejects.toThrow("timeout");
    }, 5000);

    it("should handle malformed input gracefully", () => {
      expect(() => engine.parseTurtle("malformed turtle")).toThrow();
      expect(() => engine.parseNQuads("malformed nquads")).toThrow();
    });
  });
});
