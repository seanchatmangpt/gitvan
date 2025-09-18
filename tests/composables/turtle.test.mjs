// Test suite for useTurtle composable
import { describe, it, expect, beforeAll } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useTurtle } from "../../src/composables/turtle.mjs";

describe("useTurtle", () => {
  let testDir;
  let turtle;

  beforeAll(async () => {
    // Create test directory structure
    testDir = join(process.cwd(), "tests", "turtle-test-data");
    await mkdir(testDir, { recursive: true });

    // Create test turtle files
    const testData1 = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix op: <https://gitvan.dev/op#> .

# Test Hook
<https://example.org/hook1> a gh:Hook ;
    dct:title "Test Hook" ;
    gh:hasPredicate <https://example.org/predicate1> ;
    gh:orderedPipelines _:pipelineList1 .

# Pipeline list
_:pipelineList1 rdf:first <https://example.org/pipeline1> ;
    rdf:rest rdf:nil .

# Pipeline
<https://example.org/pipeline1> a op:Pipeline ;
    op:steps _:stepsList1 .

# Steps list
_:stepsList1 rdf:first <https://example.org/step1> ;
    rdf:rest _:stepsList2 .

_:stepsList2 rdf:first <https://example.org/step2> ;
    rdf:rest rdf:nil .

# Query with inline text
<https://example.org/query1> a gv:Query ;
    gv:text "SELECT ?s ?p ?o WHERE { ?s ?p ?o }" .

# Query with path
<https://example.org/query2> a gv:Query ;
    gv:path "${testDir}/queries/test.sparql" .

# Template with inline text
<https://example.org/template1> a gv:Template ;
    gv:text "Hello {{ name }}!" .

# Template with path
<https://example.org/template2> a gv:Template ;
    gv:path "${testDir}/templates/test.njk" .

# Simple subject with properties
<https://example.org/subject1> a gv:Record ;
    dct:title "Test Subject" ;
    gv:value "test value" ;
    gv:number 42 .

# Subject with multiple values
<https://example.org/subject2> a gv:Record ;
    gv:tag "tag1" ;
    gv:tag "tag2" ;
    gv:tag "tag3" .`;

    const testData2 = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

# Another hook
<https://example.org/hook2> a gh:Hook ;
    gh:hasPredicate <https://example.org/predicate2> .`;

    await writeFile(join(testDir, "test1.ttl"), testData1);
    await writeFile(join(testDir, "test2.ttl"), testData2);

    // Create test files for URI resolution
    await mkdir(join(testDir, "queries"), { recursive: true });
    await mkdir(join(testDir, "templates"), { recursive: true });

    await writeFile(
      join(testDir, "queries", "test.sparql"),
      "SELECT * WHERE { ?s ?p ?o }"
    );
    await writeFile(
      join(testDir, "templates", "test.njk"),
      "Template content: {{ data }}"
    );

    // Initialize turtle composable
    turtle = await useTurtle({ graphDir: testDir });
  });

  describe("Basic functionality", () => {
    it("should load turtle files from directory", () => {
      expect(turtle.files).toHaveLength(2);
      expect(turtle.files.map((f) => f.name)).toEqual([
        "test1.ttl",
        "test2.ttl",
      ]);
    });

    it("should have a store with parsed data", () => {
      expect(turtle.store).toBeDefined();
      expect(turtle.store.size).toBeGreaterThan(0);
    });

    it("should expose configuration", () => {
      expect(turtle.config).toBeDefined();
      expect(turtle.config.graphDir).toBe(testDir);
      expect(turtle.config.uriRoots).toBeDefined();
      expect(turtle.config.autoLoad).toBe(true);
      expect(turtle.config.validateOnLoad).toBe(false);
    });

    it("should provide configuration access methods", () => {
      expect(turtle.getGraphDir()).toBe(testDir);
      expect(turtle.getUriRoots()).toBeDefined();
      expect(turtle.isAutoLoadEnabled()).toBe(true);
      expect(turtle.isValidationEnabled()).toBe(false);
    });
  });

  describe("isA method", () => {
    it("should correctly identify rdf:type relationships", () => {
      expect(
        turtle.isA(
          "https://example.org/hook1",
          "https://gitvan.dev/graph-hook#Hook"
        )
      ).toBe(true);
      expect(
        turtle.isA(
          "https://example.org/hook2",
          "https://gitvan.dev/graph-hook#Hook"
        )
      ).toBe(true);
      expect(
        turtle.isA(
          "https://example.org/subject1",
          "https://gitvan.dev/ontology#Record"
        )
      ).toBe(true);
      expect(
        turtle.isA(
          "https://example.org/hook1",
          "https://gitvan.dev/ontology#Record"
        )
      ).toBe(false);
    });
  });

  describe("getOne method", () => {
    it("should return single object for subject-predicate pair", () => {
      const title = turtle.getOne(
        "https://example.org/hook1",
        "http://purl.org/dc/terms/title"
      );
      expect(title).toBeDefined();
      expect(title.value).toBe("Test Hook");
    });

    it("should return undefined for non-existent relationships", () => {
      const result = turtle.getOne(
        "https://example.org/nonexistent",
        "http://example.org/predicate"
      );
      expect(result).toBeUndefined();
    });
  });

  describe("getAll method", () => {
    it("should return all objects for subject-predicate pair", () => {
      const tags = turtle.getAll(
        "https://example.org/subject2",
        "https://gitvan.dev/ontology#tag"
      );
      expect(tags).toHaveLength(3);
      expect(tags.map((t) => t.value)).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should return empty array for non-existent relationships", () => {
      const result = turtle.getAll(
        "https://example.org/nonexistent",
        "http://example.org/predicate"
      );
      expect(result).toEqual([]);
    });
  });

  describe("getHooks method", () => {
    it("should find all Hook instances", () => {
      const hooks = turtle.getHooks();
      expect(hooks).toHaveLength(2);

      const hook1 = hooks.find((h) => h.id === "https://example.org/hook1");
      expect(hook1).toBeDefined();
      expect(hook1.title).toBe("Test Hook");
      expect(hook1.pred).toBeDefined();
      expect(hook1.pipelines).toHaveLength(1);

      const hook2 = hooks.find((h) => h.id === "https://example.org/hook2");
      expect(hook2).toBeDefined();
      expect(hook2.title).toBe("https://example.org/hook2"); // fallback to id
      expect(hook2.pipelines).toHaveLength(0);
    });
  });

  describe("getPipelineSteps method", () => {
    it("should extract steps from pipeline", () => {
      const steps = turtle.getPipelineSteps("https://example.org/pipeline1");
      expect(steps).toHaveLength(2);
      expect(steps[0].value).toBe("https://example.org/step1");
      expect(steps[1].value).toBe("https://example.org/step2");
    });

    it("should return empty array for pipeline without steps", () => {
      const steps = turtle.getPipelineSteps("https://example.org/nonexistent");
      expect(steps).toEqual([]);
    });
  });

  describe("resolveText method", () => {
    it("should resolve graph:// URIs to file content", async () => {
      const content = await turtle.resolveText(
        `${testDir}/queries/test.sparql`
      );
      expect(content).toBe("SELECT * WHERE { ?s ?p ?o }");
    });

    it("should resolve custom URI roots", async () => {
      const customTurtle = await useTurtle({
        graphDir: testDir,
        uriRoots: { "custom://": join(testDir, "templates/") },
      });

      const content = await customTurtle.resolveText("custom://test.njk");
      expect(content).toBe("Template content: {{ data }}");
    });

    it("should return non-string input as-is", async () => {
      const result = await turtle.resolveText(42);
      expect(result).toBe(42);
    });

    it("should return string as-is if no prefix matches", async () => {
      const result = await turtle.resolveText("https://example.org/some-uri");
      expect(result).toBe("https://example.org/some-uri");
    });
  });

  describe("getQueryText method", () => {
    it("should extract inline query text", async () => {
      const text = await turtle.getQueryText("https://example.org/query1");
      expect(text).toBe("SELECT ?s ?p ?o WHERE { ?s ?p ?o }");
    });

    it("should resolve query text from path", async () => {
      const text = await turtle.getQueryText("https://example.org/query2");
      expect(text).toBe("SELECT * WHERE { ?s ?p ?o }");
    });

    it("should return empty string for non-existent query", async () => {
      const text = await turtle.getQueryText("https://example.org/nonexistent");
      expect(text).toBe("");
    });
  });

  describe("getTemplateText method", () => {
    it("should extract inline template text", async () => {
      const text = await turtle.getTemplateText(
        "https://example.org/template1"
      );
      expect(text).toBe("Hello {{ name }}!");
    });

    it("should resolve template text from path", async () => {
      const text = await turtle.getTemplateText(
        "https://example.org/template2"
      );
      expect(text).toBe("Template content: {{ data }}");
    });

    it("should return empty string for non-existent template", async () => {
      const text = await turtle.getTemplateText(
        "https://example.org/nonexistent"
      );
      expect(text).toBe("");
    });
  });

  describe("Configuration integration", () => {
    it("should respect options over config", async () => {
      const customDir = join(testDir, "custom");
      await mkdir(customDir, { recursive: true });

      const customTurtle = await useTurtle({
        graphDir: customDir,
        uriRoots: { "custom://": join(testDir, "templates/") },
      });

      expect(customTurtle.getGraphDir()).toBe(customDir);
      expect(customTurtle.getUriRoots()["custom://"]).toBe(
        join(testDir, "templates/")
      );
    });

    it("should merge URI roots with defaults", async () => {
      const customTurtle = await useTurtle({
        graphDir: testDir,
        uriRoots: { "custom://": join(testDir, "custom/") },
      });

      const uriRoots = customTurtle.getUriRoots();
      expect(uriRoots["graph://"]).toBeDefined(); // Should have default
      expect(uriRoots["custom://"]).toBe(join(testDir, "custom/")); // Should have custom
    });
  });

  describe("Edge cases", () => {
    it("should handle empty graph directory", async () => {
      const emptyDir = join(testDir, "empty");
      await mkdir(emptyDir, { recursive: true });

      const emptyTurtle = await useTurtle({ graphDir: emptyDir });
      expect(emptyTurtle.files).toEqual([]);
      expect(emptyTurtle.store.size).toBe(0);
    });

    it("should handle malformed turtle files gracefully", async () => {
      const malformedDir = join(testDir, "malformed");
      await mkdir(malformedDir, { recursive: true });

      // Write malformed turtle file
      await writeFile(
        join(malformedDir, "malformed.ttl"),
        "This is not valid turtle syntax"
      );

      // Should not throw, but may have empty store
      const malformedTurtle = await useTurtle({ graphDir: malformedDir });
      expect(malformedTurtle.files).toHaveLength(1);
    });
  });
});
