// tests/knowledge-hooks-stress-test.mjs
// Comprehensive stress test for Knowledge Hooks system
// Tests concurrent operations, timers, rapid Git operations, and performance under load

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Stress Test", () => {
  let testDir;
  let orchestrator;
  let startTime;
  let memoryUsage;

  beforeEach(async () => {
    startTime = Date.now();
    memoryUsage = process.memoryUsage();

    // Create test directory
    testDir = join(process.cwd(), "test-knowledge-hooks-stress");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Stress Test"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "stress@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });
    mkdirSync(join(testDir, "workflows"), { recursive: true });

    // Create GitVan config
    writeFileSync(
      join(testDir, "gitvan.config.js"),
      `
export default {
  hooks: {
    dirs: ["hooks"],
    autoEvaluate: true,
    evaluationInterval: 100, // Fast evaluation for stress testing
  },
  graph: {
    dirs: ["graph"],
    format: "turtle",
    autoCommit: true,
  },
  workflows: {
    dirs: ["workflows"],
    autoExecute: true,
    timeout: 5000, // Shorter timeout for stress testing
  },
};
`
    );

    // Initialize orchestrator
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
        timeoutMs: 10000, // 10 second timeout
      });
    });
  });

  afterEach(() => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const finalMemoryUsage = process.memoryUsage();

    console.log(`\n📊 Stress Test Performance:`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(
      `   💾 Memory Start: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    );
    console.log(
      `   💾 Memory End: ${Math.round(
        finalMemoryUsage.heapUsed / 1024 / 1024
      )}MB`
    );
    console.log(
      `   📈 Memory Delta: ${Math.round(
        (finalMemoryUsage.heapUsed - memoryUsage.heapUsed) / 1024 / 1024
      )}MB`
    );

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should handle concurrent hook evaluations", async () => {
    console.log("🧠 Testing concurrent hook evaluations...");

    // Create multiple knowledge hooks
    const hookCount = 10;
    for (let i = 0; i < hookCount; i++) {
      writeFileSync(
        join(testDir, `hooks/hook-${i}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Hook ${i}
ex:hook-${i} rdf:type gh:Hook ;
    gv:title "Concurrent Hook ${i}" ;
    gh:hasPredicate ex:hook-${i}-predicate ;
    gh:orderedPipelines ex:hook-${i}-pipeline .

# ResultDelta Predicate
ex:hook-${i}-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?item ?value WHERE {
            ?item rdf:type gv:Item${i} .
            ?item gv:value ?value .
        }
    """ ;
    gh:description "Detects changes in Item${i} values" .

# Workflow Pipeline
ex:hook-${i}-pipeline rdf:type op:Pipeline ;
    op:steps ex:hook-${i}-step .

# Step
ex:hook-${i}-step rdf:type gv:TemplateStep ;
    gv:text "Hook ${i} triggered: {{ item }} = {{ value }}" ;
    gv:filePath "./logs/hook-${i}.log" .
`
      );
    }

    // Create initial knowledge graph
    writeFileSync(
      join(testDir, "graph/init.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project rdf:type gv:Project ;
    gv:name "stress-test-project" ;
    gv:version "1.0.0" ;
    gv:status "active" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Initial stress test setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test concurrent evaluations
    const concurrentEvaluations = 5;
    const evaluationPromises = [];

    for (let i = 0; i < concurrentEvaluations; i++) {
      evaluationPromises.push(
        withGitVan({ cwd: testDir }, async () => {
          const result = await orchestrator.evaluate({
            verbose: false,
            dryRun: false,
          });
          return result;
        })
      );
    }

    const results = await Promise.all(evaluationPromises);

    console.log(
      `   ✅ Completed ${concurrentEvaluations} concurrent evaluations`
    );
    console.log(
      `   📊 Total hooks evaluated: ${results.reduce(
        (sum, r) => sum + r.hooksEvaluated,
        0
      )}`
    );
    console.log(
      `   ⚡ Total hooks triggered: ${results.reduce(
        (sum, r) => sum + r.hooksTriggered,
        0
      )}`
    );

    // Verify all evaluations completed successfully
    results.forEach((result, index) => {
      expect(result.hooksEvaluated).toBeGreaterThan(0);
      expect(result.hooksTriggered).toBeGreaterThanOrEqual(0);
      expect(result.workflowsExecuted).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle rapid Git operations", async () => {
    console.log("🧠 Testing rapid Git operations...");

    // Create a simple hook
    writeFileSync(
      join(testDir, "hooks/rapid-git-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:rapid-git-hook rdf:type gh:Hook ;
    gv:title "Rapid Git Hook" ;
    gh:hasPredicate ex:rapid-git-predicate ;
    gh:orderedPipelines ex:rapid-git-pipeline .

ex:rapid-git-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?status WHERE {
            ?file rdf:type gv:File .
            ?file gv:status ?status .
        }
    """ ;
    gh:description "Detects rapid file changes" .

ex:rapid-git-pipeline rdf:type op:Pipeline ;
    op:steps ex:rapid-git-step .

ex:rapid-git-step rdf:type gv:TemplateStep ;
    gv:text "Rapid change: {{ file }} - {{ status }}" ;
    gv:filePath "./logs/rapid-git.log" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Initial rapid git test"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Perform rapid Git operations
    const operationCount = 20;
    const operationPromises = [];

    for (let i = 0; i < operationCount; i++) {
      operationPromises.push(
        (async () => {
          // Create and commit a file
          writeFileSync(
            join(testDir, `rapid-file-${i}.txt`),
            `Rapid file ${i}`
          );
          writeFileSync(
            join(testDir, `graph/file-${i}.ttl`),
            `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:file-${i} rdf:type gv:File ;
    gv:name "rapid-file-${i}.txt" ;
    gv:status "created" ;
    gv:path "./rapid-file-${i}.txt" .
`
          );

          execSync("git add .", { cwd: testDir, stdio: "inherit" });
          execSync(`git commit -m "Rapid operation ${i}"`, {
            cwd: testDir,
            stdio: "inherit",
          });

          // Evaluate hooks after each operation
          return await withGitVan({ cwd: testDir }, async () => {
            return await orchestrator.evaluate({ verbose: false });
          });
        })()
      );
    }

    const results = await Promise.all(operationPromises);

    console.log(`   ✅ Completed ${operationCount} rapid Git operations`);
    console.log(`   📊 Total evaluations: ${results.length}`);
    console.log(
      `   ⚡ Total hooks triggered: ${results.reduce(
        (sum, r) => sum + r.hooksTriggered,
        0
      )}`
    );

    // Verify all operations completed
    expect(results).toHaveLength(operationCount);
    results.forEach((result, index) => {
      expect(result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should handle timer-based triggers", async () => {
    console.log("🧠 Testing timer-based triggers...");

    // Create timer-based hook
    writeFileSync(
      join(testDir, "hooks/timer-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:timer-hook rdf:type gh:Hook ;
    gv:title "Timer Hook" ;
    gh:hasPredicate ex:timer-predicate ;
    gh:orderedPipelines ex:timer-pipeline .

ex:timer-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?timer rdf:type gv:Timer .
            ?timer gv:interval ?interval .
            FILTER(?interval < 1000)
        }
    """ ;
    gh:description "Checks for fast timers" .

ex:timer-pipeline rdf:type op:Pipeline ;
    op:steps ex:timer-step .

ex:timer-step rdf:type gv:TemplateStep ;
    gv:text "Timer triggered at {{ timestamp }}" ;
    gv:filePath "./logs/timer.log" .
`
    );

    // Create timer knowledge graph
    writeFileSync(
      join(testDir, "graph/timers.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:timer-1 rdf:type gv:Timer ;
    gv:name "fast-timer" ;
    gv:interval 500 ;
    gv:active true .

ex:timer-2 rdf:type gv:Timer ;
    gv:name "slow-timer" ;
    gv:interval 2000 ;
    gv:active true .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Timer test setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test timer-based evaluations
    const timerEvaluations = 10;
    const timerResults = [];

    for (let i = 0; i < timerEvaluations; i++) {
      // Simulate timer tick
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await withGitVan({ cwd: testDir }, async () => {
        return await orchestrator.evaluate({ verbose: false });
      });

      timerResults.push(result);
    }

    console.log(`   ✅ Completed ${timerEvaluations} timer-based evaluations`);
    console.log(
      `   ⚡ Total hooks triggered: ${timerResults.reduce(
        (sum, r) => sum + r.hooksTriggered,
        0
      )}`
    );

    // Verify timer evaluations
    expect(timerResults).toHaveLength(timerEvaluations);
    timerResults.forEach((result, index) => {
      expect(result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should handle memory pressure and cleanup", async () => {
    console.log("🧠 Testing memory pressure and cleanup...");

    const initialMemory = process.memoryUsage();

    // Create many hooks and knowledge graphs
    const hookCount = 50;
    const graphCount = 100;

    for (let i = 0; i < hookCount; i++) {
      writeFileSync(
        join(testDir, `hooks/memory-hook-${i}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:memory-hook-${i} rdf:type gh:Hook ;
    gv:title "Memory Hook ${i}" ;
    gh:hasPredicate ex:memory-predicate-${i} ;
    gh:orderedPipelines ex:memory-pipeline-${i} .

ex:memory-predicate-${i} rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?item ?value WHERE {
            ?item rdf:type gv:MemoryItem${i} .
            ?item gv:value ?value .
        }
    """ ;
    gh:description "Memory test predicate ${i}" .

ex:memory-pipeline-${i} rdf:type op:Pipeline ;
    op:steps ex:memory-step-${i} .

ex:memory-step-${i} rdf:type gv:TemplateStep ;
    gv:text "Memory hook ${i}: {{ item }} = {{ value }}" ;
    gv:filePath "./logs/memory-${i}.log" .
`
      );
    }

    for (let i = 0; i < graphCount; i++) {
      writeFileSync(
        join(testDir, `graph/memory-${i}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:memory-item-${i} rdf:type gv:MemoryItem${i % hookCount} ;
    gv:name "memory-item-${i}" ;
    gv:value "${i}" ;
    gv:timestamp "${new Date().toISOString()}" .
`
      );
    }

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Memory test setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    const midMemory = process.memoryUsage();

    // Perform many evaluations
    const evaluationCount = 20;
    for (let i = 0; i < evaluationCount; i++) {
      await withGitVan({ cwd: testDir }, async () => {
        await orchestrator.evaluate({ verbose: false });
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage();

    console.log(
      `   📊 Initial Memory: ${Math.round(
        initialMemory.heapUsed / 1024 / 1024
      )}MB`
    );
    console.log(
      `   📊 Mid Memory: ${Math.round(midMemory.heapUsed / 1024 / 1024)}MB`
    );
    console.log(
      `   📊 Final Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`
    );
    console.log(
      `   📈 Memory Growth: ${Math.round(
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      )}MB`
    );

    // Verify memory usage is reasonable (less than 100MB growth)
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
  });

  it("should handle error conditions gracefully", async () => {
    console.log("🧠 Testing error handling under stress...");

    // Create hooks with various error conditions
    writeFileSync(
      join(testDir, "hooks/error-hook-1.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:error-hook-1 rdf:type gh:Hook ;
    gv:title "Error Hook 1" ;
    gh:hasPredicate ex:error-predicate-1 ;
    gh:orderedPipelines ex:error-pipeline-1 .

ex:error-predicate-1 rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?invalid WHERE {
            ?invalid rdf:type gv:NonExistentType .
        }
    """ ;
    gh:description "Invalid query predicate" .

ex:error-pipeline-1 rdf:type op:Pipeline ;
    op:steps ex:error-step-1 .

ex:error-step-1 rdf:type gv:TemplateStep ;
    gv:text "Error step: {{ invalid }}" ;
    gv:filePath "./logs/error-1.log" .
`
    );

    writeFileSync(
      join(testDir, "hooks/error-hook-2.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:error-hook-2 rdf:type gh:Hook ;
    gv:title "Error Hook 2" ;
    gh:hasPredicate ex:error-predicate-2 ;
    gh:orderedPipelines ex:error-pipeline-2 .

ex:error-predicate-2 rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:ValidType .
            ?item gv:invalidProperty ?value .
        }
    """ ;
    gh:description "Valid query predicate" .

ex:error-pipeline-2 rdf:type op:Pipeline ;
    op:steps ex:error-step-2 .

ex:error-step-2 rdf:type gv:TemplateStep ;
    gv:text "Valid step: {{ item }}" ;
    gv:filePath "./logs/error-2.log" .
`
    );

    // Create valid knowledge graph
    writeFileSync(
      join(testDir, "graph/valid.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:valid-item rdf:type gv:ValidType ;
    gv:name "valid-item" ;
    gv:value "test" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Error test setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test error handling with multiple evaluations
    const errorTestCount = 10;
    const errorResults = [];

    for (let i = 0; i < errorTestCount; i++) {
      try {
        const result = await withGitVan({ cwd: testDir }, async () => {
          return await orchestrator.evaluate({ verbose: false });
        });
        errorResults.push(result);
      } catch (error) {
        console.log(`   ⚠️  Error in evaluation ${i}: ${error.message}`);
        errorResults.push({ error: error.message });
      }
    }

    console.log(`   ✅ Completed ${errorTestCount} error handling tests`);
    console.log(
      `   📊 Successful evaluations: ${
        errorResults.filter((r) => !r.error).length
      }`
    );
    console.log(
      `   ❌ Failed evaluations: ${errorResults.filter((r) => r.error).length}`
    );

    // Verify system remains stable despite errors
    expect(errorResults).toHaveLength(errorTestCount);

    // At least some evaluations should succeed
    const successfulResults = errorResults.filter((r) => !r.error);
    expect(successfulResults.length).toBeGreaterThan(0);
  });

  it("should handle mixed workload stress test", async () => {
    console.log("🧠 Testing mixed workload stress...");

    // Create diverse hooks
    const hookTypes = [
      {
        type: "ResultDelta",
        query:
          "SELECT ?file ?status WHERE { ?file rdf:type gv:File . ?file gv:status ?status . }",
      },
      {
        type: "ASK",
        query: "ASK WHERE { ?item rdf:type gv:Item . ?item gv:active true }",
      },
      {
        type: "SELECTThreshold",
        query:
          "SELECT ?count WHERE { { SELECT (COUNT(?item) AS ?count) WHERE { ?item rdf:type gv:Item } } }",
      },
    ];

    hookTypes.forEach((hookType, index) => {
      writeFileSync(
        join(testDir, `hooks/mixed-hook-${index}.ttl`),
        `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:mixed-hook-${index} rdf:type gh:Hook ;
    gv:title "Mixed Hook ${index}" ;
    gh:hasPredicate ex:mixed-predicate-${index} ;
    gh:orderedPipelines ex:mixed-pipeline-${index} .

ex:mixed-predicate-${index} rdf:type gh:${hookType.type} ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ${hookType.query}
    """ ;
    gh:description "Mixed workload predicate ${index}" .

ex:mixed-pipeline-${index} rdf:type op:Pipeline ;
    op:steps ex:mixed-step-${index} .

ex:mixed-step-${index} rdf:type gv:TemplateStep ;
    gv:text "Mixed hook ${index} executed" ;
    gv:filePath "./logs/mixed-${index}.log" .
`
      );
    });

    // Create comprehensive knowledge graph
    writeFileSync(
      join(testDir, "graph/mixed.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:item-1 rdf:type gv:Item ;
    gv:name "item-1" ;
    gv:active true ;
    gv:status "active" .

ex:item-2 rdf:type gv:Item ;
    gv:name "item-2" ;
    gv:active false ;
    gv:status "inactive" .

ex:file-1 rdf:type gv:File ;
    gv:name "file-1.txt" ;
    gv:status "modified" .

ex:file-2 rdf:type gv:File ;
    gv:name "file-2.txt" ;
    gv:status "created" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Mixed workload setup"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Mixed workload: concurrent evaluations + rapid Git operations
    const workloadPromises = [];

    // Concurrent evaluations
    for (let i = 0; i < 5; i++) {
      workloadPromises.push(
        withGitVan({ cwd: testDir }, async () => {
          return await orchestrator.evaluate({ verbose: false });
        })
      );
    }

    // Rapid Git operations
    for (let i = 0; i < 10; i++) {
      workloadPromises.push(
        (async () => {
          writeFileSync(
            join(testDir, `workload-file-${i}.txt`),
            `Workload file ${i}`
          );
          execSync("git add .", { cwd: testDir, stdio: "inherit" });
          execSync(`git commit -m "Workload operation ${i}"`, {
            cwd: testDir,
            stdio: "inherit",
          });

          return await withGitVan({ cwd: testDir }, async () => {
            return await orchestrator.evaluate({ verbose: false });
          });
        })()
      );
    }

    const workloadResults = await Promise.all(workloadPromises);

    console.log(`   ✅ Completed mixed workload stress test`);
    console.log(`   📊 Total operations: ${workloadResults.length}`);
    console.log(
      `   ⚡ Total hooks triggered: ${workloadResults.reduce(
        (sum, r) => sum + (r.hooksTriggered || 0),
        0
      )}`
    );

    // Verify all operations completed
    expect(workloadResults).toHaveLength(15); // 5 concurrent + 10 rapid
    workloadResults.forEach((result, index) => {
      if (result.hooksEvaluated !== undefined) {
        expect(result.hooksEvaluated).toBeGreaterThan(0);
      }
    });
  });
});
