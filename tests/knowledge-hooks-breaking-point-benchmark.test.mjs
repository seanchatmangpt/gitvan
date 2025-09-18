// tests/knowledge-hooks-breaking-point-benchmark.test.mjs
// Benchmark test to find the breaking point of the knowledge hook system

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Breaking Point Benchmark", () => {
  let testDir;
  let orchestrator;
  let activeTimers = new Set();

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-breaking-point-benchmark");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Breaking Point Benchmark"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "breaking-point@test.com"', {
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
        graphDir: join(testDir, "hooks"),
        logger: console,
        timeoutMs: 30000, // Longer timeout for stress tests
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

  it("should find the breaking point with increasing timer frequency", async () => {
    console.log("🧠 Finding breaking point with increasing timer frequency...");

    // Create a simple hook that will trigger
    writeFileSync(
      join(testDir, "hooks/breaking-point-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:breaking-point-hook rdf:type gh:Hook ;
    gv:title "Breaking Point Hook" ;
    gh:hasPredicate ex:breaking-point-predicate ;
    gh:orderedPipelines ex:breaking-point-pipeline .

ex:breaking-point-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:BreakingPointTimer .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Breaking point predicate" .

ex:breaking-point-pipeline rdf:type op:Pipeline ;
    op:steps ex:breaking-point-step .

ex:breaking-point-step rdf:type gv:TemplateStep ;
    gv:text "Breaking point hook triggered at {{ timestamp }}" ;
    gv:filePath "./logs/breaking-point.log" .
`
    );

    // Create knowledge graph with breaking point timer
    writeFileSync(
      join(testDir, "graph/breaking-point-timer.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:breaking-point-timer rdf:type gv:BreakingPointTimer ;
    gv:name "breaking-point-timer" ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Breaking point setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test different timer frequencies to find breaking point
    const testFrequencies = [
      { interval: 1000, name: "1 second" },
      { interval: 100, name: "100ms" },
      { interval: 50, name: "50ms" },
      { interval: 10, name: "10ms" },
      { interval: 5, name: "5ms" },
      { interval: 1, name: "1ms" },
      { interval: 0.5, name: "0.5ms" },
      { interval: 0.1, name: "0.1ms" },
    ];

    const benchmarkResults = [];
    const testDuration = 3000; // 3 seconds per test

    for (const frequency of testFrequencies) {
      console.log(
        `   🔬 Testing ${frequency.name} (${frequency.interval}ms interval)...`
      );

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;

      try {
        // Set up timer for this frequency
        const timerId = setInterval(async () => {
          try {
            const result = await withGitVan({ cwd: testDir }, async () => {
              return await orchestrator.evaluate({ verbose: false });
            });

            evaluationResults.push({
              result,
              timestamp: Date.now() - startTime,
            });
            successCount++;
          } catch (error) {
            errorCount++;
            console.log(`   ⚠️ Error at ${frequency.name}: ${error.message}`);
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

        const result = {
          frequency: frequency.name,
          interval: frequency.interval,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            errorRate > 10 ? "FAILED" : errorRate > 5 ? "DEGRADED" : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${frequency.name}: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.status}`
        );

        // If error rate is too high, we've found the breaking point
        if (errorRate > 50) {
          console.log(`   🚨 BREAKING POINT REACHED at ${frequency.name}!`);
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${frequency.name}: ${error.message}`
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
    console.log("\n   📈 BENCHMARK RESULTS:");
    console.log("   " + "=".repeat(80));
    console.log("   Frequency    | Eval/sec | Errors | Hooks | Status");
    console.log("   " + "-".repeat(80));

    benchmarkResults.forEach((result) => {
      const freq = result.frequency.padEnd(12);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(`   ${freq} | ${evalSec} | ${errors} | ${hooks} | ${status}`);
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.errorRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 BREAKING POINT ANALYSIS:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful frequency: ${lastSuccessful.frequency} (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded frequency: ${firstDegraded.frequency} (${firstDegraded.errorRate}% errors)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.frequency} (${breakingPoint.errorRate}% errors)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);
  });

  it("should find the breaking point with increasing concurrent timers", async () => {
    console.log(
      "🧠 Finding breaking point with increasing concurrent timers..."
    );

    // Create hooks for concurrent timers
    const maxConcurrentTimers = 100;
    for (let i = 0; i < maxConcurrentTimers; i++) {
      writeFileSync(
        join(testDir, `hooks/concurrent-timer-${i}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:concurrent-timer-${i} rdf:type gh:Hook ;
    gv:title "Concurrent Timer ${i}" ;
    gh:hasPredicate ex:concurrent-predicate-${i} ;
    gh:orderedPipelines ex:concurrent-pipeline-${i} .

ex:concurrent-predicate-${i} rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:ConcurrentTimer${i} .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Concurrent timer ${i} predicate" .

ex:concurrent-pipeline-${i} rdf:type op:Pipeline ;
    op:steps ex:concurrent-step-${i} .

ex:concurrent-step-${i} rdf:type gv:TemplateStep ;
    gv:text "Concurrent timer ${i} triggered" ;
    gv:filePath "./logs/concurrent-${i}.log" .
`
      );
    }

    // Create knowledge graph with concurrent timers
    let concurrentTimersTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

`;

    for (let i = 0; i < maxConcurrentTimers; i++) {
      concurrentTimersTtl += `ex:concurrent-timer-${i} rdf:type gv:ConcurrentTimer${i} ;
    gv:name "concurrent-timer-${i}" ;
    gv:active true .

`;
    }

    writeFileSync(
      join(testDir, "graph/concurrent-timers.ttl"),
      concurrentTimersTtl
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Concurrent timers setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test different numbers of concurrent timers
    const concurrentLevels = [1, 5, 10, 20, 50, 100];
    const benchmarkResults = [];
    const testDuration = 2000; // 2 seconds per test
    const timerInterval = 100; // 100ms interval for all timers

    for (const concurrentCount of concurrentLevels) {
      console.log(`   🔬 Testing ${concurrentCount} concurrent timers...`);

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;

      try {
        // Set up concurrent timers
        const timerIds = [];
        for (let i = 0; i < concurrentCount; i++) {
          const timerId = setInterval(async () => {
            try {
              const result = await withGitVan({ cwd: testDir }, async () => {
                return await orchestrator.evaluate({ verbose: false });
              });

              evaluationResults.push({
                result,
                timerId: i,
                timestamp: Date.now() - startTime,
              });
              successCount++;
            } catch (error) {
              errorCount++;
              console.log(`   ⚠️ Error in timer ${i}: ${error.message}`);
            }
          }, timerInterval);

          timerIds.push(timerId);
          activeTimers.add(timerId);
        }

        // Wait for test duration
        await new Promise((resolve) => setTimeout(resolve, testDuration));

        // Clear all timers
        timerIds.forEach((timerId) => {
          clearInterval(timerId);
          activeTimers.delete(timerId);
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        const evaluationsPerSecond =
          evaluationResults.length / (duration / 1000);
        const errorRate = (errorCount / (successCount + errorCount)) * 100;

        const result = {
          concurrentCount,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            errorRate > 10 ? "FAILED" : errorRate > 5 ? "DEGRADED" : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${concurrentCount} timers: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.status}`
        );

        // If error rate is too high, we've found the breaking point
        if (errorRate > 50) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrentCount} concurrent timers!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrentCount} concurrent timers: ${error.message}`
        );
        benchmarkResults.push({
          concurrentCount,
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 CONCURRENT TIMER BENCHMARK RESULTS:");
    console.log("   " + "=".repeat(80));
    console.log("   Timers | Eval/sec | Errors | Hooks | Status");
    console.log("   " + "-".repeat(80));

    benchmarkResults.forEach((result) => {
      const timers = result.concurrentCount.toString().padStart(7);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(
        `   ${timers} | ${evalSec} | ${errors} | ${hooks} | ${status}`
      );
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.errorRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 CONCURRENT TIMER BREAKING POINT ANALYSIS:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrentCount} timers (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.concurrentCount} timers (${firstDegraded.errorRate}% errors)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.concurrentCount} timers (${breakingPoint.errorRate}% errors)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);
  });

  it("should find the breaking point with increasing hook complexity", async () => {
    console.log("🧠 Finding breaking point with increasing hook complexity...");

    // Test different levels of hook complexity
    const complexityLevels = [
      { name: "Simple", hookCount: 1, queryComplexity: "simple" },
      { name: "Medium", hookCount: 10, queryComplexity: "medium" },
      { name: "Complex", hookCount: 50, queryComplexity: "complex" },
      { name: "Extreme", hookCount: 100, queryComplexity: "extreme" },
      { name: "Insane", hookCount: 500, queryComplexity: "insane" },
    ];

    const benchmarkResults = [];
    const testDuration = 3000; // 3 seconds per test
    const timerInterval = 100; // 100ms interval

    for (const complexity of complexityLevels) {
      console.log(
        `   🔬 Testing ${complexity.name} complexity (${complexity.hookCount} hooks)...`
      );

      // Create hooks for this complexity level
      for (let i = 0; i < complexity.hookCount; i++) {
        let queryText = "";
        switch (complexity.queryComplexity) {
          case "simple":
            queryText = `ASK WHERE { ?timer rdf:type gv:ComplexityTimer${i} . ?timer gv:active true . }`;
            break;
          case "medium":
            queryText = `ASK WHERE { 
              ?timer rdf:type gv:ComplexityTimer${i} . 
              ?timer gv:active true . 
              ?timer gv:name ?name .
              ?timer gv:interval ?interval .
              FILTER(?interval > 0)
            }`;
            break;
          case "complex":
            queryText = `ASK WHERE { 
              ?timer rdf:type gv:ComplexityTimer${i} . 
              ?timer gv:active true . 
              ?timer gv:name ?name .
              ?timer gv:interval ?interval .
              ?timer gv:created ?created .
              ?timer gv:updated ?updated .
              FILTER(?interval > 0 && ?created < ?updated)
            }`;
            break;
          case "extreme":
            queryText = `ASK WHERE { 
              ?timer rdf:type gv:ComplexityTimer${i} . 
              ?timer gv:active true . 
              ?timer gv:name ?name .
              ?timer gv:interval ?interval .
              ?timer gv:created ?created .
              ?timer gv:updated ?updated .
              ?timer gv:metadata ?metadata .
              ?metadata gv:version ?version .
              ?metadata gv:author ?author .
              FILTER(?interval > 0 && ?created < ?updated && ?version > 1)
            }`;
            break;
          case "insane":
            queryText = `ASK WHERE { 
              ?timer rdf:type gv:ComplexityTimer${i} . 
              ?timer gv:active true . 
              ?timer gv:name ?name .
              ?timer gv:interval ?interval .
              ?timer gv:created ?created .
              ?timer gv:updated ?updated .
              ?timer gv:metadata ?metadata .
              ?metadata gv:version ?version .
              ?metadata gv:author ?author .
              ?metadata gv:tags ?tags .
              ?tags rdf:type gv:Tag .
              ?tags gv:name ?tagName .
              ?timer gv:dependencies ?dep .
              ?dep gv:type ?depType .
              FILTER(?interval > 0 && ?created < ?updated && ?version > 1 && ?depType = "required")
            }`;
            break;
        }

        writeFileSync(
          join(testDir, `hooks/complexity-timer-${i}.ttl`),
          `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:complexity-timer-${i} rdf:type gh:Hook ;
    gv:title "Complexity Timer ${i}" ;
    gh:hasPredicate ex:complexity-predicate-${i} ;
    gh:orderedPipelines ex:complexity-pipeline-${i} .

ex:complexity-predicate-${i} rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ${queryText}
    """ ;
    gh:description "Complexity timer ${i} predicate" .

ex:complexity-pipeline-${i} rdf:type op:Pipeline ;
    op:steps ex:complexity-step-${i} .

ex:complexity-step-${i} rdf:type gv:TemplateStep ;
    gv:text "Complexity timer ${i} triggered" ;
    gv:filePath "./logs/complexity-${i}.log" .
`
        );
      }

      // Create knowledge graph with complexity timers
      let complexityTimersTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

`;

      for (let i = 0; i < complexity.hookCount; i++) {
        complexityTimersTtl += `ex:complexity-timer-${i} rdf:type gv:ComplexityTimer${i} ;
    gv:name "complexity-timer-${i}" ;
    gv:active true ;
    gv:interval 100 ;
    gv:created "2024-01-01T00:00:00Z" ;
    gv:updated "2024-01-01T00:00:01Z" ;
    gv:metadata ex:metadata-${i} .

ex:metadata-${i} rdf:type gv:Metadata ;
    gv:version 2 ;
    gv:author "test" ;
    gv:tags ex:tags-${i} .

ex:tags-${i} rdf:type gv:Tag ;
    gv:name "test-tag" .

ex:complexity-timer-${i} gv:dependencies ex:dep-${i} .

ex:dep-${i} rdf:type gv:Dependency ;
    gv:type "required" .

`;
      }

      writeFileSync(
        join(testDir, "graph/complexity-timers.ttl"),
        complexityTimersTtl
      );

      // Commit changes
      execSync("git add .", { cwd: testDir, stdio: "inherit" });
      execSync(`git commit -m "Complexity ${complexity.name} setup"`, {
        cwd: testDir,
        stdio: "inherit",
      });

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;

      try {
        // Set up timer
        const timerId = setInterval(async () => {
          try {
            const result = await withGitVan({ cwd: testDir }, async () => {
              return await orchestrator.evaluate({ verbose: false });
            });

            evaluationResults.push({
              result,
              timestamp: Date.now() - startTime,
            });
            successCount++;
          } catch (error) {
            errorCount++;
            console.log(`   ⚠️ Error in ${complexity.name}: ${error.message}`);
          }
        }, timerInterval);

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

        const result = {
          complexity: complexity.name,
          hookCount: complexity.hookCount,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            errorRate > 10 ? "FAILED" : errorRate > 5 ? "DEGRADED" : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${complexity.name}: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.status}`
        );

        // If error rate is too high, we've found the breaking point
        if (errorRate > 50) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${complexity.name} complexity!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${complexity.name} complexity: ${error.message}`
        );
        benchmarkResults.push({
          complexity: complexity.name,
          hookCount: complexity.hookCount,
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 COMPLEXITY BENCHMARK RESULTS:");
    console.log("   " + "=".repeat(80));
    console.log("   Complexity | Hooks | Eval/sec | Errors | Hooks | Status");
    console.log("   " + "-".repeat(80));

    benchmarkResults.forEach((result) => {
      const complexity = result.complexity.padEnd(11);
      const hooks = result.hookCount.toString().padStart(5);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const hooksTriggered = (result.hooksTriggered || 0)
        .toString()
        .padStart(5);
      const status = result.status.padEnd(8);
      console.log(
        `   ${complexity} | ${hooks} | ${evalSec} | ${errors} | ${hooksTriggered} | ${status}`
      );
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.errorRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 COMPLEXITY BREAKING POINT ANALYSIS:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.complexity} (${lastSuccessful.hookCount} hooks, ${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.complexity} (${firstDegraded.hookCount} hooks, ${firstDegraded.errorRate}% errors)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.complexity} (${breakingPoint.hookCount} hooks, ${breakingPoint.errorRate}% errors)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);
  });
});
