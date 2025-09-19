// tests/knowledge-hooks-millisecond-timers.test.mjs
// Extreme stress test with actual millisecond-level timers

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Millisecond Timer Stress Test", () => {
  let testDir;
  let orchestrator;
  let activeTimers = new Set();

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-millisecond-timers");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Millisecond Timer Test"', { cwd: testDir, stdio: "inherit" });
    execSync('git config user.email "millisecond-timer@test.com"', { cwd: testDir, stdio: "inherit" });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Initialize orchestrator
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
        timeoutMs: 10000,
      });
    });
  });

  afterEach(() => {
    // Clear all active timers
    activeTimers.forEach(timerId => {
      clearInterval(timerId);
      clearTimeout(timerId);
    });
    activeTimers.clear();

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should handle 1ms timer intervals", async () => {
    console.log("🧠 Testing 1ms timer intervals...");

    // Create hook for 1ms timer
    writeFileSync(join(testDir, "hooks/1ms-timer.ttl"), `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:1ms-timer rdf:type gh:Hook ;
    gv:title "1ms Timer" ;
    gh:hasPredicate ex:1ms-predicate ;
    gh:orderedPipelines ex:1ms-pipeline .

ex:1ms-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:MillisecondTimer .
            ?timer gv:interval 1 .
            ?timer gv:active true .
        }
    """ ;
    gh:description "1ms timer predicate" .

ex:1ms-pipeline rdf:type op:Pipeline ;
    op:steps ex:1ms-step .

ex:1ms-step rdf:type gv:TemplateStep ;
    gv:text "1ms timer triggered at {{ timestamp }}" ;
    gv:filePath "./logs/1ms-timer.log" .
`);

    // Create knowledge graph with 1ms timer
    writeFileSync(join(testDir, "graph/1ms-timer.ttl"), `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:1ms-timer rdf:type gv:MillisecondTimer ;
    gv:name "1ms-timer" ;
    gv:interval 1 ;
    gv:active true .
`);

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "1ms timer setup"', { cwd: testDir, stdio: "inherit" });

    // Test 1ms timer
    const testDuration = 2000; // 2 seconds
    const evaluationResults = [];
    const startTime = Date.now();

    // Set up 1ms interval timer
    const timerId = setInterval(async () => {
      try {
        const result = await withGitVan({ cwd: testDir }, async () => {
          return await orchestrator.evaluate({ verbose: false });
        });
        
        evaluationResults.push({
          result,
          timestamp: Date.now() - startTime,
        });
      } catch (error) {
        console.log(`   ⚠️ Timer evaluation error: ${error.message}`);
      }
    }, 1); // 1ms interval

    activeTimers.add(timerId);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));

    // Clear timer
    clearInterval(timerId);
    activeTimers.delete(timerId);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   ✅ Completed 1ms timer test (${duration}ms)`);
    console.log(`   📊 Total evaluations: ${evaluationResults.length}`);
    console.log(`   📈 Evaluations per second: ${Math.round(evaluationResults.length / (duration / 1000))}`);
    console.log(`   ⚡ Total hooks triggered: ${evaluationResults.reduce((sum, e) => sum + e.result.hooksTriggered, 0)}`);

    // Verify 1ms timer
    expect(evaluationResults.length).toBeGreaterThan(0);
    expect(evaluationResults.length).toBeGreaterThan(1000); // Should have many evaluations in 2 seconds
  });

  it("should handle multiple millisecond timers simultaneously", async () => {
    console.log("🧠 Testing multiple millisecond timers...");

    // Create hooks for different millisecond intervals
    const intervals = [1, 2, 5, 10, 50]; // Different millisecond intervals

    intervals.forEach((interval, index) => {
      writeFileSync(join(testDir, `hooks/${interval}ms-timer.ttl`), `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:${interval}ms-timer rdf:type gh:Hook ;
    gv:title "${interval}ms Timer" ;
    gh:hasPredicate ex:${interval}ms-predicate ;
    gh:orderedPipelines ex:${interval}ms-pipeline .

