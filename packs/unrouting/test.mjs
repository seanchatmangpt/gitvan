/**
 * GitVan Unrouting - Comprehensive Test Suite
 * Tests all unrouting features and scenarios
 */

import { parsePath, compileRoutes, processFiles } from "./parser.mjs";
import { readFileSync } from "fs";

// Load routes
const routes = JSON.parse(readFileSync("./routes.json", "utf-8"));
const compiledRoutes = compileRoutes(routes);

console.log("🧪 GitVan Unrouting - Comprehensive Test Suite");
console.log("=" * 60);

// Test scenarios
const testScenarios = [
  {
    name: "Single File Match",
    files: ["inbox/jobs/acme/jd.md"],
    expected: {
      routes: ["jd-intake"],
      jobs: ["intake:jd", "pitch:plan", "pitch:compose"],
      batches: ["acme"],
    },
  },
  {
    name: "Multi-file Batching",
    files: ["pitch/acme/script.mdx", "pitch/acme/modes/founder.json"],
    expected: {
      routes: ["script-edit", "persona-mode"],
      jobs: ["pitch:compose", "pitch:plan"],
      batches: ["acme"],
    },
  },
  {
    name: "Catchall Parameters",
    files: ["evidence/acme/screens/demo.gif"],
    expected: {
      routes: ["evidence"],
      jobs: ["artifact:attach"],
      batches: ["acme"],
    },
  },
  {
    name: "Named Views",
    files: ["sites/acme/pages/stack@rsc.client.mdx"],
    expected: {
      routes: ["page-variants"],
      jobs: ["pitch:compose"],
      batches: ["acme"],
    },
  },
  {
    name: "Multi-slug Processing",
    files: [
      "inbox/jobs/acme/jd.md",
      "inbox/jobs/beta/jd.md",
      "pitch/acme/script.mdx",
    ],
    expected: {
      routes: ["jd-intake", "script-edit"],
      jobs: ["intake:jd", "pitch:plan", "pitch:compose"],
      batches: ["acme", "beta"],
    },
  },
  {
    name: "Complex Workflow",
    files: [
      "inbox/jobs/acme/jd.md",
      "pitch/acme/script.mdx",
      "pitch/acme/modes/founder.json",
      "ops/acme/prepared.touch",
      "ops/acme/meeting/20241201.touch",
      "evidence/acme/screens/demo.gif",
    ],
    expected: {
      routes: [
        "jd-intake",
        "script-edit",
        "persona-mode",
        "prepared",
        "meeting",
        "evidence",
      ],
      jobs: [
        "intake:jd",
        "pitch:plan",
        "pitch:compose",
        "pitch:render:docx",
        "pitch:render:pdf",
        "pitch:package",
        "artifact:attach",
      ],
      batches: ["acme"],
    },
  },
];

// Run tests
for (const scenario of testScenarios) {
  console.log(`\n📋 Test: ${scenario.name}`);
  console.log("-" * 40);

  console.log(`Files: ${scenario.files.join(", ")}`);

  // Process files
  const jobQueue = processFiles(scenario.files, compiledRoutes);

  // Extract results
  const actualRoutes = [...new Set(jobQueue.map((j) => j.routeId))];
  const actualJobs = [...new Set(jobQueue.map((j) => j.name))];
  const actualBatches = [...new Set(jobQueue.map((j) => j.batchKey))];

  console.log(`\nResults:`);
  console.log(`  Routes: ${actualRoutes.join(", ")}`);
  console.log(`  Jobs: ${actualJobs.join(", ")}`);
  console.log(`  Batches: ${actualBatches.join(", ")}`);

  // Show job details
  console.log(`\nJob Details:`);
  jobQueue.forEach((job, i) => {
    console.log(`  ${i + 1}. ${job.name} (${job.batchKey})`);
    console.log(`     Route: ${job.routeId}`);
    console.log(`     File: ${job.filePath}`);
    console.log(`     Payload:`, JSON.stringify(job.payload, null, 6));
  });

  // Validate expectations
  const routeMatch = scenario.expected.routes.every((r) =>
    actualRoutes.includes(r)
  );
  const jobMatch = scenario.expected.jobs.every((j) => actualJobs.includes(j));
  const batchMatch = scenario.expected.batches.every((b) =>
    actualBatches.includes(b)
  );

  const allPassed = routeMatch && jobMatch && batchMatch;

  console.log(`\n✅ Test ${allPassed ? "PASSED" : "FAILED"}`);
  if (!allPassed) {
    console.log(`  Routes: ${routeMatch ? "✅" : "❌"}`);
    console.log(`  Jobs: ${jobMatch ? "✅" : "❌"}`);
    console.log(`  Batches: ${batchMatch ? "✅" : "❌"}`);
  }
}

console.log("\n🎯 Performance Test");
console.log("-" * 40);

// Performance test with many files
const manyFiles = [];
for (let i = 0; i < 100; i++) {
  manyFiles.push(`inbox/jobs/company${i}/jd.md`);
  manyFiles.push(`pitch/company${i}/script.mdx`);
}

const startTime = Date.now();
const manyJobQueue = processFiles(manyFiles, compiledRoutes);
const duration = Date.now() - startTime;

console.log(`Processed ${manyFiles.length} files in ${duration}ms`);
console.log(`Generated ${manyJobQueue.length} jobs`);
console.log(
  `Performance: ${((manyFiles.length / duration) * 1000).toFixed(0)} files/sec`
);

console.log("\n✅ Unrouting Test Suite Complete!");





