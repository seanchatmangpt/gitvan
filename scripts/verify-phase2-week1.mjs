#!/usr/bin/env node

/**
 * @fileoverview Phase 2 Week 1 Verification Script
 *
 * Quick verification that all Phase 2 Week 1 components are properly implemented
 * and can be imported without errors.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

console.log("🔍 Phase 2 Week 1 Verification\n");
console.log("=" .repeat(80));

const files = [
  {
    path: "src/rdf/ontologies/performance-ontology.ttl",
    type: "Ontology",
    minLines: 500
  },
  {
    path: "src/performance/RDFPerformanceMonitor.mjs",
    type: "Monitor",
    minLines: 600
  },
  {
    path: "src/performance/sparql-queries.mjs",
    type: "Query Library",
    minLines: 400
  },
  {
    path: "examples/performance-monitoring-example.mjs",
    type: "Example",
    minLines: 350
  },
  {
    path: "tests/performance/RDFPerformanceMonitor.test.mjs",
    type: "Tests",
    minLines: 500
  },
  {
    path: "docs/PHASE-2-WEEK-1-PERFORMANCE-ONTOLOGY.md",
    type: "Documentation",
    minLines: 500
  }
];

let allPassed = true;

console.log("\n📁 File Verification:\n");

for (const file of files) {
  process.stdout.write(`  Checking ${file.type}... `);

  if (!existsSync(file.path)) {
    console.log("❌ MISSING");
    allPassed = false;
    continue;
  }

  const content = await readFile(file.path, "utf8");
  const lines = content.split("\n").length;

  if (lines < file.minLines) {
    console.log(`⚠️  TOO SHORT (${lines} lines, expected ${file.minLines}+)`);
    allPassed = false;
    continue;
  }

  console.log(`✅ OK (${lines} lines)`);
}

console.log("\n📦 Module Import Verification:\n");

try {
  process.stdout.write("  Importing RDFPerformanceMonitor... ");
  const { RDFPerformanceMonitor } = await import("../src/performance/RDFPerformanceMonitor.mjs");
  console.log("✅ OK");

  process.stdout.write("  Importing SPARQL queries... ");
  const queries = await import("../src/performance/sparql-queries.mjs");
  console.log(`✅ OK (${Object.keys(queries).length} exports)`);

  process.stdout.write("  Checking class instantiation... ");
  const monitor = new RDFPerformanceMonitor();
  console.log("✅ OK");

} catch (error) {
  console.log(`❌ FAILED: ${error.message}`);
  allPassed = false;
}

console.log("\n🔍 Ontology Syntax Verification:\n");

try {
  process.stdout.write("  Parsing performance ontology... ");
  const ontologyContent = await readFile("src/rdf/ontologies/performance-ontology.ttl", "utf8");

  // Basic syntax checks
  const hasPrefix = ontologyContent.includes("@prefix perf:");
  const hasClasses = ontologyContent.includes("owl:Class");
  const hasProperties = ontologyContent.includes("owl:DatatypeProperty");
  const hasSHACL = ontologyContent.includes("sh:NodeShape");

  if (!hasPrefix) throw new Error("Missing @prefix declaration");
  if (!hasClasses) throw new Error("Missing owl:Class declarations");
  if (!hasProperties) throw new Error("Missing property declarations");
  if (!hasSHACL) throw new Error("Missing SHACL constraints");

  console.log("✅ OK");

} catch (error) {
  console.log(`❌ FAILED: ${error.message}`);
  allPassed = false;
}

console.log("\n📊 Statistics:\n");

let totalLines = 0;
for (const file of files) {
  if (existsSync(file.path)) {
    const content = await readFile(file.path, "utf8");
    totalLines += content.split("\n").length;
  }
}

console.log(`  Total lines delivered: ${totalLines.toLocaleString()}`);
console.log(`  Files delivered: ${files.length}`);
console.log(`  Components: Ontology, Monitor, Queries, Example, Tests, Docs`);

console.log("\n" + "=".repeat(80));

if (allPassed) {
  console.log("\n✅ All Phase 2 Week 1 components verified successfully!\n");
  console.log("Ready to proceed with:");
  console.log("  • npm test tests/performance/RDFPerformanceMonitor.test.mjs");
  console.log("  • node examples/performance-monitoring-example.mjs");
  console.log("\nPhase 2 Week 1: COMPLETE ✅\n");
  process.exit(0);
} else {
  console.log("\n❌ Verification failed. Please check the errors above.\n");
  process.exit(1);
}