ex:${interval}ms-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:MillisecondTimer${interval} .
            ?timer gv:interval ${interval} .
            ?timer gv:active true .
        }
    """ ;
    gh:description "${interval}ms timer predicate" .

ex:${interval}ms-pipeline rdf:type op:Pipeline ;
    op:steps ex:${interval}ms-step .

ex:${interval}ms-step rdf:type gv:TemplateStep ;
    gv:text "${interval}ms timer triggered at {{ timestamp }}" ;
    gv:filePath "./logs/${interval}ms-timer.log" .
`);
    });

    // Create knowledge graph with multiple millisecond timers
    let timersTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

`;

    intervals.forEach(interval => {
      timersTtl += `ex:${interval}ms-timer rdf:type gv:MillisecondTimer${interval} ;
    gv:name "${interval}ms-timer" ;
    gv:interval ${interval} ;
    gv:active true .

`;
    });

    writeFileSync(join(testDir, "graph/millisecond-timers.ttl"), timersTtl);

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Multiple millisecond timers setup"', { cwd: testDir, stdio: "inherit" });

    // Test multiple millisecond timers
    const testDuration = 3000; // 3 seconds
    const evaluationResults = [];
    const startTime = Date.now();

    // Set up multiple timers
    intervals.forEach(interval => {
      const timerId = setInterval(async () => {
        try {
          const result = await withGitVan({ cwd: testDir }, async () => {
            return await orchestrator.evaluate({ verbose: false });
          });
          
          evaluationResults.push({
            result,
            interval,
            timestamp: Date.now() - startTime,
          });
        } catch (error) {
          console.log(`   ⚠️ Timer ${interval}ms evaluation error: ${error.message}`);
        }
      }, interval);

      activeTimers.add(timerId);
    });

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));

    // Clear all timers
    activeTimers.forEach(timerId => {
      clearInterval(timerId);
    });
    activeTimers.clear();

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   ✅ Completed multiple millisecond timers test (${duration}ms)`);
    console.log(`   📊 Total evaluations: ${evaluationResults.length}`);
    console.log(`   📈 Evaluations per second: ${Math.round(evaluationResults.length / (duration / 1000))}`);
    console.log(`   ⚡ Total hooks triggered: ${evaluationResults.reduce((sum, e) => sum + e.result.hooksTriggered, 0)}`);

    // Verify multiple millisecond timers
    expect(evaluationResults.length).toBeGreaterThan(0);
    expect(evaluationResults.length).toBeGreaterThan(500); // Should have many evaluations
  });

  it("should handle extreme millisecond timer stress", async () => {
    console.log("🧠 Testing extreme millisecond timer stress...");

    // Create many millisecond timer hooks
    const extremeTimerCount = 50;
    const intervals = [1, 2, 3, 4, 5]; // Very fast intervals

    for (let i = 0; i < extremeTimerCount; i++) {
      const interval = intervals[i % intervals.length];
      writeFileSync(join(testDir, `hooks/extreme-${interval}ms-timer-${i}.ttl`), `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:extreme-${interval}ms-timer-${i} rdf:type gh:Hook ;
    gv:title "Extreme ${interval}ms Timer ${i}" ;
    gh:hasPredicate ex:extreme-${interval}ms-predicate-${i} ;
    gh:orderedPipelines ex:extreme-${interval}ms-pipeline-${i} .

ex:extreme-${interval}ms-predicate-${i} rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:ExtremeTimer${i} .
            ?timer gv:interval ${interval} .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Extreme ${interval}ms timer ${i} predicate" .

ex:extreme-${interval}ms-pipeline-${i} rdf:type op:Pipeline ;
    op:steps ex:extreme-${interval}ms-step-${i} .

ex:extreme-${interval}ms-step-${i} rdf:type gv:TemplateStep ;
    gv:text "Extreme ${interval}ms timer ${i} triggered" ;
    gv:filePath "./logs/extreme-${interval}ms-${i}.log" .
`);
    }

    // Create extreme timer knowledge graph
    let extremeTimersTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

`;
    
    for (let i = 0; i < extremeTimerCount; i++) {
      const interval = intervals[i % intervals.length];
      extremeTimersTtl += `ex:extreme-${interval}ms-timer-${i} rdf:type gv:ExtremeTimer${i} ;
    gv:name "extreme-${interval}ms-timer-${i}" ;
    gv:interval ${interval} ;
    gv:active true .

`;
    }

    writeFileSync(join(testDir, "graph/extreme-millisecond-timers.ttl"), extremeTimersTtl);

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Extreme millisecond timers setup"', { cwd: testDir, stdio: "inherit" });

    // Test extreme millisecond timer stress
    const extremeTestDuration = 5000; // 5 seconds
    const extremeResults = [];
    const startTime = Date.now();

    // Set up extreme timers
    intervals.forEach(interval => {
      const timerId = setInterval(async () => {
        try {
          const result = await withGitVan({ cwd: testDir }, async () => {
            return await orchestrator.evaluate({ verbose: false });
          });
          
          extremeResults.push({
            result,
            interval,
            timestamp: Date.now() - startTime,
          });
        } catch (error) {
          console.log(`   ⚠️ Extreme timer ${interval}ms evaluation error: ${error.message}`);
        }
      }, interval);

      activeTimers.add(timerId);
    });

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, extremeTestDuration));

    // Clear all timers
    activeTimers.forEach(timerId => {
      clearInterval(timerId);
    });
    activeTimers.clear();

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`   ✅ Completed extreme millisecond timer stress test (${duration}ms)`);
    console.log(`   📊 Total evaluations: ${extremeResults.length}`);
    console.log(`   📈 Evaluations per second: ${Math.round(extremeResults.length / (duration / 1000))}`);
    console.log(`   ⚡ Total hooks triggered: ${extremeResults.reduce((sum, r) => sum + r.result.hooksTriggered, 0)}`);

    // Verify extreme millisecond timer stress
    expect(extremeResults.length).toBeGreaterThan(0);
    expect(extremeResults.length).toBeGreaterThan(1000); // Should have many evaluations

    // Verify performance (should handle high load)
    const evaluationsPerSecond = extremeResults.length / (duration / 1000);
    expect(evaluationsPerSecond).toBeGreaterThan(100); // At least 100 evaluations per second
  });

  it("should handle sub-millisecond timer simulation", async () => {
    console.log("🧠 Testing sub-millisecond timer simulation...");

    // Create hook for sub-millisecond timer
    writeFileSync(join(testDir, "hooks/sub-ms-timer.ttl"), `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:sub-ms-timer rdf:type gh:Hook ;
    gv:title "Sub-millisecond Timer" ;
    gh:hasPredicate ex:sub-ms-predicate ;
    gh:orderedPipelines ex:sub-ms-pipeline .

ex:sub-ms-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:SubMillisecondTimer .
            ?timer gv:interval 0.5 .
            ?timer gv:active true .
        }
    """ ;
    gh:description "Sub-millisecond timer predicate" .

