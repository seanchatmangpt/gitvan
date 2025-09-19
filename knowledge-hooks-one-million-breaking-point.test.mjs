// tests/knowledge-hooks-one-million-breaking-point.test.mjs
// One Million Concurrent Evaluations - The Ultimate Breaking Point Test

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks One Million Breaking Point Test", () => {
  let testDir;
  let orchestrator;
  let activeTimers = new Set();

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-one-million-breaking-point");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "One Million Breaking Point"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "one-million@test.com"', {
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
        timeoutMs: 5000, // Shorter timeout to fail faster
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

  it("should find breaking point with ONE MILLION concurrent evaluations", async () => {
    console.log("💥 ONE MILLION CONCURRENT EVALUATIONS TEST");
    console.log("   🚀 Pushing system to absolute limits...");
    console.log("   ⚠️ This will definitely find the breaking point!");

    // Create a simple hook that will definitely trigger
    writeFileSync(
      join(testDir, "hooks/million-trigger.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:million-trigger rdf:type gh:Hook ;
    gv:title "One Million Trigger" ;
    gh:hasPredicate ex:million-predicate ;
    gh:orderedPipelines ex:million-pipeline .

ex:million-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:MillionTimer .
            ?timer gv:active true .
        }
    """ ;
    gh:description "One million timer predicate" .

ex:million-pipeline rdf:type op:Pipeline ;
    op:steps ex:million-step .

ex:million-step rdf:type gv:TemplateStep ;
    gv:text "One million trigger executed at {{ timestamp }}" ;
    gv:filePath "./logs/million-trigger.log" .
`
    );

    // Create knowledge graph with million timer
    writeFileSync(
      join(testDir, "hooks/million-timer.ttl"), // Put knowledge graph data in hooks directory too
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:million-timer-instance rdf:type gv:MillionTimer ;
    gv:name "million-timer" ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "One million trigger setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test with extreme concurrency levels leading to 1 million
    const concurrencyLevels = [
      1000, 5000, 10000, 50000, 100000, 500000, 1000000,
    ];
    const benchmarkResults = [];
    const testDuration = 1000; // 1 second per test

    for (const concurrency of concurrencyLevels) {
      console.log(
        `   🔬 Testing ${concurrency.toLocaleString()} concurrent evaluations...`
      );

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;
      let timeoutCount = 0;
      let crashCount = 0;

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
                } else if (
                  error.message.includes("crash") ||
                  error.message.includes("memory")
                ) {
                  crashCount++;
                }
                console.log(`   ⚠️ Error in evaluation ${i}: ${error.message}`);
              }
            })()
          );
        }

        // Wait for all evaluations to complete or timeout
        const results = await Promise.allSettled(promises);

        // Count different types of failures
        results.forEach((result) => {
          if (result.status === "rejected") {
            const error = result.reason;
            if (error.message.includes("timeout")) {
              timeoutCount++;
            } else if (
              error.message.includes("crash") ||
              error.message.includes("memory")
            ) {
              crashCount++;
            }
          }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        const evaluationsPerSecond =
          evaluationResults.length / (duration / 1000);
        const errorRate = (errorCount / (successCount + errorCount)) * 100;
        const timeoutRate = (timeoutCount / concurrency) * 100;
        const crashRate = (crashCount / concurrency) * 100;

        const result = {
          concurrency,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          timeoutCount,
          crashCount,
          errorRate: Math.round(errorRate * 100) / 100,
          timeoutRate: Math.round(timeoutRate * 100) / 100,
          crashRate: Math.round(crashRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            crashRate > 50
              ? "CRASHED"
              : timeoutRate > 50
              ? "TIMEOUT"
              : errorRate > 50
              ? "FAILED"
              : errorRate > 10
              ? "DEGRADED"
              : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${concurrency.toLocaleString()} concurrent: ${
            result.evaluationsPerSecond
          } eval/sec, ${result.errorRate}% errors, ${
            result.timeoutRate
          }% timeouts, ${result.crashRate}% crashes, ${result.status}`
        );

        // If crash rate is too high, we've found the breaking point
        if (crashRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency.toLocaleString()} concurrent evaluations!`
          );
          break;
        }

        // If timeout rate is too high, we've found the breaking point
        if (timeoutRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency.toLocaleString()} concurrent evaluations!`
          );
          break;
        }

        // If error rate is too high, we've found the breaking point
        if (errorRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency.toLocaleString()} concurrent evaluations!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency.toLocaleString()} concurrent evaluations: ${
            error.message
          }`
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
    console.log("\n   📈 ONE MILLION BREAKING POINT RESULTS:");
    console.log("   " + "=".repeat(120));
    console.log(
      "   Concurrency | Eval/sec | Errors | Timeouts | Crashes | Hooks | Status"
    );
    console.log("   " + "-".repeat(120));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toLocaleString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const crashes = `${result.crashRate || 0}%`.padStart(8);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(
        `   ${conc} | ${evalSec} | ${errors} | ${timeouts} | ${crashes} | ${hooks} | ${status}`
      );
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) =>
        r.status === "CRASHED" ||
        r.timeoutRate > 80 ||
        r.errorRate > 80 ||
        r.crashRate > 80
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 ONE MILLION BREAKING POINT ANALYSIS:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency.toLocaleString()} concurrent (${
          lastSuccessful.evaluationsPerSecond
        } eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.concurrency.toLocaleString()} concurrent (${
          firstDegraded.errorRate
        }% errors, ${firstDegraded.timeoutRate}% timeouts, ${
          firstDegraded.crashRate
        }% crashes)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 BREAKING POINT: ${breakingPoint.concurrency.toLocaleString()} concurrent (${
          breakingPoint.errorRate
        }% errors, ${breakingPoint.timeoutRate}% timeouts, ${
          breakingPoint.crashRate
        }% crashes)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 300000); // 5 minutes timeout

  it("should find breaking point with ONE MILLION timer frequency", async () => {
    console.log("💥 ONE MILLION TIMER FREQUENCY TEST");
    console.log("   🚀 Testing extreme sub-microsecond timers...");
    console.log("   ⚠️ This will definitely find the breaking point!");

    // Create a simple hook that will definitely trigger
    writeFileSync(
      join(testDir, "hooks/million-frequency-trigger.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:million-frequency-trigger rdf:type gh:Hook ;
    gv:title "One Million Frequency Trigger" ;
    gh:hasPredicate ex:million-frequency-predicate ;
    gh:orderedPipelines ex:million-frequency-pipeline .

ex:million-frequency-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:MillionFrequencyTimer .
            ?timer gv:active true .
        }
    """ ;
    gh:description "One million frequency timer predicate" .

ex:million-frequency-pipeline rdf:type op:Pipeline ;
    op:steps ex:million-frequency-step .

ex:million-frequency-step rdf:type gv:TemplateStep ;
    gv:text "One million frequency trigger executed at {{ timestamp }}" ;
    gv:filePath "./logs/million-frequency-trigger.log" .
`
    );

    // Create knowledge graph with million frequency timer
    writeFileSync(
      join(testDir, "hooks/million-frequency-timer.ttl"), // Put knowledge graph data in hooks directory too
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:million-frequency-timer-instance rdf:type gv:MillionFrequencyTimer ;
    gv:name "million-frequency-timer" ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "One million frequency trigger setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test with extreme timer frequencies leading to 1 million Hz
    const frequencies = [
      { interval: 0.001, name: "0.001ms" },
      { interval: 0.0005, name: "0.0005ms" },
      { interval: 0.0001, name: "0.0001ms" },
      { interval: 0.00005, name: "0.00005ms" },
      { interval: 0.00001, name: "0.00001ms" },
      { interval: 0.000001, name: "0.000001ms" }, // 1 million Hz
    ];

    const benchmarkResults = [];
    const testDuration = 500; // 0.5 seconds per test

    for (const frequency of frequencies) {
      console.log(
        `   🔬 Testing ${frequency.name} (${
          frequency.interval
        }ms interval = ${Math.round(
          1000 / frequency.interval
        ).toLocaleString()} Hz)...`
      );

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;
      let timeoutCount = 0;
      let crashCount = 0;

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
            } else if (
              error.message.includes("crash") ||
              error.message.includes("memory")
            ) {
              crashCount++;
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
        const crashRate = (crashCount / (successCount + errorCount)) * 100;

        const result = {
          frequency: frequency.name,
          interval: frequency.interval,
          hertz: Math.round(1000 / frequency.interval),
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          timeoutCount,
          crashCount,
          errorRate: Math.round(errorRate * 100) / 100,
          timeoutRate: Math.round(timeoutRate * 100) / 100,
          crashRate: Math.round(crashRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            crashRate > 50
              ? "CRASHED"
              : timeoutRate > 50
              ? "TIMEOUT"
              : errorRate > 50
              ? "FAILED"
              : errorRate > 10
              ? "DEGRADED"
              : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${frequency.name}: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.timeoutRate}% timeouts, ${result.crashRate}% crashes, ${result.status}`
        );

        // If crash rate is too high, we've found the breaking point
        if (crashRate > 80) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${frequency.name} frequency!`
          );
          break;
        }

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
          hertz: Math.round(1000 / frequency.interval),
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 ONE MILLION TIMER FREQUENCY RESULTS:");
    console.log("   " + "=".repeat(120));
    console.log(
      "   Frequency | Interval | Hertz | Eval/sec | Errors | Timeouts | Crashes | Hooks | Status"
    );
    console.log("   " + "-".repeat(120));

    benchmarkResults.forEach((result) => {
      const freq = result.frequency.padEnd(10);
      const interval = `${result.interval}ms`.padStart(8);
      const hertz = (result.hertz || 0).toLocaleString().padStart(5);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const timeouts = `${result.timeoutRate || 0}%`.padStart(9);
      const crashes = `${result.crashRate || 0}%`.padStart(8);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(
        `   ${freq} | ${interval} | ${hertz} | ${evalSec} | ${errors} | ${timeouts} | ${crashes} | ${hooks} | ${status}`
      );
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) =>
        r.status === "CRASHED" ||
        r.timeoutRate > 80 ||
        r.errorRate > 80 ||
        r.crashRate > 80
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 ONE MILLION TIMER FREQUENCY BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.frequency} (${lastSuccessful.evaluationsPerSecond} eval/sec, ${lastSuccessful.hertz} Hz)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.frequency} (${firstDegraded.errorRate}% errors, ${firstDegraded.timeoutRate}% timeouts, ${firstDegraded.crashRate}% crashes)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 BREAKING POINT: ${breakingPoint.frequency} (${breakingPoint.errorRate}% errors, ${breakingPoint.timeoutRate}% timeouts, ${breakingPoint.crashRate}% crashes)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);

    // The test should find a breaking point
    expect(breakingPoint).toBeDefined();
  }, 300000); // 5 minutes timeout
});
