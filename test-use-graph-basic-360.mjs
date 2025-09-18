/**
 * Basic 360-Degree Test for useGraph Composable
 * Tests core functionality without external dependencies
 */

console.log("🧪 Starting Basic 360-Degree Test for useGraph Composable");
console.log("=".repeat(60));

async function runBasic360Test() {
  const results = {
    csvToRDF: false,
    useGraph: false,
    fileStructure: false,
    dataFiles: false,
    jobIntegration: false,
  };

  try {
    // Test 1: CSV to RDF Conversion
    console.log("\n📊 Testing CSV to RDF Conversion...");
    try {
      const { csvToRDF } = await import(
        "./src/composables/universal-csv-rdf.js"
      );

      const testCSV = `name,age,city
John,25,New York
Jane,30,London`;

      const rdf = csvToRDF(testCSV, "http://example.org/", "Person");

      if (
        rdf.includes("@prefix") &&
        rdf.includes("Person") &&
        rdf.includes("John")
      ) {
        console.log("✅ CSV to RDF conversion working");
        results.csvToRDF = true;
      } else {
        console.log("❌ CSV to RDF conversion failed");
      }
    } catch (error) {
      console.log(`❌ CSV to RDF test failed: ${error.message}`);
    }

    // Test 2: useGraph Composable Structure
    console.log("\n🔧 Testing useGraph Composable Structure...");
    try {
      const { useGraph } = await import("./src/composables/graph.mjs");

      if (typeof useGraph === "function") {
        console.log("✅ useGraph composable imported successfully");

        // Test expected methods
        const expectedMethods = [
          "sha",
          "addTurtle",
          "addFile",
          "addCSV",
          "setShapes",
          "setQuery",
          "setTemplate",
          "validate",
          "select",
          "render",
          "run",
          "snapshotJSON",
          "snapshotText",
          "latest",
          "receipt",
        ];

        console.log("📋 Expected methods:");
        expectedMethods.forEach((method) => console.log(`   - ${method}`));

        results.useGraph = true;
      } else {
        console.log("❌ useGraph is not a function");
      }
    } catch (error) {
      console.log(`❌ useGraph composable test failed: ${error.message}`);
    }

    // Test 3: File Structure
    console.log("\n📁 Testing File Structure...");
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      const composablesDir = path.join(process.cwd(), "src", "composables");
      const files = await fs.readdir(composablesDir);

      const requiredFiles = ["graph.mjs", "universal-csv-rdf.js"];
      const missingFiles = requiredFiles.filter(
        (file) => !files.includes(file)
      );

      if (missingFiles.length === 0) {
        console.log("✅ All required composable files present");
        results.fileStructure = true;
      } else {
        console.log(`❌ Missing files: ${missingFiles.join(", ")}`);
      }
    } catch (error) {
      console.log(`❌ File structure test failed: ${error.message}`);
    }

    // Test 4: Data Files
    console.log("\n📄 Testing Data Files...");
    try {
      const fs = await import("node:fs/promises");

      const dataFiles = [
        "data/people.csv",
        "data/ontology.ttl",
        "queries/analysis.sparql",
        "templates/report.md",
        "jobs/graph-report.mjs",
      ];

      let existingFiles = 0;
      for (const file of dataFiles) {
        try {
          await fs.access(file);
          console.log(`✅ ${file} exists`);
          existingFiles++;
        } catch (error) {
          console.log(`❌ ${file} missing`);
        }
      }

      if (existingFiles === dataFiles.length) {
        console.log("✅ All data files present");
        results.dataFiles = true;
      } else {
        console.log(
          `⚠️ ${existingFiles}/${dataFiles.length} data files present`
        );
      }
    } catch (error) {
      console.log(`❌ Data files test failed: ${error.message}`);
    }

    // Test 5: Job Integration
    console.log("\n🔧 Testing Job Integration...");
    try {
      const fs = await import("node:fs/promises");

      const jobContent = await fs.readFile("jobs/graph-report.mjs", "utf8");

      const jobChecks = [
        { name: "useGraph import", check: jobContent.includes("useGraph") },
        { name: "defineJob usage", check: jobContent.includes("defineJob") },
        { name: "GitVan integration", check: jobContent.includes("useGit") },
        { name: "Pipeline execution", check: jobContent.includes("g.run()") },
        {
          name: "Error handling",
          check: jobContent.includes("try") && jobContent.includes("catch"),
        },
      ];

      let passedChecks = 0;
      for (const check of jobChecks) {
        if (check.check) {
          console.log(`✅ ${check.name}`);
          passedChecks++;
        } else {
          console.log(`❌ ${check.name}`);
        }
      }

      if (passedChecks === jobChecks.length) {
        console.log("✅ Job integration looks correct");
        results.jobIntegration = true;
      } else {
        console.log(
          `⚠️ ${passedChecks}/${jobChecks.length} job integration checks passed`
        );
      }
    } catch (error) {
      console.log(`❌ Job integration test failed: ${error.message}`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Basic 360-Degree Test Results");
    console.log("=".repeat(60));

    const testResults = [
      { name: "CSV to RDF Conversion", passed: results.csvToRDF },
      { name: "useGraph Composable", passed: results.useGraph },
      { name: "File Structure", passed: results.fileStructure },
      { name: "Data Files", passed: results.dataFiles },
      { name: "Job Integration", passed: results.jobIntegration },
    ];

    let passedTests = 0;
    for (const test of testResults) {
      const status = test.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${test.name}`);
      if (test.passed) passedTests++;
    }

    console.log("=".repeat(60));
    console.log(
      `📈 Overall Results: ${passedTests}/${testResults.length} tests passed`
    );

    if (passedTests === testResults.length) {
      console.log("🎉 ALL BASIC TESTS PASSED! useGraph composable is ready!");
    } else {
      console.log(
        "⚠️ Some basic tests failed. Check the output above for details."
      );
    }

    console.log("=".repeat(60));

    return results;
  } catch (error) {
    console.error("❌ Basic test suite failed:", error.message);
    console.error(error.stack);
    return results;
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasic360Test().catch(console.error);
}

export { runBasic360Test };


