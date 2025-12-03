// tests/knowledge-hooks-simple-verification.test.mjs
// Simple verification that the Knowledge Hook system is working correctly

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Simple Verification", () => {
  let testDir;
  let orchestrator;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-knowledge-hooks-simple-verification");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Simple Verification"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "simple@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true }); // Create logs directory

    // Create a simple hook that will always trigger
    writeFileSync(
      join(testDir, "hooks/simple-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:simple-hook rdf:type gh:Hook ;
    gv:title "Simple Verification Hook" ;
    gh:hasPredicate ex:simple-predicate ;
    gh:orderedPipelines ex:simple-pipeline .

ex:simple-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            BIND(true AS ?result)
        }
    """ ;
    gh:description "Always true predicate for verification" .

ex:simple-pipeline rdf:type op:Pipeline ;
    op:steps ex:simple-step .

ex:simple-step rdf:type gv:TemplateStep ;
    gv:text "Simple hook triggered at {{ timestamp }}" ;
    gv:filePath "./logs/simple-verification.log" .
`
    );

    // Create knowledge graph data (not strictly needed for always-true predicate)
    writeFileSync(
      join(testDir, "hooks/simple-data.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:simple-data rdf:type gv:SimpleData ;
    gv:name "simple-data" ;
    gv:active true .
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

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Simple verification setup"', {
      cwd: testDir,
      stdio: "inherit",
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should successfully evaluate hooks and trigger workflows", async () => {
    console.log("🧠 Verifying Knowledge Hook system is working...");

    // Evaluate hooks
    const result = await withGitVan({ cwd: testDir }, async () => {
      return await orchestrator.evaluate({ verbose: false });
    });

    console.log("📊 Evaluation result:", {
      hooksTriggered: result.hooksTriggered,
      workflowsExecuted: result.workflowsExecuted,
      evaluationTime: result.evaluationTime,
      success: result.success,
    });

    // Verify the system is working
    expect(result.hooksTriggered).toBeGreaterThan(0);
    expect(result.workflowsExecuted).toBeGreaterThan(0);
    expect(result.success).toBe(true);

    // Check that the log file was created
    const logFile = join(testDir, "logs/simple-verification.log");
    expect(existsSync(logFile)).toBe(true);

    // Check log file content
    const logContent = require("fs").readFileSync(logFile, "utf8");
    expect(logContent).toContain("Simple hook triggered at");

    console.log("✅ Knowledge Hook system is working correctly!");
    console.log(`   - ${result.hooksTriggered} hooks triggered`);
    console.log(`   - ${result.workflowsExecuted} workflows executed`);
    console.log(`   - Evaluation completed in ${result.evaluationTime}ms`);
  }, 30000);
});
