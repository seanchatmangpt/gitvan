// tests/knowledge-hooks-extreme-breaking-point.test.mjs
// Extreme Breaking Point Test - Push system to absolute limits until it fails

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Extreme Breaking Point Test", () => {
  let testDir;
  let orchestrator;
  let activeTimers = new Set();

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-extreme-breaking-point");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Extreme Breaking Point"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "extreme@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Initialize orchestrator
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"), // HookOrchestrator expects graphDir, not hookDirs
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

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should find breaking point with extreme concurrent evaluations", async () => {
    console.log("💥 EXTREME BREAKING POINT TEST");
    console.log("   🚀 Pushing system to absolute limits...");

    // Create a simple hook that will definitely trigger
    writeFileSync(
      join(testDir, "hooks/simple-trigger.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:simple-trigger rdf:type gh:Hook ;
    gv:title "Simple Trigger" ;
    gh:hasPredicate ex:simple-predicate ;
    gh:orderedPipelines ex:simple-pipeline .

ex:simple-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:SimpleTimer .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Simple timer predicate" .

ex:simple-pipeline rdf:type op:Pipeline ;
    op:steps ex:simple-step .

ex:simple-step rdf:type gv:TemplateStep ;
    gv:text "Simple trigger executed at {{ timestamp }}" ;
    gv:filePath "./logs/simple-trigger.log" .
`
    );

    // Create knowledge graph with simple timer
    writeFileSync(
      join(testDir, "hooks/simple-timer.ttl"), // Put knowledge graph data in hooks directory too
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:simple-timer-instance rdf:type gv:SimpleTimer ;
    gv:name "simple-timer" ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Simple trigger setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test with extreme concurrency levels
    const concurrencyLevels = [1, 10, 50, 100, 500, 1000, 2000, 5000, 10000];
    const benchmarkResults = [];
    const testDuration = 2000; // 2 seconds per test

    for (const concurrency of concurrencyLevels) {
      console.log(`   🔬 Testing ${concurrency} concurrent evaluations...`);

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;
      let timeoutCount = 0;

      try {
        // Set up concurrent evaluations with Promise.allSettled
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
          promises.push(
            (async () => {
              try {
                const result = await withGitVan({ cwd: testDir }, async () => {
                  return await orchestrator.evaluate({ verbose: false });
                });

                evaluationResults.push({
                  result,
                  concurrency,
                  timestamp: Date.now() - startTime,
                });
                successCount++;
              } catch (error) {
                errorCount++;
                if (error.message.includes("timeout")) {
                  timeoutCount++;
                }
                console.log(`   ⚠️ Error in evaluation ${i}: ${error.message}`);
              }
            })()
          );
        }

        // Wait for all evaluations to complete or timeout
        const results = await Promise.allSettled(promises);

        // Count timeouts
        results.forEach((result) => {
          if (
            result.status === "rejected" &&
            result.reason.message.includes("timeout")
          ) {
            timeoutCount++;
          }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        const evaluationsPerSecond =
          evaluationResults.length / (duration / 1000);
        const errorRate = (errorCount / (successCount + errorCount)) * 100;
        const timeoutRate = (timeoutCount / concurrency) * 100;

        const result = {
          concurrency,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          timeoutCount,
          errorRate: Math.round(errorRate * 100) / 100,
          timeoutRate: Math.round(timeoutRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            timeoutRate > 50
              ? "TIMEOUT"
              : errorRate > 50
              ? "FAILED"
              : errorRate > 10
              ? "DEGRADED"
              : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${concurrency} concurrent: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.timeoutRate}% timeouts, ${result.status}`
        );

        // If timeout rate is too high, we've found the breaking point
        if (timeoutRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent evaluations!`
          );
          break;
        }

        // If error rate is too high, we've found the breaking point
        if (errorRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent evaluations!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency} concurrent evaluations: ${error.message}`
        );
        benchmarkResults.push({
          concurrency,
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 EXTREME BREAKING POINT RESULTS:");
    console.log("   " + "=".repeat(100));
    console.log(
      "   Concurrency | Eval/sec | Errors | Timeouts | Hooks | Status"
    );
    console.log("   " + "-".repeat(100));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(
        `   ${conc} | ${evalSec} | ${errors} | ${timeouts} | ${hooks} | ${status}`
      );
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.timeoutRate > 80 || r.errorRate > 80
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 EXTREME BREAKING POINT ANALYSIS:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency} concurrent (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.concurrency} concurrent (${firstDegraded.errorRate}% errors, ${firstDegraded.timeoutRate}% timeouts)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 BREAKING POINT: ${breakingPoint.concurrency} concurrent (${breakingPoint.errorRate}% errors, ${breakingPoint.timeoutRate}% timeouts)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 120000); // 2 minutes timeout

  it("should find breaking point with extreme timer frequency", async () => {
    console.log("💥 EXTREME TIMER FREQUENCY BREAKING POINT TEST");
    console.log("   🚀 Testing sub-millisecond timers...");

    // Create a simple hook that will definitely trigger
    writeFileSync(
      join(testDir, "hooks/frequency-trigger.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:frequency-trigger rdf:type gh:Hook ;
    gv:title "Frequency Trigger" ;
    gh:hasPredicate ex:frequency-predicate ;
    gh:orderedPipelines ex:frequency-pipeline .

ex:frequency-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:FrequencyTimer .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Frequency timer predicate" .

ex:frequency-pipeline rdf:type op:Pipeline ;
    op:steps ex:frequency-step .

ex:frequency-step rdf:type gv:TemplateStep ;
    gv:text "Frequency trigger executed at {{ timestamp }}" ;
    gv:filePath "./logs/frequency-trigger.log" .
`
    );

    // Create knowledge graph with frequency timer
    writeFileSync(
      join(testDir, "hooks/frequency-timer.ttl"), // Put knowledge graph data in hooks directory too
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:frequency-timer-instance rdf:type gv:FrequencyTimer ;
    gv:name "frequency-timer" ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Frequency trigger setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test with extreme timer frequencies
    const frequencies = [
      { interval: 1, name: "1ms" },
      { interval: 0.5, name: "0.5ms" },
      { interval: 0.1, name: "0.1ms" },
      { interval: 0.05, name: "0.05ms" },
      { interval: 0.01, name: "0.01ms" },
      { interval: 0.001, name: "0.001ms" },
    ];

    const benchmarkResults = [];
    const testDuration = 1000; // 1 second per test

    for (const frequency of frequencies) {
      console.log(
        `   🔬 Testing ${frequency.name} (${frequency.interval}ms interval)...`
      );

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;
      let timeoutCount = 0;

      try {
        // Set up timer with extreme frequency
        const timerId = setInterval(async () => {
          try {
            const result = await withGitVan({ cwd: testDir }, async () => {
              return await orchestrator.evaluate({ verbose: false });
            });

            evaluationResults.push({
              result,
              frequency: frequency.name,
              timestamp: Date.now() - startTime,
            });
            successCount++;
          } catch (error) {
            errorCount++;
            if (error.message.includes("timeout")) {
              timeoutCount++;
            }
            console.log(
              `   ⚠️ Error in ${frequency.name} timer: ${error.message}`
            );
          }
        }, frequency.interval);

        activeTimers.add(timerId);

        // Wait for test duration
        await new Promise((resolve) => setTimeout(resolve, testDuration));

        // Clear timer
        clearInterval(timerId);
        activeTimers.delete(timerId);

        const endTime = Date.now();
        const duration = endTime - startTime;
        const evaluationsPerSecond =
          evaluationResults.length / (duration / 1000);
        const errorRate = (errorCount / (successCount + errorCount)) * 100;
        const timeoutRate = (timeoutCount / (successCount + errorCount)) * 100;

        const result = {
          frequency: frequency.name,
          interval: frequency.interval,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          timeoutCount,
          errorRate: Math.round(errorRate * 100) / 100,
          timeoutRate: Math.round(timeoutRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            timeoutRate > 50
              ? "TIMEOUT"
              : errorRate > 50
              ? "FAILED"
              : errorRate > 10
              ? "DEGRADED"
              : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${frequency.name}: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.timeoutRate}% timeouts, ${result.status}`
        );

        // If timeout rate is too high, we've found the breaking point
        if (timeoutRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${frequency.name} frequency!`
          );
          break;
        }

        // If error rate is too high, we've found the breaking point
        if (errorRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${frequency.name} frequency!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${frequency.name} frequency: ${error.message}`
        );
        benchmarkResults.push({
          frequency: frequency.name,
          interval: frequency.interval,
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 EXTREME TIMER FREQUENCY RESULTS:");
    console.log("   " + "=".repeat(100));
    console.log(
      "   Frequency | Interval | Eval/sec | Errors | Timeouts | Hooks | Status"
    );
    console.log("   " + "-".repeat(100));

    benchmarkResults.forEach((result) => {
      const freq = result.frequency.padEnd(10);
      const interval = `${result.interval}ms`.padStart(8);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(
        `   ${freq} | ${interval} | ${evalSec} | ${errors} | ${timeouts} | ${hooks} | ${status}`
      );
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.timeoutRate > 80 || r.errorRate > 80
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 EXTREME TIMER FREQUENCY BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.frequency} (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.frequency} (${firstDegraded.errorRate}% errors, ${firstDegraded.timeoutRate}% timeouts)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 BREAKING POINT: ${breakingPoint.frequency} (${breakingPoint.errorRate}% errors, ${breakingPoint.timeoutRate}% timeouts)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 120000); // 2 minutes timeout
});
