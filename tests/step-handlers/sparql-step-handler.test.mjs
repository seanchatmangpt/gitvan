/**
 * SparqlStepHandler Individual Test
 * Tests the SPARQL step handler in isolation to ensure it properly executes SPARQL queries
 */

import { describe, it, expect } from "vitest";
import { SparqlStepHandler } from "../../src/workflow/step-handlers/sparql-step-handler.mjs";
import { useTurtle } from "../../src/composables/turtle.mjs";
import { useGraph } from "../../src/composables/graph.mjs";
import { withMemFSTestEnvironment } from "../../src/composables/test-environment.mjs";

describe("SparqlStepHandler", () => {
  it("should execute SELECT query and return results", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create test Turtle data
      const turtleContent = `
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project1 rdf:type ex:Project ;
    ex:name "Project Alpha" ;
    ex:status "active" ;
    ex:priority "high" .

ex:project2 rdf:type ex:Project ;
    ex:name "Project Beta" ;
    ex:status "inactive" ;
    ex:priority "medium" .

ex:project3 rdf:type ex:Project ;
    ex:name "Project Gamma" ;
    ex:status "active" ;
    ex:priority "low" .
`;

      // Write to native filesystem for useTurtle
      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");
      const tempDir = await fs.mkdtemp(join(process.cwd(), "test-sparql-"));
      const tempFile = join(tempDir, "test.ttl");
      await fs.writeFile(tempFile, turtleContent, "utf8");

      const turtle = await useTurtle({ graphDir: tempDir });
      const graph = useGraph(turtle.store);

      // Create handler
      const handler = new SparqlStepHandler();

      // Define step
      const step = {
        id: "test-select",
        type: "sparql",
        config: {
          query: `
            SELECT ?project ?name ?status WHERE {
              ?project rdf:type ex:Project .
              ?project ex:name ?name .
              ?project ex:status ?status .
            }
          `,
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { graph });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.type).toBe("select");
      expect(result.data.results).toHaveLength(3);
      expect(result.data.count).toBe(3);

      // Check specific results - convert RDF terms to simple values
      const results = result.data.results.map((row) => ({
        project: row.project.value,
        name: row.name.value,
        status: row.status.value,
      }));
      expect(results).toContainEqual({
        project: "http://example.org/project1",
        name: "Project Alpha",
        status: "active",
      });
      expect(results).toContainEqual({
        project: "http://example.org/project2",
        name: "Project Beta",
        status: "inactive",
      });
      expect(results).toContainEqual({
        project: "http://example.org/project3",
        name: "Project Gamma",
        status: "active",
      });

      // Clean up
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 1000);
    });
  });

  it("should execute ASK query and return boolean result", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create test Turtle data
      const turtleContent = `
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project1 rdf:type ex:Project ;
    ex:name "Project Alpha" ;
    ex:status "active" .
`;

      // Write to native filesystem for useTurtle
      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");
      const tempDir = await fs.mkdtemp(join(process.cwd(), "test-sparql-"));
      const tempFile = join(tempDir, "test.ttl");
      await fs.writeFile(tempFile, turtleContent, "utf8");

      const turtle = await useTurtle({ graphDir: tempDir });
      const graph = useGraph(turtle.store);

      // Create handler
      const handler = new SparqlStepHandler();

      // Define step
      const step = {
        id: "test-ask",
        type: "sparql",
        config: {
          query: `
            ASK WHERE {
              ?project rdf:type ex:Project .
              ?project ex:status "active" .
            }
          `,
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { graph });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.type).toBe("ask");
      expect(result.data.boolean).toBe(true);

      // Clean up
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 1000);
    });
  });

  it("should handle variable replacement in queries", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create test Turtle data
      const turtleContent = `
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project1 rdf:type ex:Project ;
    ex:name "Project Alpha" ;
    ex:status "active" .
`;

      // Write to native filesystem for useTurtle
      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");
      const tempDir = await fs.mkdtemp(join(process.cwd(), "test-sparql-"));
      const tempFile = join(tempDir, "test.ttl");
      await fs.writeFile(tempFile, turtleContent, "utf8");

      const turtle = await useTurtle({ graphDir: tempDir });
      const graph = useGraph(turtle.store);

      // Create handler
      const handler = new SparqlStepHandler();

      // Define step with variables
      const step = {
        id: "test-variables",
        type: "sparql",
        config: {
          query: `
            SELECT ?project ?name WHERE {
              ?project rdf:type ex:Project .
              ?project ex:name ?name .
              ?project ex:status "{{ status }}" .
            }
          `,
        },
      };

      // Execute step with inputs
      const inputs = { status: "active" };
      const result = await handler.execute(step, inputs, { graph });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.type).toBe("select");
      expect(result.data.results).toHaveLength(1);
      expect(result.data.results[0].project.value).toBe(
        "http://example.org/project1"
      );
      expect(result.data.results[0].name.value).toBe("Project Alpha");

      // Clean up
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 1000);
    });
  });

  it("should handle query errors gracefully", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create test Turtle data
      const turtleContent = `
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project1 rdf:type ex:Project .
`;

      // Write to native filesystem for useTurtle
      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");
      const tempDir = await fs.mkdtemp(join(process.cwd(), "test-sparql-"));
      const tempFile = join(tempDir, "test.ttl");
      await fs.writeFile(tempFile, turtleContent, "utf8");

      const turtle = await useTurtle({ graphDir: tempDir });
      const graph = useGraph(turtle.store);

      // Create handler
      const handler = new SparqlStepHandler();

      // Define step with invalid query (syntax error)
      const step = {
        id: "test-error",
        type: "sparql",
        config: {
          query: `
            SELECT ?project WHERE {
              ?project rdf:type ex:Project
              ?project ex:nonexistent ?value .
            }
          `,
        },
      };

      // Execute step - should not throw but return error result
      const result = await handler.execute(step, {}, { graph });

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("SPARQL query execution failed");

      // Clean up
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 1000);
    });
  });

  it("should require graph context", async () => {
    // Create handler
    const handler = new SparqlStepHandler();

    // Define step
    const step = {
      id: "test-no-graph",
      type: "sparql",
      config: {
        query: "SELECT ?s WHERE { ?s ?p ?o }",
      },
    };

    // Execute step without graph context
    await expect(handler.execute(step, {}, {})).rejects.toThrow(
      "SPARQL step requires graph context"
    );
  });
});
