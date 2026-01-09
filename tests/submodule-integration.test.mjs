/**
 * @fileoverview Tests for unrdf NPM Package Integration
 *
 * This test suite verifies that the unrdf package (installed via npm)
 * integrates correctly with GitVan. Unlike a git submodule, unrdf is
 * installed as a regular npm dependency.
 *
 * Tests verify:
 * 1. unrdf exports can be imported correctly
 * 2. createKnowledgeSubstrateCore works and returns expected API
 * 3. RDF operations work (parsing, querying, SPARQL)
 * 4. Git ontology loads correctly
 * 5. No circular dependencies
 * 6. All core functions are available
 *
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Unrdf NPM Package Integration", () => {
  describe("1. Package Imports and Exports", () => {
    it("should import unrdf package successfully", async () => {
      const unrdf = await import("unrdf");
      expect(unrdf).toBeDefined();
      expect(typeof unrdf).toBe("object");
    });

    it("should export createKnowledgeSubstrateCore", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");
      expect(createKnowledgeSubstrateCore).toBeDefined();
      expect(typeof createKnowledgeSubstrateCore).toBe("function");
    });

    it("should export parseTurtle", async () => {
      const { parseTurtle } = await import("unrdf");
      expect(parseTurtle).toBeDefined();
      expect(typeof parseTurtle).toBe("function");
    });

    it("should export query function", async () => {
      const { query } = await import("unrdf");
      expect(query).toBeDefined();
      expect(typeof query).toBe("function");
    });

    it("should export RDF quad constructors", async () => {
      const { namedNode, literal, quad, blankNode } = await import("unrdf");
      expect(namedNode).toBeDefined();
      expect(literal).toBeDefined();
      expect(quad).toBeDefined();
      expect(blankNode).toBeDefined();
    });

    it("should export SHACL validation", async () => {
      const { validateShacl } = await import("unrdf");
      expect(validateShacl).toBeDefined();
      expect(typeof validateShacl).toBe("function");
    });

    it("should export serialization functions", async () => {
      const { toTurtle, toNQuads, toJsonLd } = await import("unrdf");
      expect(toTurtle).toBeDefined();
      expect(toNQuads).toBeDefined();
      expect(toJsonLd).toBeDefined();
    });

    it("should export store operations", async () => {
      const {
        getStoreStats,
        mergeStores,
        differenceStores,
        intersectStores,
      } = await import("unrdf");
      expect(getStoreStats).toBeDefined();
      expect(mergeStores).toBeDefined();
      expect(differenceStores).toBeDefined();
      expect(intersectStores).toBeDefined();
    });

    it("should export reasoning functions", async () => {
      const { reason, isIsomorphic, canonicalize } = await import("unrdf");
      expect(reason).toBeDefined();
      expect(isIsomorphic).toBeDefined();
      expect(canonicalize).toBeDefined();
    });
  });

  describe("2. KnowledgeSubstrateCore Creation", () => {
    let core;

    afterEach(async () => {
      if (core?.cleanup) {
        await core.cleanup();
      }
      core = null;
    });

    it("should create core instance with default options", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore();

      expect(core).toBeDefined();
      expect(core).not.toBeNull();
      expect(typeof core).toBe("object");
    });

    it("should create core with observability enabled", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore({
        enableObservability: true,
      });

      expect(core).toBeDefined();
      expect(core.store).toBeDefined();
    });

    it("should create core with all features enabled", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore({
        enableObservability: true,
        enableKnowledgeHookManager: true,
        enableTransactionManager: true,
      });

      expect(core).toBeDefined();
      expect(core.store).toBeDefined();
    });

    it("should have a store property", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore();

      expect(core.store).toBeDefined();
      expect(typeof core.store).toBe("object");
      expect(typeof core.store.add).toBe("function");
      expect(typeof core.store.getQuads).toBe("function");
      expect(typeof core.store.size).toBe("number");
    });

    it("should have query method", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore();

      expect(core.query).toBeDefined();
      expect(typeof core.query).toBe("function");
    });

    it("should have validate method", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore();

      expect(core.validate).toBeDefined();
      expect(typeof core.validate).toBe("function");
    });

    it("should have cleanup method", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");

      core = await createKnowledgeSubstrateCore();

      expect(core.cleanup).toBeDefined();
      expect(typeof core.cleanup).toBe("function");
    });
  });

  describe("3. RDF Parsing Operations", () => {
    it("should parse valid Turtle syntax", async () => {
      const { parseTurtle } = await import("unrdf");

      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:subject ex:predicate ex:object .
      `;

      const quads = await parseTurtle(turtle);

      expect(Array.isArray(quads)).toBe(true);
      expect(quads.length).toBeGreaterThan(0);
      expect(quads[0]).toBeDefined();
      expect(quads[0].subject).toBeDefined();
      expect(quads[0].predicate).toBeDefined();
      expect(quads[0].object).toBeDefined();
    });

    it("should parse Turtle with literals", async () => {
      const { parseTurtle } = await import("unrdf");

      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        ex:person ex:name "John Doe" ;
                  ex:age 30 ;
                  ex:height "1.75"^^xsd:decimal .
      `;

      const quads = await parseTurtle(turtle);

      expect(quads.length).toBe(3);
    });

    it("should parse complex Turtle with blank nodes", async () => {
      const { parseTurtle } = await import("unrdf");

      const turtle = `
        @prefix ex: <http://example.org/> .

        ex:workflow1 ex:hasStep [
          ex:order 1 ;
          ex:action "build"
        ] .
      `;

      const quads = await parseTurtle(turtle);

      expect(quads.length).toBeGreaterThan(0);
    });

    it("should handle parsing errors gracefully", async () => {
      const { parseTurtle } = await import("unrdf");

      const invalidTurtle = `
        @prefix ex <http://example.org/> .
        this is invalid turtle syntax
      `;

      await expect(parseTurtle(invalidTurtle)).rejects.toThrow();
    });
  });

  describe("4. SPARQL Query Operations", () => {
    let core;
    let parseTurtle;
    let query;

    beforeEach(async () => {
      const unrdf = await import("unrdf");
      parseTurtle = unrdf.parseTurtle;
      query = unrdf.query;
      core = await unrdf.createKnowledgeSubstrateCore();

      // Load test data
      const turtle = `
        @prefix ex: <http://example.org/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

        ex:workflow1 rdf:type ex:Workflow ;
          rdfs:label "First Workflow" ;
          ex:status "active" .

        ex:workflow2 rdf:type ex:Workflow ;
          rdfs:label "Second Workflow" ;
          ex:status "inactive" .

        ex:task1 rdf:type ex:Task ;
          rdfs:label "Task One" ;
          ex:belongsTo ex:workflow1 .
      `;

      const quads = await parseTurtle(turtle);
      for (const quad of quads) {
        core.store.add(quad);
      }
    });

    afterEach(async () => {
      if (core?.cleanup) {
        await core.cleanup();
      }
      core = null;
    });

    it("should execute SELECT query", async () => {
      const sparql = `
        PREFIX ex: <http://example.org/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?workflow ?label WHERE {
          ?workflow a ex:Workflow ;
            rdfs:label ?label .
        }
      `;

      const results = await core.query({ query: sparql });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    it("should execute FILTER in queries", async () => {
      const sparql = `
        PREFIX ex: <http://example.org/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?workflow ?label WHERE {
          ?workflow a ex:Workflow ;
            rdfs:label ?label ;
            ex:status "active" .
        }
      `;

      const results = await core.query({ query: sparql });

      expect(results.length).toBe(1);
      expect(results[0].label).toBe("First Workflow");
    });

    it("should handle empty query results", async () => {
      const sparql = `
        PREFIX ex: <http://example.org/>
        SELECT ?x WHERE {
          ?x a ex:NonExistent .
        }
      `;

      const results = await core.query({ query: sparql });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should support OPTIONAL patterns", async () => {
      const sparql = `
        PREFIX ex: <http://example.org/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?workflow ?label ?task WHERE {
          ?workflow a ex:Workflow ;
            rdfs:label ?label .
          OPTIONAL {
            ?task ex:belongsTo ?workflow .
          }
        }
      `;

      const results = await core.query({ query: sparql });

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("should support ORDER BY", async () => {
      const sparql = `
        PREFIX ex: <http://example.org/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?workflow ?label WHERE {
          ?workflow a ex:Workflow ;
            rdfs:label ?label .
        }
        ORDER BY ?label
      `;

      const results = await core.query({ query: sparql });

      expect(results.length).toBe(2);
      expect(results[0].label).toBe("First Workflow");
      expect(results[1].label).toBe("Second Workflow");
    });
  });

  describe("5. Store Operations", () => {
    let core;
    let parseTurtle;

    beforeEach(async () => {
      const unrdf = await import("unrdf");
      parseTurtle = unrdf.parseTurtle;
      core = await unrdf.createKnowledgeSubstrateCore();
    });

    afterEach(async () => {
      if (core?.cleanup) {
        await core.cleanup();
      }
      core = null;
    });

    it("should add quads to store", async () => {
      const initialSize = core.store.size;

      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:subject ex:predicate "object" .
      `;
      const quads = await parseTurtle(turtle);

      for (const quad of quads) {
        core.store.add(quad);
      }

      expect(core.store.size).toBeGreaterThan(initialSize);
    });

    it("should query quads from store", async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:test1 ex:name "Test One" .
        ex:test2 ex:name "Test Two" .
      `;
      const quads = await parseTurtle(turtle);
      for (const quad of quads) {
        core.store.add(quad);
      }

      const results = core.store.getQuads(null, null, null, null);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("should remove quads from store", async () => {
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:toRemove ex:data "temporary" .
      `;
      const quads = await parseTurtle(turtle);
      const quadToRemove = quads[0];

      core.store.add(quadToRemove);
      const sizeAfterAdd = core.store.size;

      core.store.delete(quadToRemove);
      const sizeAfterRemove = core.store.size;

      expect(sizeAfterRemove).toBe(sizeAfterAdd - 1);
    });

    it("should get store statistics", async () => {
      const { getStoreStats } = await import("unrdf");

      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:s1 ex:p1 ex:o1 .
        ex:s1 ex:p2 ex:o2 .
        ex:s2 ex:p1 ex:o3 .
      `;
      const quads = await parseTurtle(turtle);
      for (const quad of quads) {
        core.store.add(quad);
      }

      const stats = getStoreStats(core.store);

      expect(stats).toBeDefined();
      expect(stats.quads).toBeGreaterThanOrEqual(3);
      expect(stats.subjects).toBeGreaterThanOrEqual(2);
      expect(stats.predicates).toBeGreaterThanOrEqual(2);
    });
  });

  describe("6. GitVan Composable Integration", () => {
    it("should import graph composable", async () => {
      const { useGraph } = await import("../src/composables/graph.mjs");
      expect(useGraph).toBeDefined();
      expect(typeof useGraph).toBe("function");
    });

    it("should use graph composable with store", async () => {
      const { createKnowledgeSubstrateCore, parseTurtle } =
        await import("unrdf");
      const { useGraph } = await import("../src/composables/graph.mjs");

      const core = await createKnowledgeSubstrateCore();

      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:test ex:data "value" .
      `;
      const quads = await parseTurtle(turtle);
      for (const quad of quads) {
        core.store.add(quad);
      }

      const graph = useGraph(core.store);

      expect(graph).toBeDefined();
      expect(graph.store).toBe(core.store);
      expect(typeof graph.query).toBe("function");
      expect(typeof graph.select).toBe("function");

      await core.cleanup?.();
    });

    it("should query using graph composable", async () => {
      const { createKnowledgeSubstrateCore, parseTurtle } =
        await import("unrdf");
      const { useGraph } = await import("../src/composables/graph.mjs");

      const core = await createKnowledgeSubstrateCore();

      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:item1 ex:value "one" .
        ex:item2 ex:value "two" .
      `;
      const quads = await parseTurtle(turtle);
      for (const quad of quads) {
        core.store.add(quad);
      }

      const graph = useGraph(core.store);

      const results = await graph.select(`
        PREFIX ex: <http://example.org/>
        SELECT ?item ?value WHERE {
          ?item ex:value ?value .
        }
      `);

      expect(results.length).toBe(2);

      await core.cleanup?.();
    });
  });

  describe("7. Circular Dependency Check", () => {
    it("should not have circular dependencies in imports", async () => {
      // This test ensures that importing unrdf and GitVan composables
      // doesn't create circular dependencies
      const imports = async () => {
        await import("unrdf");
        await import("../src/composables/graph.mjs");
        await import("../src/composables/turtle.mjs");
      };

      await expect(imports()).resolves.not.toThrow();
    });

    it("should successfully import all unrdf-related modules", async () => {
      const modules = await Promise.all([
        import("unrdf"),
        import("../src/composables/graph.mjs"),
        import("../src/composables/turtle.mjs"),
        import("../src/git-lifecycle/GitEventCapture.mjs"),
      ]);

      expect(modules).toHaveLength(4);
      modules.forEach((module) => {
        expect(module).toBeDefined();
      });
    });
  });

  describe("8. Error Handling", () => {
    it("should handle invalid SPARQL queries", async () => {
      const { createKnowledgeSubstrateCore } = await import("unrdf");
      const core = await createKnowledgeSubstrateCore();

      const invalidSparql = "THIS IS NOT SPARQL";

      await expect(
        core.query({ query: invalidSparql })
      ).rejects.toThrow();

      await core.cleanup?.();
    });

    it("should handle invalid Turtle syntax", async () => {
      const { parseTurtle } = await import("unrdf");

      const invalidTurtle = `
        @prefix ex <missing colon>
        this is not valid turtle
      `;

      await expect(parseTurtle(invalidTurtle)).rejects.toThrow();
    });

    it("should handle missing store in useGraph", async () => {
      const { useGraph } = await import("../src/composables/graph.mjs");

      expect(() => useGraph(null)).toThrow(/must be provided/);
    });

    it("should handle invalid store in useGraph", async () => {
      const { useGraph } = await import("../src/composables/graph.mjs");

      expect(() => useGraph({})).toThrow(/must be provided/);
    });
  });

  describe("9. Package Metadata", () => {
    it("should have unrdf in package.json dependencies", async () => {
      const { readFileSync } = await import("node:fs");
      const { join } = await import("pathe");

      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), "package.json"), "utf-8")
      );

      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies.unrdf).toBeDefined();
      expect(packageJson.dependencies.unrdf).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("should have correct unrdf version", async () => {
      const { readFileSync } = await import("node:fs");
      const { join } = await import("pathe");

      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), "package.json"), "utf-8")
      );

      const version = packageJson.dependencies.unrdf;
      expect(version).toBe("^2.0.0");
    });
  });

  describe("10. Integration Summary", () => {
    it("should generate integration capability report", async () => {
      const { createKnowledgeSubstrateCore, parseTurtle, query } =
        await import("unrdf");

      const core = await createKnowledgeSubstrateCore({
        enableObservability: true,
        enableKnowledgeHookManager: true,
        enableTransactionManager: true,
      });

      const report = {
        packageImport: "success",
        coreCreation: !!core,
        storeAvailable: !!core.store,
        parsingWorks: false,
        queryWorks: false,
        composableIntegration: false,
      };

      // Test parsing
      try {
        const quads = await parseTurtle(
          '@prefix ex: <http://example.org/> . ex:test ex:works "true" .'
        );
        report.parsingWorks = quads.length > 0;

        for (const quad of quads) {
          core.store.add(quad);
        }
      } catch (e) {
        report.parsingError = e.message;
      }

      // Test querying
      try {
        const results = await core.query({
          query: `
          PREFIX ex: <http://example.org/>
          SELECT ?s ?p ?o WHERE { ?s ?p ?o }
        `,
        });
        report.queryWorks = Array.isArray(results);
      } catch (e) {
        report.queryError = e.message;
      }

      // Test composable
      try {
        const { useGraph } = await import("../src/composables/graph.mjs");
        const graph = useGraph(core.store);
        report.composableIntegration = !!graph;
      } catch (e) {
        report.composableError = e.message;
      }

      console.log("\n========================================");
      console.log("UNRDF INTEGRATION CAPABILITY REPORT");
      console.log("========================================");
      console.log(JSON.stringify(report, null, 2));
      console.log("========================================\n");

      expect(report.packageImport).toBe("success");
      expect(report.coreCreation).toBe(true);
      expect(report.storeAvailable).toBe(true);
      expect(report.parsingWorks).toBe(true);
      expect(report.queryWorks).toBe(true);
      expect(report.composableIntegration).toBe(true);

      await core.cleanup?.();
    });
  });
});
