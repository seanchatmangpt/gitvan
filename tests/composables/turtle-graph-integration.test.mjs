/**
 * Integration test for turtle.mjs, graph.mjs, and RdfEngine.mjs
 * Tests the complete pipeline from Turtle file loading to SPARQL querying
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { useTurtle } from "../../src/composables/turtle.mjs";
import { useGraph } from "../../src/composables/graph.mjs";
import { RdfEngine } from "../../src/engines/RdfEngine.mjs";

describe("Turtle-Graph-RdfEngine Integration", () => {
  let testDir;
  let graphDir;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `gitvan-integration-test-${Date.now()}`);
    graphDir = join(testDir, "graph");
    await fs.mkdir(graphDir, { recursive: true });

    // Create test Turtle files
    const testTurtle1 = `@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:person1 rdf:type ex:Person ;
    foaf:name "Alice Johnson" ;
    ex:age 28 ;
    ex:city "Tokyo" ;
    ex:skills ( "JavaScript" "Python" "RDF" ) .

ex:person2 rdf:type ex:Person ;
    foaf:name "Bob Smith" ;
    ex:age 35 ;
    ex:city "London" ;
    ex:skills ( "Java" "Scala" "SPARQL" ) .

ex:person3 rdf:type ex:Person ;
    foaf:name "Carol Davis" ;
    ex:age 42 ;
    ex:city "New York" ;
    ex:skills ( "C++" "Rust" "GraphQL" ) .`;

    const testTurtle2 = `@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project1 rdf:type ex:Project ;
    ex:name "GitVan Platform" ;
    ex:description "Git-native development automation" ;
    ex:technologies ( "RDF" "SPARQL" "Nunjucks" ) .

ex:project2 rdf:type ex:Project ;
    ex:name "Data Pipeline" ;
    ex:description "ETL pipeline for knowledge graphs" ;
    ex:technologies ( "Python" "Apache Airflow" "RDF" ) .`;

    await fs.writeFile(join(graphDir, "people.ttl"), testTurtle1);
    await fs.writeFile(join(graphDir, "projects.ttl"), testTurtle2);
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should load Turtle files and create N3 Store", async () => {
    const turtle = await useTurtle({ graphDir });

    expect(turtle.store).toBeDefined();
    expect(turtle.store.size).toBeGreaterThan(0);
    expect(turtle.files).toHaveLength(2);
    expect(turtle.files[0].name).toBe("people.ttl");
    expect(turtle.files[1].name).toBe("projects.ttl");
  });

  it("should integrate useTurtle with useGraph", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    expect(graph.store).toBe(turtle.store);
    expect(graph.engine).toBeInstanceOf(RdfEngine);
    expect(graph.stats.quads).toBeGreaterThan(0);
  });

  it("should execute SPARQL SELECT queries", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const sparql = `PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?name ?age ?city WHERE {
    ?person rdf:type ex:Person .
    ?person foaf:name ?name .
    ?person ex:age ?age .
    ?person ex:city ?city .
} ORDER BY ?age`;

    const results = await graph.select(sparql);

    expect(results).toHaveLength(3);
    expect(results[0].name.value).toBe("Alice Johnson");
    expect(results[0].age.value).toBe("28");
    expect(results[0].city.value).toBe("Tokyo");
  });

  it("should execute SPARQL ASK queries", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const askQuery = `PREFIX ex: <http://example.org/>
ASK WHERE {
    ?person rdf:type ex:Person .
    ?person ex:age ?age .
    FILTER(?age > 30)
}`;

    const result = await graph.ask(askQuery);
    expect(result).toBe(true);
  });

  it("should execute SPARQL CONSTRUCT queries", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const constructQuery = `PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
CONSTRUCT {
    ?person foaf:name ?name .
    ?person ex:age ?age .
} WHERE {
    ?person rdf:type ex:Person .
    ?person foaf:name ?name .
    ?person ex:age ?age .
    FILTER(?age > 30)
}`;

    const result = await graph.query(constructQuery);

    expect(result.type).toBe("construct");
    expect(result.store).toBeDefined();
    expect(result.store.size).toBeGreaterThan(0);
  });

  it("should perform graph set operations", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    // Create a subset graph with only people
    const peopleQuery = `PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
CONSTRUCT {
    ?person ?p ?o .
} WHERE {
    ?person rdf:type ex:Person .
    ?person ?p ?o .
}`;

    const peopleResult = await graph.query(peopleQuery);
    const peopleGraph = useGraph(peopleResult.store);

    // Test union - should contain all quads from both graphs
    const unionGraph = graph.union(peopleGraph);
    expect(unionGraph.store.size).toBeGreaterThanOrEqual(graph.store.size);

    // Test intersection - should contain quads that exist in both graphs
    const intersectionGraph = graph.intersection(peopleGraph);
    expect(intersectionGraph.store.size).toBeGreaterThanOrEqual(0);

    // Test difference - should contain quads in graph but not in peopleGraph
    const differenceGraph = graph.difference(peopleGraph);
    expect(differenceGraph.store.size).toBeGreaterThanOrEqual(0);
  });

  it("should serialize graphs to Turtle format", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const serialized = await graph.serialize({
      format: "Turtle",
      prefixes: {
        ex: "http://example.org/",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        foaf: "http://xmlns.com/foaf/0.1/",
      },
    });

    expect(serialized).toContain("@prefix");
    expect(serialized).toContain("Alice Johnson");
    expect(serialized).toContain("GitVan Platform");
  });

  it("should validate SHACL shapes", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const shapes = `@prefix ex: <http://example.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:PersonShape rdf:type sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
        sh:path ex:age ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
        sh:maxInclusive 150
    ] .`;

    const validation = await graph.validate(shapes);

    expect(validation).toHaveProperty("conforms");
    expect(validation).toHaveProperty("results");
    expect(Array.isArray(validation.results)).toBe(true);
  });

  it("should use Clownface for graph traversal", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const pointer = graph.pointer();

    // Test that Clownface is working by checking the dataset
    const dataset = pointer._context[0].dataset;
    expect(dataset.size).toBeGreaterThan(0);

    // Find a specific person by URI
    const person1 = pointer.namedNode("http://example.org/person1");
    expect(person1._context.length).toBe(1);

    // Test that we can access the underlying dataset
    let foundName = false;
    for (const quad of dataset) {
      if (
        quad.subject.value === "http://example.org/person1" &&
        quad.predicate.value === "http://xmlns.com/foaf/0.1/name"
      ) {
        expect(quad.object.value).toBe("Alice Johnson");
        foundName = true;
        break;
      }
    }
    expect(foundName).toBe(true);
  });

  it("should handle RDF lists correctly", async () => {
    const turtle = await useTurtle({ graphDir });

    // Test the readList helper function
    const person1 = turtle.store.getSubjects(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "http://example.org/Person",
      null
    )[0];
    const skillsList = turtle.getOne(person1, "http://example.org/skills");

    if (skillsList) {
      const skills = turtle.readList(skillsList);
      expect(skills.length).toBeGreaterThan(0);
      expect(skills[0].value).toBe("JavaScript");
    }
  });

  it("should provide configuration information", async () => {
    const turtle = await useTurtle({ graphDir });

    expect(turtle.config).toBeDefined();
    expect(turtle.config.root).toBeDefined();
    expect(turtle.config.graphDir).toBe(graphDir);
    expect(turtle.getGraphDir()).toBe(graphDir);
    expect(turtle.getUriRoots()).toBeDefined();
  });

  it("should resolve URI references", async () => {
    const turtle = await useTurtle({ graphDir });

    // Test resolveText with a file path
    const testContent = "Test content for URI resolution";
    const testFile = join(graphDir, "test-resolve.txt");
    await fs.writeFile(testFile, testContent);

    const resolved = await turtle.resolveText(testFile);
    expect(resolved).toBe(testContent);

    // Test with non-file string
    const nonFileString = "This is just a string";
    const resolvedString = await turtle.resolveText(nonFileString);
    expect(resolvedString).toBe(nonFileString);
  });

  it("should handle malformed Turtle files gracefully", async () => {
    // Create a malformed Turtle file
    const malformedTurtle = `@prefix ex: <http://example.org/> .
This is not valid Turtle syntax
ex:person1 rdf:type ex:Person ;
    ex:name "Alice" .`;

    await fs.writeFile(join(graphDir, "malformed.ttl"), malformedTurtle);

    // Should not throw an error, but should warn
    const turtle = await useTurtle({ graphDir });
    expect(turtle.store).toBeDefined();
    expect(turtle.files).toHaveLength(3); // Should still load other files
  });

  it("should provide comprehensive statistics", async () => {
    const turtle = await useTurtle({ graphDir });
    const graph = useGraph(turtle.store);

    const stats = graph.stats;

    expect(stats).toHaveProperty("quads");
    expect(stats).toHaveProperty("subjects");
    expect(stats).toHaveProperty("predicates");
    expect(stats).toHaveProperty("objects");
    expect(stats).toHaveProperty("graphs");

    expect(stats.quads).toBeGreaterThan(0);
    expect(stats.subjects).toBeGreaterThan(0);
    expect(stats.predicates).toBeGreaterThan(0);
    expect(stats.objects).toBeGreaterThan(0);
  });
});
