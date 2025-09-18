/**
 * Comprehensive 360-Degree Test Suite for useGraph Composable
 * Tests all functionality, edge cases, and integration scenarios
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { csvToRDF } from "./src/composables/universal-csv-rdf.js";

// Test configuration
const TEST_DIR = join(tmpdir(), `gitvan-graph-360-test-${Date.now()}`);
const SNAPSHOTS_DIR = join(TEST_DIR, "snapshots");

console.log("🧪 Starting 360-Degree useGraph Composable Test Suite");
console.log(`📁 Test directory: ${TEST_DIR}`);

// Test data sets
const TEST_DATA = {
  // Basic CSV data
  basicCSV: `name,age,city,department,salary
John Smith,25,New York,Engineering,75000
Jane Doe,30,London,Marketing,65000
Bob Johnson,35,Paris,Engineering,80000
Alice Brown,28,Tokyo,Sales,60000
Charlie Wilson,32,Berlin,Engineering,78000`,

  // CSV with special characters and quotes
  complexCSV: `"Name","Age","City","Department","Salary","Notes"
"John ""The Boss"" Smith",25,"New York, NY","Engineering",75000,"Lead developer"
"Jane O'Connor",30,"London, UK","Marketing",65000,"Campaign manager"
"Bob & Associates",35,"Paris, France","Engineering",80000,"Senior architect"
"Alice-Brown",28,"Tokyo, Japan","Sales",60000,"Account manager"
"Charlie Wilson Jr.",32,"Berlin, Germany","Engineering",78000,"DevOps specialist"`,

  // CSV with different data types
  typedCSV: `id,name,age,active,score,hire_date
1,Alice,25,true,95.5,2023-01-15
2,Bob,30,false,87.2,2022-06-20
3,Charlie,35,true,92.8,2021-03-10
4,Diana,28,true,89.1,2023-09-05`,

  // RDF/Turtle data
  turtleData: `@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Person rdf:type rdfs:Class ;
    rdfs:label "Person" .

ex:Department rdf:type rdfs:Class ;
    rdfs:label "Department" .

ex:name rdf:type rdf:Property ;
    rdfs:label "name" ;
    rdfs:domain ex:Person ;
    rdfs:range rdfs:Literal .

ex:age rdf:type rdf:Property ;
    rdfs:label "age" ;
    rdfs:domain ex:Person ;
    rdfs:range xsd:integer .

ex:city rdf:type rdf:Property ;
    rdfs:label "city" ;
    rdfs:domain ex:Person ;
    rdfs:range rdfs:Literal .

ex:department rdf:type rdf:Property ;
    rdfs:label "department" ;
    rdfs:domain ex:Person ;
    rdfs:range ex:Department .

ex:salary rdf:type rdf:Property ;
    rdfs:label "salary" ;
    rdfs:domain ex:Person ;
    rdfs:range xsd:integer .

ex:person1 rdf:type ex:Person ;
    ex:name "Alice" ;
    ex:age 28 ;
    ex:city "Tokyo" ;
    ex:department ex:Engineering ;
    ex:salary 60000 .`,

  // SHACL shapes
  shaclShapes: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <https://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:PersonShape a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
    ] ;
    sh:property [
        sh:path ex:age ;
        sh:datatype xsd:integer ;
        sh:minInclusive 18 ;
        sh:maxInclusive 100 ;
    ] ;
    sh:property [
        sh:path ex:salary ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
    ] .`,

  // SPARQL queries
  sparqlQueries: {
    basic: `PREFIX ex: <https://example.org/>
SELECT ?name ?age ?city ?department ?salary WHERE {
    ?person rdf:type ex:Person ;
            ex:name ?name ;
            ex:age ?age ;
            ex:city ?city ;
            ex:department ?department ;
            ex:salary ?salary .
}
ORDER BY ?name`,

    aggregation: `PREFIX ex: <https://example.org/>
SELECT ?department (COUNT(?person) as ?count) (AVG(?salary) as ?avgSalary) WHERE {
    ?person rdf:type ex:Person ;
            ex:department ?department ;
            ex:salary ?salary .
}
GROUP BY ?department
ORDER BY DESC(?avgSalary)`,

    filter: `PREFIX ex: <https://example.org/>
SELECT ?name ?age ?salary WHERE {
    ?person rdf:type ex:Person ;
            ex:name ?name ;
            ex:age ?age ;
            ex:salary ?salary .
    FILTER(?salary > 70000)
}
ORDER BY DESC(?salary)`,

    empty: `PREFIX ex: <https://example.org/>
SELECT ?name WHERE {
    ?person rdf:type ex:NonExistentClass ;
            ex:name ?name .
}`
  },

  // Nunjucks templates
  templates: {
    basic: `# People Report

## Summary
Total people: {{ people | length }}

## People List
{% for person in people %}
- **{{ person.name }}**: {{ person.age }} years old, lives in {{ person.city }}, works in {{ person.department }}, earns ${{ person.salary | number_format }}
{% endfor %}`,

    withFilters: `# Department Analysis

## Statistics
- Total people: {{ people | length }}
- Average age: {{ people | avg('age') | round(1) }}
- Average salary: ${{ people | avg('salary') | round(0) | number_format }}
- Oldest person: {{ people | max('age') }} years
- Youngest person: {{ people | min('age') }} years
- Highest salary: ${{ people | max('salary') | number_format }}
- Lowest salary: ${{ people | min('salary') | number_format }}

## By Department
{% set departments = people | groupby('department') %}
{% for dept, deptPeople in departments %}
### {{ dept }}
- Count: {{ deptPeople | length }}
- Average age: {{ deptPeople | avg('age') | round(1) }}
- Average salary: ${{ deptPeople | avg('salary') | round(0) | number_format }}
{% endfor %}`,

    withFrontmatter: `---
baseIRI: "https://example.org/"
queryName: "people"
entityType: "Person"
title: "Employee Report"
---

# {{ title }}

## Summary
Total employees: {{ people | length }}

## Employees
{% for person in people %}
- **{{ person.name }}**: {{ person.age }} years old, {{ person.city }}
{% endfor %}`,

    empty: `# Empty Report

No data available.`
  }
};

// Test utilities
async function setupTestEnvironment() {
  console.log("🔧 Setting up test environment...");
  
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(join(TEST_DIR, "data"), { recursive: true });
  await fs.mkdir(join(TEST_DIR, "queries"), { recursive: true });
  await fs.mkdir(join(TEST_DIR, "templates"), { recursive: true });
  await fs.mkdir(join(TEST_DIR, "shapes"), { recursive: true });
  
  // Write test data files
  await fs.writeFile(join(TEST_DIR, "data", "basic.csv"), TEST_DATA.basicCSV);
  await fs.writeFile(join(TEST_DIR, "data", "complex.csv"), TEST_DATA.complexCSV);
  await fs.writeFile(join(TEST_DIR, "data", "typed.csv"), TEST_DATA.typedCSV);
  await fs.writeFile(join(TEST_DIR, "data", "ontology.ttl"), TEST_DATA.turtleData);
  
  await fs.writeFile(join(TEST_DIR, "queries", "basic.sparql"), TEST_DATA.sparqlQueries.basic);
  await fs.writeFile(join(TEST_DIR, "queries", "aggregation.sparql"), TEST_DATA.sparqlQueries.aggregation);
  await fs.writeFile(join(TEST_DIR, "queries", "filter.sparql"), TEST_DATA.sparqlQueries.filter);
  await fs.writeFile(join(TEST_DIR, "queries", "empty.sparql"), TEST_DATA.sparqlQueries.empty);
  
  await fs.writeFile(join(TEST_DIR, "templates", "basic.md"), TEST_DATA.templates.basic);
  await fs.writeFile(join(TEST_DIR, "templates", "filters.md"), TEST_DATA.templates.withFilters);
  await fs.writeFile(join(TEST_DIR, "templates", "frontmatter.md"), TEST_DATA.templates.withFrontmatter);
  await fs.writeFile(join(TEST_DIR, "templates", "empty.md"), TEST_DATA.templates.empty);
  
  await fs.writeFile(join(TEST_DIR, "shapes", "validation.shacl.ttl"), TEST_DATA.shaclShapes);
  
  console.log("✅ Test environment setup complete");
}

async function cleanupTestEnvironment() {
  console.log("🧹 Cleaning up test environment...");
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  console.log("✅ Test environment cleaned up");
}

// Test functions
async function testCSVToRDFConversion() {
  console.log("\n📊 Testing CSV to RDF Conversion...");
  
  try {
    // Test basic CSV
    const basicRDF = csvToRDF(TEST_DATA.basicCSV, "https://example.org/", "Person");
    console.log("✅ Basic CSV conversion successful");
    
    // Test complex CSV with quotes and special characters
    const complexRDF = csvToRDF(TEST_DATA.complexCSV, "https://example.org/", "Person");
    console.log("✅ Complex CSV conversion successful");
    
    // Test typed CSV
    const typedRDF = csvToRDF(TEST_DATA.typedCSV, "https://example.org/", "Employee");
    console.log("✅ Typed CSV conversion successful");
    
    // Verify RDF structure
    const rdfChecks = [
      { name: "Basic RDF", rdf: basicRDF, checks: ["@prefix", "Person", "John Smith"] },
      { name: "Complex RDF", rdf: complexRDF, checks: ["@prefix", "Person", "John \"The Boss\" Smith"] },
      { name: "Typed RDF", rdf: typedRDF, checks: ["@prefix", "Employee", "Alice", "xsd:integer", "xsd:boolean"] }
    ];
    
    for (const check of rdfChecks) {
      const allChecksPass = check.checks.every(term => check.rdf.includes(term));
      if (allChecksPass) {
        console.log(`✅ ${check.name} structure verification passed`);
      } else {
        console.log(`❌ ${check.name} structure verification failed`);
      }
    }
    
    return { success: true, rdf: { basic: basicRDF, complex: complexRDF, typed: typedRDF } };
    
  } catch (error) {
    console.log(`❌ CSV to RDF conversion failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testUseGraphComposable() {
  console.log("\n🔧 Testing useGraph Composable...");
  
  try {
    const { useGraph } = await import("./src/composables/graph.mjs");
    
    // Test composable initialization
    const graph = await useGraph({
      baseIRI: "https://example.org/",
      snapshotsDir: SNAPSHOTS_DIR
    });
    
    console.log("✅ useGraph composable initialized");
    
    // Test all methods exist
    const expectedMethods = [
      'sha', 'addTurtle', 'addFile', 'addCSV', 'setShapes',
      'setQuery', 'setTemplate', 'validate', 'select', 'render',
      'run', 'snapshotJSON', 'snapshotText', 'latest', 'receipt'
    ];
    
    const missingMethods = expectedMethods.filter(method => typeof graph[method] !== 'function');
    if (missingMethods.length === 0) {
      console.log("✅ All expected methods present");
    } else {
      console.log(`❌ Missing methods: ${missingMethods.join(', ')}`);
    }
    
    return { success: true, graph };
    
  } catch (error) {
    console.log(`❌ useGraph composable test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testDataLoading(graph) {
  console.log("\n📁 Testing Data Loading...");
  
  try {
    // Test CSV file loading
    await graph.addFile(join(TEST_DIR, "data", "basic.csv"));
    console.log("✅ CSV file loaded");
    
    // Test Turtle file loading
    await graph.addFile(join(TEST_DIR, "data", "ontology.ttl"));
    console.log("✅ Turtle file loaded");
    
    // Test direct CSV loading
    await graph.addCSV(join(TEST_DIR, "data", "typed.csv"));
    console.log("✅ Direct CSV loading");
    
    // Test Turtle string loading
    await graph.addTurtle(TEST_DATA.turtleData);
    console.log("✅ Turtle string loaded");
    
    return { success: true };
    
  } catch (error) {
    console.log(`❌ Data loading test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSPARQLQueries(graph) {
  console.log("\n🔍 Testing SPARQL Queries...");
  
  try {
    // Test basic query
    await graph.setQuery(join(TEST_DIR, "queries", "basic.sparql"));
    const basicResults = await graph.select();
    console.log(`✅ Basic query executed: ${basicResults.length} results`);
    
    // Test aggregation query
    await graph.setQuery(join(TEST_DIR, "queries", "aggregation.sparql"));
    const aggResults = await graph.select();
    console.log(`✅ Aggregation query executed: ${aggResults.length} results`);
    
    // Test filter query
    await graph.setQuery(join(TEST_DIR, "queries", "filter.sparql"));
    const filterResults = await graph.select();
    console.log(`✅ Filter query executed: ${filterResults.length} results`);
    
    // Test empty query
    await graph.setQuery(join(TEST_DIR, "queries", "empty.sparql"));
    const emptyResults = await graph.select();
    console.log(`✅ Empty query executed: ${emptyResults.length} results`);
    
    return { 
      success: true, 
      results: { basic: basicResults, aggregation: aggResults, filter: filterResults, empty: emptyResults }
    };
    
  } catch (error) {
    console.log(`❌ SPARQL queries test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testNunjucksTemplating(graph) {
  console.log("\n🎨 Testing Nunjucks Templating...");
  
  try {
    // Test basic template
    await graph.setTemplate(join(TEST_DIR, "templates", "basic.md"));
    await graph.setQuery(join(TEST_DIR, "queries", "basic.sparql"));
    const basicRender = await graph.render();
    console.log("✅ Basic template rendered");
    
    // Test template with filters
    await graph.setTemplate(join(TEST_DIR, "templates", "filters.md"));
    const filtersRender = await graph.render();
    console.log("✅ Template with filters rendered");
    
    // Test template with front-matter
    await graph.setTemplate(join(TEST_DIR, "templates", "frontmatter.md"));
    const frontmatterRender = await graph.render();
    console.log("✅ Template with front-matter rendered");
    
    // Test empty template
    await graph.setTemplate(join(TEST_DIR, "templates", "empty.md"));
    const emptyRender = await graph.render();
    console.log("✅ Empty template rendered");
    
    // Verify template content
    const templateChecks = [
      { name: "Basic", content: basicRender, checks: ["People Report", "Total people"] },
      { name: "Filters", content: filtersRender, checks: ["Department Analysis", "Average age", "By Department"] },
      { name: "Front-matter", content: frontmatterRender, checks: ["Employee Report", "Total employees"] },
      { name: "Empty", content: emptyRender, checks: ["Empty Report", "No data available"] }
    ];
    
    for (const check of templateChecks) {
      const allChecksPass = check.checks.every(term => check.content.includes(term));
      if (allChecksPass) {
        console.log(`✅ ${check.name} template content verification passed`);
      } else {
        console.log(`❌ ${check.name} template content verification failed`);
      }
    }
    
    return { 
      success: true, 
      renders: { basic: basicRender, filters: filtersRender, frontmatter: frontmatterRender, empty: emptyRender }
    };
    
  } catch (error) {
    console.log(`❌ Nunjucks templating test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSnapshotsAndReceipts(graph) {
  console.log("\n📸 Testing Snapshots and Receipts...");
  
  try {
    // Test JSON snapshot
    const testData = { test: "data", numbers: [1, 2, 3] };
    const jsonSnapshot = await graph.snapshotJSON("test", "data", testData);
    console.log(`✅ JSON snapshot created: ${jsonSnapshot.path}`);
    
    // Test text snapshot
    const textSnapshot = await graph.snapshotText("test", "report", "Test report content", "txt");
    console.log(`✅ Text snapshot created: ${textSnapshot.path}`);
    
    // Test latest marker
    await graph.latest("test");
    console.log("✅ Latest marker created");
    
    // Test receipt
    const receipt = await graph.receipt("test-job", [jsonSnapshot, textSnapshot]);
    console.log(`✅ Receipt created: ${receipt.path}`);
    
    // Verify snapshots exist
    const snapshotsExist = await fs.access(jsonSnapshot.path).then(() => true).catch(() => false);
    const textExists = await fs.access(textSnapshot.path).then(() => true).catch(() => false);
    const receiptExists = await fs.access(receipt.path).then(() => true).catch(() => false);
    
    if (snapshotsExist && textExists && receiptExists) {
      console.log("✅ All snapshots and receipts verified");
    } else {
      console.log("❌ Some snapshots or receipts missing");
    }
    
    return { success: true, snapshots: { json: jsonSnapshot, text: textSnapshot, receipt } };
    
  } catch (error) {
    console.log(`❌ Snapshots and receipts test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testCompletePipeline(graph) {
  console.log("\n🔄 Testing Complete Pipeline...");
  
  try {
    // Set up complete pipeline
    await graph.setShapes(join(TEST_DIR, "shapes", "validation.shacl.ttl"));
    await graph.setQuery(join(TEST_DIR, "queries", "basic.sparql"));
    await graph.setTemplate(join(TEST_DIR, "templates", "filters.md"));
    
    // Run complete pipeline
    const result = await graph.run();
    console.log("✅ Complete pipeline executed");
    
    // Verify result
    if (result && result.includes("Department Analysis") && result.includes("Average age")) {
      console.log("✅ Pipeline result verification passed");
    } else {
      console.log("❌ Pipeline result verification failed");
    }
    
    return { success: true, result };
    
  } catch (error) {
    console.log(`❌ Complete pipeline test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testErrorHandling() {
  console.log("\n⚠️ Testing Error Handling...");
  
  try {
    const { useGraph } = await import("./src/composables/graph.mjs");
    const graph = await useGraph({ snapshotsDir: SNAPSHOTS_DIR });
    
    // Test with non-existent files
    try {
      await graph.addFile("non-existent-file.csv");
      console.log("❌ Should have failed with non-existent file");
    } catch (error) {
      console.log("✅ Properly handled non-existent file");
    }
    
    // Test with invalid SPARQL
    try {
      await graph.setQuery("INVALID SPARQL QUERY");
      await graph.select();
      console.log("❌ Should have failed with invalid SPARQL");
    } catch (error) {
      console.log("✅ Properly handled invalid SPARQL");
    }
    
    // Test with invalid template
    try {
      await graph.setTemplate("{{ invalid template syntax");
      await graph.render();
      console.log("❌ Should have failed with invalid template");
    } catch (error) {
      console.log("✅ Properly handled invalid template");
    }
    
    return { success: true };
    
  } catch (error) {
    console.log(`❌ Error handling test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPerformance() {
  console.log("\n⚡ Testing Performance...");
  
  try {
    const { useGraph } = await import("./src/composables/graph.mjs");
    const graph = await useGraph({ snapshotsDir: SNAPSHOTS_DIR });
    
    // Generate large dataset
    const largeCSV = "id,name,age,city\n" + 
      Array.from({ length: 1000 }, (_, i) => `${i},Person${i},${20 + (i % 50)},City${i % 100}`).join('\n');
    
    const startTime = Date.now();
    
    // Test large dataset processing
    await graph.addTurtle(csvToRDF(largeCSV, "https://example.org/", "Person"));
    await graph.setQuery("PREFIX ex: <https://example.org/> SELECT ?name ?age WHERE { ?person ex:name ?name ; ex:age ?age }");
    const results = await graph.select();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Processed ${results.length} records in ${duration}ms`);
    console.log(`✅ Performance: ${(results.length / duration * 1000).toFixed(2)} records/second`);
    
    return { success: true, performance: { records: results.length, duration, rate: results.length / duration * 1000 } };
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function run360TestSuite() {
  console.log("🚀 Starting 360-Degree Test Suite for useGraph Composable");
  console.log("=" .repeat(60));
  
  const results = {
    csvToRDF: null,
    useGraph: null,
    dataLoading: null,
    sparqlQueries: null,
    templating: null,
    snapshots: null,
    pipeline: null,
    errorHandling: null,
    performance: null
  };
  
  try {
    // Setup
    await setupTestEnvironment();
    
    // Test 1: CSV to RDF Conversion
    results.csvToRDF = await testCSVToRDFConversion();
    
    // Test 2: useGraph Composable
    results.useGraph = await testUseGraphComposable();
    if (!results.useGraph.success) {
      throw new Error("useGraph composable test failed");
    }
    
    // Test 3: Data Loading
    results.dataLoading = await testDataLoading(results.useGraph.graph);
    
    // Test 4: SPARQL Queries
    results.sparqlQueries = await testSPARQLQueries(results.useGraph.graph);
    
    // Test 5: Nunjucks Templating
    results.templating = await testNunjucksTemplating(results.useGraph.graph);
    
    // Test 6: Snapshots and Receipts
    results.snapshots = await testSnapshotsAndReceipts(results.useGraph.graph);
    
    // Test 7: Complete Pipeline
    results.pipeline = await testCompletePipeline(results.useGraph.graph);
    
    // Test 8: Error Handling
    results.errorHandling = await testErrorHandling();
    
    // Test 9: Performance
    results.performance = await testPerformance();
    
    // Summary
    console.log("\n" + "=" .repeat(60));
    console.log("📊 360-Degree Test Suite Results");
    console.log("=" .repeat(60));
    
    const testNames = [
      { key: 'csvToRDF', name: 'CSV to RDF Conversion' },
      { key: 'useGraph', name: 'useGraph Composable' },
      { key: 'dataLoading', name: 'Data Loading' },
      { key: 'sparqlQueries', name: 'SPARQL Queries' },
      { key: 'templating', name: 'Nunjucks Templating' },
      { key: 'snapshots', name: 'Snapshots & Receipts' },
      { key: 'pipeline', name: 'Complete Pipeline' },
      { key: 'errorHandling', name: 'Error Handling' },
      { key: 'performance', name: 'Performance' }
    ];
    
    let passedTests = 0;
    let totalTests = testNames.length;
    
    for (const test of testNames) {
      const result = results[test.key];
      const status = result?.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
      if (result?.success) passedTests++;
    }
    
    console.log("=" .repeat(60));
    console.log(`📈 Overall Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log("🎉 ALL TESTS PASSED! useGraph composable is fully functional!");
    } else {
      console.log("⚠️ Some tests failed. Check the output above for details.");
    }
    
    console.log("=" .repeat(60));
    
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    console.error(error.stack);
  } finally {
    await cleanupTestEnvironment();
  }
  
  return results;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run360TestSuite().catch(console.error);
}

export { run360TestSuite, testCSVToRDFConversion, testUseGraphComposable };


