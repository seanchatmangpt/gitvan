// tests/knowledge-hooks-real-breaking-point.test.mjs
// Find the ACTUAL breaking point of the Knowledge Hook system
// Now that logging bottlenecks are removed, we can find real limits

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Real Breaking Point Test", () => {
  let testDir;
  let orchestrator;
  const activeTimers = new Set();

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-real-breaking-point");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Real Breaking Point"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "breaking-point@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Initialize orchestrator with NO VERBOSE LOGGING
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
        timeoutMs: 10000, // Shorter timeout to fail faster
      });
    });
  });

  afterEach(() => {
    // Clear all active timers
    activeTimers.forEach((timerId) => {
      clearInterval(timerId);
      clearTimeout(timerId);
    });
    activeTimers.clear();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should find breaking point with memory pressure", async () => {
    console.log("🧠 Testing memory pressure breaking point...");

    // Create a hook that generates large amounts of data
    writeFileSync(
      join(testDir, "hooks/memory-pressure-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:memory-pressure-hook rdf:type gh:Hook ;
    gv:title "Memory Pressure Hook" ;
    gh:hasPredicate ex:memory-pressure-predicate ;
    gh:orderedPipelines ex:memory-pressure-pipeline .

ex:memory-pressure-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            BIND(true AS ?result)
        }
    """ ;
    gh:description "Always true predicate for memory pressure testing" .

ex:memory-pressure-pipeline rdf:type op:Pipeline ;
    op:steps ex:memory-pressure-step .

ex:memory-pressure-step rdf:type gv:TemplateStep ;
    gv:text "Memory pressure test: {{ 'A'.repeat(1000000) }}" ;
    gv:filePath "./logs/memory-pressure.log" .
`
    );

    // Create knowledge graph with memory-intensive data
    const largeData = "A".repeat(100000); // 100KB of data
    writeFileSync(
      join(testDir, "hooks/memory-data.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:large-data rdf:type gv:LargeData ;
    gv:content "${largeData}" ;
    gv:size ${largeData.length} .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Memory pressure setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    const concurrencyLevels = [100, 500, 1000, 2000, 5000, 10000, 20000];
    const benchmarkResults = [];

    for (const concurrency of concurrencyLevels) {
      console.log(
        `   🔬 Testing ${concurrency} concurrent evaluations with memory pressure...`
      );

      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;
      let memoryErrorCount = 0;
      let timeoutCount = 0;

      try {
        const evaluationPromises = [];

        for (let i = 0; i < concurrency; i++) {
          evaluationPromises.push(
            withGitVan({ cwd: testDir }, async () => {
              try {
                const result = await orchestrator.evaluate({ verbose: false });
                if (result.hooksTriggered > 0) {
                  successCount++;
                }
                return result;
              } catch (error) {
                errorCount++;
                if (
                  error.message.includes("memory") ||
                  error.message.includes("allocation")
                ) {
                  memoryErrorCount++;
                } else if (error.message.includes("timeout")) {
                  timeoutCount++;
                }
                throw error;
              }
            })
          );
        }

        const results = await Promise.allSettled(evaluationPromises);

        results.forEach((result) => {
          if (result.status === "rejected") {
            errorCount++;
            if (
              result.reason.message.includes("memory") ||
              result.reason.message.includes("allocation")
            ) {
              memoryErrorCount++;
            } else if (result.reason.message.includes("timeout")) {
              timeoutCount++;
            }
          }
        });
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency} concurrent evaluations: ${error.message}`
        );
        memoryErrorCount++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const evaluationsPerSecond = successCount / (duration / 1000);
      const errorRate = (errorCount / concurrency) * 100;
      const memoryErrorRate = (memoryErrorCount / concurrency) * 100;
      const timeoutRate = (timeoutCount / concurrency) * 100;

      const status =
        memoryErrorRate > 0
          ? "MEMORY_LIMIT"
          : timeoutRate > 50
          ? "TIMEOUT"
          : errorRate > 50
          ? "FAILED"
          : errorRate > 10
          ? "DEGRADED"
          : "SUCCESS";

      const result = {
        concurrency,
        evaluationsPerSecond: Math.round(evaluationsPerSecond),
        errorRate: Math.round(errorRate * 100) / 100,
        memoryErrorRate: Math.round(memoryErrorRate * 100) / 100,
        timeoutRate: Math.round(timeoutRate * 100) / 100,
        hooksTriggered: successCount,
        status,
      };

      benchmarkResults.push(result);

      console.log(
        `   📊 ${concurrency} concurrent: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.memoryErrorRate}% memory errors, ${result.timeoutRate}% timeouts, ${result.status}`
      );

      if (status === "MEMORY_LIMIT" || errorRate > 50 || timeoutRate > 50) {
        console.log(
          `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent evaluations!`
        );
        break;
      }
    }

    console.log("\n   📈 MEMORY PRESSURE BREAKING POINT RESULTS:");
    console.log("   " + "=".repeat(120));
    console.log(
      "   Concurrency | Eval/sec | Errors | Memory | Timeouts | Hooks | Status"
    );
    console.log("   " + "-".repeat(120));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const memory = `${result.memoryErrorRate || 0}%`.padStart(7);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(12);
      console.log(
        `   ${conc} | ${evalSec} | ${errors} | ${memory} | ${timeouts} | ${hooks} | ${status}`
      );
    });

    const breakingPoint = benchmarkResults.find(
      (r) =>
        r.status === "MEMORY_LIMIT" || r.errorRate > 50 || r.timeoutRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();

    console.log("\n   🎯 MEMORY PRESSURE BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency} concurrent (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.concurrency} concurrent (${breakingPoint.status})`
      );
    } else {
      console.log(
        "\n   ✅ No memory pressure breaking point found within tested limits."
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 300000); // 5 minutes timeout

  it("should find breaking point with CPU pressure", async () => {
    console.log("🧠 Testing CPU pressure breaking point...");

    // Create a hook with complex SPARQL queries
    writeFileSync(
      join(testDir, "hooks/cpu-pressure-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:cpu-pressure-hook rdf:type gh:Hook ;
    gv:title "CPU Pressure Hook" ;
    gh:hasPredicate ex:cpu-pressure-predicate ;
    gh:orderedPipelines ex:cpu-pressure-pipeline .

ex:cpu-pressure-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?s ?p ?o .
            ?o ?q ?r .
            ?r ?s ?t .
            ?t ?u ?v .
            ?v ?w ?x .
            ?x ?y ?z .
            FILTER(?s != ?o && ?o != ?r && ?r != ?t && ?t != ?v && ?v != ?x && ?x != ?z)
        }
    """ ;
    gh:description "Complex SPARQL query for CPU pressure testing" .

ex:cpu-pressure-pipeline rdf:type op:Pipeline ;
    op:steps ex:cpu-pressure-step .

ex:cpu-pressure-step rdf:type gv:TemplateStep ;
    gv:text "CPU pressure test executed at {{ timestamp }}" ;
    gv:filePath "./logs/cpu-pressure.log" .
`
    );

    // Create knowledge graph with complex data
    let complexData = "";
    for (let i = 0; i < 1000; i++) {
      complexData += `
ex:entity${i} rdf:type gv:ComplexEntity ;
    gv:property1 "value${i}" ;
    gv:property2 "value${i * 2}" ;
    gv:property3 "value${i * 3}" ;
    gv:relatedTo ex:entity${(i + 1) % 1000} .
`;
    }

    writeFileSync(
      join(testDir, "hooks/cpu-data.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
${complexData}
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "CPU pressure setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    const concurrencyLevels = [50, 100, 200, 500, 1000, 2000];
    const benchmarkResults = [];

    for (const concurrency of concurrencyLevels) {
      console.log(
        `   🔬 Testing ${concurrency} concurrent CPU-intensive evaluations...`
      );

      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;
      let timeoutCount = 0;
      let cpuErrorCount = 0;

      try {
        const evaluationPromises = [];

        for (let i = 0; i < concurrency; i++) {
          evaluationPromises.push(
            withGitVan({ cwd: testDir }, async () => {
              try {
                const result = await orchestrator.evaluate({ verbose: false });
                if (result.hooksTriggered > 0) {
                  successCount++;
                }
                return result;
              } catch (error) {
                errorCount++;
                if (
                  error.message.includes("timeout") ||
                  error.message.includes("CPU")
                ) {
                  timeoutCount++;
                } else if (
                  error.message.includes("performance") ||
                  error.message.includes("slow")
                ) {
                  cpuErrorCount++;
                }
                throw error;
              }
            })
          );
        }

        const results = await Promise.allSettled(evaluationPromises);

        results.forEach((result) => {
          if (result.status === "rejected") {
            errorCount++;
            if (
              result.reason.message.includes("timeout") ||
              result.reason.message.includes("CPU")
            ) {
              timeoutCount++;
            } else if (
              result.reason.message.includes("performance") ||
              result.reason.message.includes("slow")
            ) {
              cpuErrorCount++;
            }
          }
        });
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency} concurrent evaluations: ${error.message}`
        );
        cpuErrorCount++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const evaluationsPerSecond = successCount / (duration / 1000);
      const errorRate = (errorCount / concurrency) * 100;
      const timeoutRate = (timeoutCount / concurrency) * 100;
      const cpuErrorRate = (cpuErrorCount / concurrency) * 100;

      const status =
        cpuErrorRate > 0
          ? "CPU_LIMIT"
          : timeoutRate > 50
          ? "TIMEOUT"
          : errorRate > 50
          ? "FAILED"
          : errorRate > 10
          ? "DEGRADED"
          : "SUCCESS";

      const result = {
        concurrency,
        evaluationsPerSecond: Math.round(evaluationsPerSecond),
        errorRate: Math.round(errorRate * 100) / 100,
        timeoutRate: Math.round(timeoutRate * 100) / 100,
        cpuErrorRate: Math.round(cpuErrorRate * 100) / 100,
        hooksTriggered: successCount,
        status,
      };

      benchmarkResults.push(result);

      console.log(
        `   📊 ${concurrency} concurrent: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.timeoutRate}% timeouts, ${result.cpuErrorRate}% CPU errors, ${result.status}`
      );

      if (status === "CPU_LIMIT" || errorRate > 50 || timeoutRate > 50) {
        console.log(
          `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent evaluations!`
        );
        break;
      }
    }

    console.log("\n   📈 CPU PRESSURE BREAKING POINT RESULTS:");
    console.log("   " + "=".repeat(120));
    console.log(
      "   Concurrency | Eval/sec | Errors | Timeouts | CPU Errors | Hooks | Status"
    );
    console.log("   " + "-".repeat(120));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const cpuErrors = `${result.cpuErrorRate || 0}%`.padStart(11);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(12);
      console.log(
        `   ${conc} | ${evalSec} | ${errors} | ${timeouts} | ${cpuErrors} | ${hooks} | ${status}`
      );
    });

    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CPU_LIMIT" || r.errorRate > 50 || r.timeoutRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();

    console.log("\n   🎯 CPU PRESSURE BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency} concurrent (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.concurrency} concurrent (${breakingPoint.status})`
      );
    } else {
      console.log(
        "\n   ✅ No CPU pressure breaking point found within tested limits."
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 300000); // 5 minutes timeout

  it("should find breaking point with file I/O pressure", async () => {
    console.log("🧠 Testing file I/O pressure breaking point...");

    // Create a hook that writes many files
    writeFileSync(
      join(testDir, "hooks/io-pressure-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:io-pressure-hook rdf:type gh:Hook ;
    gv:title "I/O Pressure Hook" ;
    gh:hasPredicate ex:io-pressure-predicate ;
    gh:orderedPipelines ex:io-pressure-pipeline .

ex:io-pressure-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            BIND(true AS ?result)
        }
    """ ;
    gh:description "Always true predicate for I/O pressure testing" .

ex:io-pressure-pipeline rdf:type op:Pipeline ;
    op:steps ex:io-pressure-step .

ex:io-pressure-step rdf:type gv:TemplateStep ;
    gv:text "I/O pressure test {{ timestamp }} - {{ 'X'.repeat(10000) }}" ;
    gv:filePath "./logs/io-pressure-{{ timestamp }}.log" .
`
    );

    // Create knowledge graph
    writeFileSync(
      join(testDir, "hooks/io-data.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:io-data rdf:type gv:IOData ;
    gv:name "io-test" ;
    gv:active true .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "I/O pressure setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    const concurrencyLevels = [100, 500, 1000, 2000, 5000, 10000];
    const benchmarkResults = [];

    for (const concurrency of concurrencyLevels) {
      console.log(
        `   🔬 Testing ${concurrency} concurrent I/O-intensive evaluations...`
      );

      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;
      let ioErrorCount = 0;
      let timeoutCount = 0;

      try {
        const evaluationPromises = [];

        for (let i = 0; i < concurrency; i++) {
          evaluationPromises.push(
            withGitVan({ cwd: testDir }, async () => {
              try {
                const result = await orchestrator.evaluate({ verbose: false });
                if (result.hooksTriggered > 0) {
                  successCount++;
                }
                return result;
              } catch (error) {
                errorCount++;
                if (
                  error.message.includes("ENOENT") ||
                  error.message.includes("EACCES") ||
                  error.message.includes("EMFILE")
                ) {
                  ioErrorCount++;
                } else if (error.message.includes("timeout")) {
                  timeoutCount++;
                }
                throw error;
              }
            })
          );
        }

        const results = await Promise.allSettled(evaluationPromises);

        results.forEach((result) => {
          if (result.status === "rejected") {
            errorCount++;
            if (
              result.reason.message.includes("ENOENT") ||
              result.reason.message.includes("EACCES") ||
              result.reason.message.includes("EMFILE")
            ) {
              ioErrorCount++;
            } else if (result.reason.message.includes("timeout")) {
              timeoutCount++;
            }
          }
        });
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency} concurrent evaluations: ${error.message}`
        );
        ioErrorCount++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const evaluationsPerSecond = successCount / (duration / 1000);
      const errorRate = (errorCount / concurrency) * 100;
      const ioErrorRate = (ioErrorCount / concurrency) * 100;
      const timeoutRate = (timeoutCount / concurrency) * 100;

      const status =
        ioErrorRate > 0
          ? "IO_LIMIT"
          : timeoutRate > 50
          ? "TIMEOUT"
          : errorRate > 50
          ? "FAILED"
          : errorRate > 10
          ? "DEGRADED"
          : "SUCCESS";

      const result = {
        concurrency,
        evaluationsPerSecond: Math.round(evaluationsPerSecond),
        errorRate: Math.round(errorRate * 100) / 100,
        ioErrorRate: Math.round(ioErrorRate * 100) / 100,
        timeoutRate: Math.round(timeoutRate * 100) / 100,
        hooksTriggered: successCount,
        status,
      };

      benchmarkResults.push(result);

      console.log(
        `   📊 ${concurrency} concurrent: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.ioErrorRate}% I/O errors, ${result.timeoutRate}% timeouts, ${result.status}`
      );

      if (status === "IO_LIMIT" || errorRate > 50 || timeoutRate > 50) {
        console.log(
          `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent evaluations!`
        );
        break;
      }
    }

    console.log("\n   📈 I/O PRESSURE BREAKING POINT RESULTS:");
    console.log("   " + "=".repeat(120));
    console.log(
      "   Concurrency | Eval/sec | Errors | I/O Errors | Timeouts | Hooks | Status"
    );
    console.log("   " + "-".repeat(120));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const ioErrors = `${result.ioErrorRate || 0}%`.padStart(10);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(12);
      console.log(
        `   ${conc} | ${evalSec} | ${errors} | ${ioErrors} | ${timeouts} | ${hooks} | ${status}`
      );
    });

    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "IO_LIMIT" || r.errorRate > 50 || r.timeoutRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();

    console.log("\n   🎯 I/O PRESSURE BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency} concurrent (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.concurrency} concurrent (${breakingPoint.status})`
      );
    } else {
      console.log(
        "\n   ✅ No I/O pressure breaking point found within tested limits."
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 300000); // 5 minutes timeout
});