ex:sub-ms-pipeline rdf:type op:Pipeline ;
    op:steps ex:sub-ms-step .

ex:sub-ms-step rdf:type gv:TemplateStep ;
    gv:text "Sub-millisecond timer triggered at {{ timestamp }}" ;
    gv:filePath "./logs/sub-ms-timer.log" .
`);

    // Create knowledge graph with sub-millisecond timer
    writeFileSync(join(testDir, "graph/sub-ms-timer.ttl"), `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:sub-ms-timer rdf:type gv:SubMillisecondTimer ;
    gv:name "sub-ms-timer" ;
    gv:interval 0.5 ;
    gv:active true .
`);

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Sub-millisecond timer setup"', { cwd: testDir, stdio: "inherit" });

    // Test sub-millisecond timer (using process.hrtime for high precision)
    const testDuration = 2000; // 2 seconds
    const evaluationResults = [];
    const startTime = process.hrtime.bigint();

    // Use process.hrtime for sub-millisecond precision
    const subMsTimer = () => {
      const now = process.hrtime.bigint();
      const elapsed = Number(now - startTime) / 1000000; // Convert to milliseconds
      
      if (elapsed < testDuration) {
        // Simulate sub-millisecond evaluation
        (async () => {
          try {
            const result = await withGitVan({ cwd: testDir }, async () => {
              return await orchestrator.evaluate({ verbose: false });
            });
            
            evaluationResults.push({
              result,
              timestamp: elapsed,
            });
          } catch (error) {
            console.log(`   ⚠️ Sub-millisecond timer evaluation error: ${error.message}`);
          }
        })();

        // Schedule next evaluation with sub-millisecond precision
        setTimeout(subMsTimer, 0.5); // 0.5ms
      }
    };

    // Start sub-millisecond timer
    subMsTimer();

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    console.log(`   ✅ Completed sub-millisecond timer test (${Math.round(duration)}ms)`);
    console.log(`   📊 Total evaluations: ${evaluationResults.length}`);
    console.log(`   📈 Evaluations per second: ${Math.round(evaluationResults.length / (duration / 1000))}`);
    console.log(`   ⚡ Total hooks triggered: ${evaluationResults.reduce((sum, e) => sum + e.result.hooksTriggered, 0)}`);

    // Verify sub-millisecond timer
    expect(evaluationResults.length).toBeGreaterThan(0);
    expect(evaluationResults.length).toBeGreaterThan(1000); // Should have many evaluations
  });
});