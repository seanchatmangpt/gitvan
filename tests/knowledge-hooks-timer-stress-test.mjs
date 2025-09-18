// tests/knowledge-hooks-timer-stress-test.mjs
// Advanced stress test focusing on timer-based triggers and rapid operations

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Timer Stress Test", () => {
  let testDir;
  let orchestrator;
  let timers = [];

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-knowledge-hooks-timer-stress");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Timer Stress Test"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "timer-stress@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Create GitVan config with fast evaluation
    writeFileSync(
      join(testDir, "gitvan.config.js"),
      `
export default {
  hooks: {
    dirs: ["hooks"],
    autoEvaluate: true,
    evaluationInterval: 50, // Very fast evaluation
  },
  graph: {
    dirs: ["graph"],
    format: "turtle",
    autoCommit: true,
  },
  workflows: {
    dirs: ["workflows"],
    autoExecute: true,
    timeout: 2000, // Short timeout
  },
};
`
    );

    // Initialize orchestrator
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
        timeoutMs: 5000,
      });
    });
  });

  afterEach(() => {
    // Clear all timers
    timers.forEach((timer) => clearInterval(timer));
    timers = [];

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should handle multiple timer intervals", async () => {
    console.log("🧠 Testing multiple timer intervals...");

    // Create hooks for different timer intervals
    const intervals = [100, 200, 500, 1000]; // Different intervals in ms

    intervals.forEach((interval, index) => {
      writeFileSync(
        join(testDir, `hooks/timer-${interval}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:timer-${interval} rdf:type gh:Hook ;
    gv:title "Timer ${interval}ms" ;
    gh:hasPredicate ex:timer-predicate-${interval} ;
    gh:orderedPipelines ex:timer-pipeline-${interval} .

ex:timer-predicate-${interval} rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:Timer .
            ?timer gv:interval ${interval} .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Timer ${interval}ms predicate" .

ex:timer-pipeline-${interval} rdf:type op:Pipeline ;
    op:steps ex:timer-step-${interval} .

ex:timer-step-${interval} rdf:type gv:TemplateStep ;
    gv:text "Timer ${interval}ms triggered at {{ timestamp }}" ;
    gv:filePath "./logs/timer-${interval}.log" .
`
      );
    });

    // Create timer knowledge graph
    writeFileSync(
      join(testDir, "graph/timers.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:timer-100 rdf:type gv:Timer ;
    gv:name "fast-timer" ;
    gv:interval 100 ;
    gv:active true .

ex:timer-200 rdf:type gv:Timer ;
    gv:name "medium-timer" ;
    gv:interval 200 ;
    gv:active true .

ex:timer-500 rdf:type gv:Timer ;
    gv:name "slow-timer" ;
    gv:interval 500 ;
    gv:active true .

ex:timer-1000 rdf:type gv:Timer ;
    gv:name "very-slow-timer" ;
    gv:interval 1000 ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Timer intervals setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test multiple timer intervals
    const testDuration = 3000; // 3 seconds
    const evaluationResults = [];
    const startTime = Date.now();

    // Run evaluations for the test duration
    while (Date.now() - startTime < testDuration) {
      const result = await withGitVan({ cwd: testDir }, async () => {
        return await orchestrator.evaluate({ verbose: false });
      });

      evaluationResults.push({
        result,
        timestamp: Date.now() - startTime,
      });

      // Small delay to prevent overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(`   ✅ Completed timer interval test (${testDuration}ms)`);
    console.log(`   📊 Total evaluations: ${evaluationResults.length}`);
    console.log(
      `   ⚡ Total hooks triggered: ${evaluationResults.reduce(
        (sum, e) => sum + e.result.hooksTriggered,
        0
      )}`
    );

    // Verify timer evaluations
    expect(evaluationResults.length).toBeGreaterThan(0);
    evaluationResults.forEach((evaluation, index) => {
      expect(evaluation.result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should handle rapid sequential evaluations", async () => {
    console.log("🧠 Testing rapid sequential evaluations...");

    // Create a simple hook
    writeFileSync(
      join(testDir, "hooks/rapid-sequential.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:rapid-sequential rdf:type gh:Hook ;
    gv:title "Rapid Sequential" ;
    gh:hasPredicate ex:rapid-predicate ;
    gh:orderedPipelines ex:rapid-pipeline .

ex:rapid-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?counter ?value WHERE {
            ?counter rdf:type gv:Counter .
            ?counter gv:value ?value .
        }
    """ ;
    gh:description "Rapid sequential predicate" .

ex:rapid-pipeline rdf:type op:Pipeline ;
    op:steps ex:rapid-step .

ex:rapid-step rdf:type gv:TemplateStep ;
    gv:text "Rapid evaluation: {{ counter }} = {{ value }}" ;
    gv:filePath "./logs/rapid.log" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Rapid sequential setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Perform rapid sequential evaluations
    const evaluationCount = 50;
    const rapidResults = [];
    const startTime = Date.now();

    for (let i = 0; i < evaluationCount; i++) {
      // Update knowledge graph with counter
      writeFileSync(
        join(testDir, "graph/counter.ttl"),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:counter rdf:type gv:Counter ;
    gv:name "rapid-counter" ;
    gv:value "${i}" ;
    gv:timestamp "${new Date().toISOString()}" .
`
      );

      execSync("git add .", { cwd: testDir, stdio: "inherit" });
      execSync(`git commit -m "Rapid evaluation ${i}"`, {
        cwd: testDir,
        stdio: "inherit",
      });

      const result = await withGitVan({ cwd: testDir }, async () => {
        return await orchestrator.evaluate({ verbose: false });
      });

      rapidResults.push({
        result,
        iteration: i,
        timestamp: Date.now() - startTime,
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(
      `   ✅ Completed ${evaluationCount} rapid sequential evaluations`
    );
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(
      `   📊 Average time per evaluation: ${Math.round(
        duration / evaluationCount
      )}ms`
    );
    console.log(
      `   ⚡ Total hooks triggered: ${rapidResults.reduce(
        (sum, r) => sum + r.result.hooksTriggered,
        0
      )}`
    );

    // Verify rapid evaluations
    expect(rapidResults).toHaveLength(evaluationCount);
    rapidResults.forEach((evaluation, index) => {
      expect(evaluation.result.hooksEvaluated).toBeGreaterThan(0);
    });

    // Verify performance (should complete within reasonable time)
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  it("should handle concurrent timer operations", async () => {
    console.log("🧠 Testing concurrent timer operations...");

    // Create multiple timer hooks
    const timerCount = 5;
    for (let i = 0; i < timerCount; i++) {
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

    // Create concurrent timer knowledge graph
    writeFileSync(
      join(testDir, "graph/concurrent-timers.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:concurrent-timer-0 rdf:type gv:ConcurrentTimer0 ;
    gv:name "concurrent-timer-0" ;
    gv:active true .

ex:concurrent-timer-1 rdf:type gv:ConcurrentTimer1 ;
    gv:name "concurrent-timer-1" ;
    gv:active true .

ex:concurrent-timer-2 rdf:type gv:ConcurrentTimer2 ;
    gv:name "concurrent-timer-2" ;
    gv:active true .

ex:concurrent-timer-3 rdf:type gv:ConcurrentTimer3 ;
    gv:name "concurrent-timer-3" ;
    gv:active true .

ex:concurrent-timer-4 rdf:type gv:ConcurrentTimer4 ;
    gv:name "concurrent-timer-4" ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Concurrent timer setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test concurrent timer operations
    const concurrentOperations = 10;
    const concurrentPromises = [];

    for (let i = 0; i < concurrentOperations; i++) {
      concurrentPromises.push(
        (async () => {
          // Simulate timer tick
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100)
          );

          return await withGitVan({ cwd: testDir }, async () => {
            return await orchestrator.evaluate({ verbose: false });
          });
        })()
      );
    }

    const concurrentResults = await Promise.all(concurrentPromises);

    console.log(
      `   ✅ Completed ${concurrentOperations} concurrent timer operations`
    );
    console.log(`   📊 Total evaluations: ${concurrentResults.length}`);
    console.log(
      `   ⚡ Total hooks triggered: ${concurrentResults.reduce(
        (sum, r) => sum + r.hooksTriggered,
        0
      )}`
    );

    // Verify concurrent operations
    expect(concurrentResults).toHaveLength(concurrentOperations);
    concurrentResults.forEach((result, index) => {
      expect(result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should handle timer-based Git operations", async () => {
    console.log("🧠 Testing timer-based Git operations...");

    // Create timer-based Git hook
    writeFileSync(
      join(testDir, "hooks/timer-git.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:timer-git rdf:type gh:Hook ;
    gv:title "Timer Git" ;
    gh:hasPredicate ex:timer-git-predicate ;
    gh:orderedPipelines ex:timer-git-pipeline .

ex:timer-git-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?status WHERE {
            ?file rdf:type gv:TimerFile .
            ?file gv:status ?status .
        }
    """ ;
    gh:description "Timer-based Git predicate" .

ex:timer-git-pipeline rdf:type op:Pipeline ;
    op:steps ex:timer-git-step .

ex:timer-git-step rdf:type gv:TemplateStep ;
    gv:text "Timer Git: {{ file }} - {{ status }}" ;
    gv:filePath "./logs/timer-git.log" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Timer Git setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test timer-based Git operations
    const timerGitOperations = 20;
    const timerGitResults = [];
    const startTime = Date.now();

    for (let i = 0; i < timerGitOperations; i++) {
      // Create file based on timer
      const timerValue = Date.now() % 1000;
      writeFileSync(
        join(testDir, `timer-file-${i}.txt`),
        `Timer file ${i} - ${timerValue}`
      );

      writeFileSync(
        join(testDir, "graph/timer-files.ttl"),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:timer-file-${i} rdf:type gv:TimerFile ;
    gv:name "timer-file-${i}.txt" ;
    gv:status "created" ;
    gv:path "./timer-file-${i}.txt" ;
    gv:timestamp "${new Date().toISOString()}" .
`
      );

      execSync("git add .", { cwd: testDir, stdio: "inherit" });
      execSync(`git commit -m "Timer Git operation ${i}"`, {
        cwd: testDir,
        stdio: "inherit",
      });

      // Evaluate hooks
      const result = await withGitVan({ cwd: testDir }, async () => {
        return await orchestrator.evaluate({ verbose: false });
      });

      timerGitResults.push({
        result,
        operation: i,
        timerValue,
        timestamp: Date.now() - startTime,
      });

      // Simulate timer interval
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(
      `   ✅ Completed ${timerGitOperations} timer-based Git operations`
    );
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(
      `   📊 Average time per operation: ${Math.round(
        duration / timerGitOperations
      )}ms`
    );
    console.log(
      `   ⚡ Total hooks triggered: ${timerGitResults.reduce(
        (sum, r) => sum + r.result.hooksTriggered,
        0
      )}`
    );

    // Verify timer Git operations
    expect(timerGitResults).toHaveLength(timerGitOperations);
    timerGitResults.forEach((operation, index) => {
      expect(operation.result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should handle extreme timer stress", async () => {
    console.log("🧠 Testing extreme timer stress...");

    // Create many timer hooks
    const extremeTimerCount = 20;
    for (let i = 0; i < extremeTimerCount; i++) {
      writeFileSync(
        join(testDir, `hooks/extreme-timer-${i}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:extreme-timer-${i} rdf:type gh:Hook ;
    gv:title "Extreme Timer ${i}" ;
    gh:hasPredicate ex:extreme-predicate-${i} ;
    gh:orderedPipelines ex:extreme-pipeline-${i} .

ex:extreme-predicate-${i} rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:ExtremeTimer${i} .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Extreme timer ${i} predicate" .

ex:extreme-pipeline-${i} rdf:type op:Pipeline ;
    op:steps ex:extreme-step-${i} .

ex:extreme-step-${i} rdf:type gv:TemplateStep ;
    gv:text "Extreme timer ${i} triggered" ;
    gv:filePath "./logs/extreme-${i}.log" .
`
      );
    }

    // Create extreme timer knowledge graph
    let extremeTimersTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

`;

    for (let i = 0; i < extremeTimerCount; i++) {
      extremeTimersTtl += `ex:extreme-timer-${i} rdf:type gv:ExtremeTimer${i} ;
    gv:name "extreme-timer-${i}" ;
    gv:active true .

`;
    }

    writeFileSync(join(testDir, "graph/extreme-timers.ttl"), extremeTimersTtl);

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Extreme timer setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test extreme timer stress
    const extremeTestDuration = 5000; // 5 seconds
    const extremeResults = [];
    const startTime = Date.now();

    // Run evaluations as fast as possible
    while (Date.now() - startTime < extremeTestDuration) {
      const result = await withGitVan({ cwd: testDir }, async () => {
        return await orchestrator.evaluate({ verbose: false });
      });

      extremeResults.push({
        result,
        timestamp: Date.now() - startTime,
      });

      // Minimal delay to prevent system overload
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   ✅ Completed extreme timer stress test (${duration}ms)`);
    console.log(`   📊 Total evaluations: ${extremeResults.length}`);
    console.log(
      `   📈 Evaluations per second: ${Math.round(
        extremeResults.length / (duration / 1000)
      )}`
    );
    console.log(
      `   ⚡ Total hooks triggered: ${extremeResults.reduce(
        (sum, r) => sum + r.result.hooksTriggered,
        0
      )}`
    );

    // Verify extreme timer stress
    expect(extremeResults.length).toBeGreaterThan(0);
    extremeResults.forEach((evaluation, index) => {
      expect(evaluation.result.hooksEvaluated).toBeGreaterThan(0);
    });

    // Verify performance (should handle high load)
    const evaluationsPerSecond = extremeResults.length / (duration / 1000);
    expect(evaluationsPerSecond).toBeGreaterThan(10); // At least 10 evaluations per second
  });
});
