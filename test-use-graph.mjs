/**
 * Test useGraph Composable
 * Simple test to verify the RDF/SPARQL composable works
 */

import { useGraph } from "../src/composables/graph.mjs";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function testUseGraph() {
  console.log("🧪 Testing useGraph composable...");

  try {
    // Create temporary test directory
    const testDir = join(tmpdir(), `gitvan-graph-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    console.log(`📁 Test directory: ${testDir}`);

    // Create test data files
    const csvData = `name,age,city
John,25,New York
Jane,30,London
Bob,35,Paris`;

    const turtleData = `@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:person1 rdf:type ex:Person ;
    ex:name "Alice" ;
    ex:age 28 ;
    ex:city "Tokyo" .`;

    const sparqlQuery = `PREFIX ex: <http://example.org/>
SELECT ?name ?age ?city WHERE {
    ?person ex:name ?name ;
            ex:age ?age ;
            ex:city ?city .
}`;

    const template = `# People Report

## Summary
Total people: {{ results | length }}

## People List
{% for person in results %}
- **{{ person.name }}**: {{ person.age }} years old, lives in {{ person.city }}
{% endfor %}

## Statistics
- Average age: {{ results | avg('age') | round(1) }}
- Oldest person: {{ results | max('age') }} years
- Youngest person: {{ results | min('age') }} years
`;

    // Write test files
    await fs.writeFile(join(testDir, "people.csv"), csvData);
    await fs.writeFile(join(testDir, "people.ttl"), turtleData);
    await fs.writeFile(join(testDir, "query.sparql"), sparqlQuery);
    await fs.writeFile(join(testDir, "template.md"), template);

    console.log("✅ Test files created");

    // Test the composable
    const graph = await useGraph({
      baseIRI: "http://example.org/",
      snapshotsDir: join(testDir, "snapshots"),
    });

    console.log("✅ useGraph composable initialized");

    // Add data files
    await graph.addFile(join(testDir, "people.csv"));
    await graph.addFile(join(testDir, "people.ttl"));

    console.log("✅ Data files added");

    // Set query and template
    await graph.setQuery(join(testDir, "query.sparql"));
    await graph.setTemplate(join(testDir, "template.md"));

    console.log("✅ Query and template set");

    // Run the pipeline
    const result = await graph.run();

    console.log("✅ Pipeline executed successfully");
    console.log("\n📝 Generated Report:");
    console.log("─".repeat(50));
    console.log(result);
    console.log("─".repeat(50));

    // Check snapshots were created
    const snapshotsDir = join(testDir, "snapshots");
    const snapshots = await fs.readdir(snapshotsDir, { recursive: true });

    console.log(`\n📸 Snapshots created: ${snapshots.length} files`);
    snapshots.forEach((file) => console.log(`   - ${file}`));

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    console.log("\n🧹 Test directory cleaned up");

    console.log("\n🎉 useGraph composable test passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUseGraph().catch(console.error);
}

export { testUseGraph };



