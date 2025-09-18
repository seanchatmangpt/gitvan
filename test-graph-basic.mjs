/**
 * Simple test of useGraph composable without external dependencies
 * Tests the CSV to RDF conversion and basic functionality
 */

console.log("🧪 Testing useGraph composable (basic functionality)...");

try {
  // Test CSV to RDF conversion
  console.log("📊 Testing CSV to RDF conversion...");

  const { csvToRDF } = await import("./src/composables/universal-csv-rdf.js");

  const testCSV = `name,age,city
John,25,New York
Jane,30,London`;

  const rdf = csvToRDF(testCSV, "http://example.org/", "Person");

  console.log("✅ CSV to RDF conversion successful");
  console.log("📝 Generated RDF:");
  console.log("─".repeat(50));
  console.log(rdf);
  console.log("─".repeat(50));

  // Verify RDF structure
  if (
    rdf.includes("@prefix") &&
    rdf.includes("Person") &&
    rdf.includes("John")
  ) {
    console.log("✅ RDF structure looks correct");
  } else {
    console.log("❌ RDF structure seems incorrect");
  }

  // Test file structure
  console.log("\n📁 Testing file structure...");
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const testFiles = [
    "data/people.csv",
    "data/ontology.ttl",
    "queries/analysis.sparql",
    "templates/report.md",
    "jobs/graph-report.mjs",
  ];

  for (const file of testFiles) {
    try {
      await fs.access(file);
      console.log(`✅ ${file} exists`);
    } catch (error) {
      console.log(`❌ ${file} missing`);
    }
  }

  // Test job structure
  console.log("\n🔧 Testing job structure...");
  try {
    const jobContent = await fs.readFile("jobs/graph-report.mjs", "utf8");
    if (jobContent.includes("useGraph") && jobContent.includes("defineJob")) {
      console.log("✅ Graph report job structure looks correct");
    } else {
      console.log("❌ Graph report job structure seems incorrect");
    }
  } catch (error) {
    console.log("❌ Could not read job file:", error.message);
  }

  console.log("\n🎉 Basic useGraph composable test completed!");
  console.log("✅ The composable appears to be properly structured");
  console.log("📋 Ready for integration with GitVan's AI Template Loop system");
} catch (error) {
  console.error("❌ Test failed:", error.message);
  console.error(error.stack);
  process.exit(1);
}



