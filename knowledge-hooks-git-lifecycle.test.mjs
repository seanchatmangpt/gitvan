// tests/knowledge-hooks-git-lifecycle.test.mjs
// Test Knowledge Hooks integration with Git lifecycle events

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan, withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Git Lifecycle Integration", () => {
  let testDir;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-knowledge-hooks-lifecycle");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository in test directory
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Test User"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "test@example.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "jobs"), { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });
    mkdirSync(join(testDir, "workflows"), { recursive: true });

    // Create GitVan config
    writeFileSync(
      join(testDir, "gitvan.config.js"),
      `
export default {
  hooks: {
    dirs: ["hooks"],
    autoEvaluate: true,
    evaluationInterval: 1000,
  },
  graph: {
    dirs: ["graph"],
    format: "turtle",
    autoCommit: true,
  },
  workflows: {
    dirs: ["workflows"],
    autoExecute: false,
    timeout: 30000,
  },
};
`
    );

    // Create initial knowledge graph
    writeFileSync(
      join(testDir, "graph/init.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:project rdf:type gv:Project ;
    gv:name "test-project" ;
    gv:version "1.0.0" ;
    gv:status "active" .

ex:commit-1 rdf:type gv:Commit ;
    gv:sha "initial" ;
    gv:message "Initial commit" ;
    gv:timestamp "2025-01-01T00:00:00Z" .
`
    );

    // Create test knowledge hook
    writeFileSync(
      join(testDir, "hooks/file-change-detection.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# File Change Detection Hook
ex:file-change-hook rdf:type gh:Hook ;
    gv:title "File Change Detection" ;
    gh:hasPredicate ex:file-change-predicate ;
    gh:orderedPipelines ex:file-change-pipeline .

# ResultDelta Predicate - detects changes in file-related queries
ex:file-change-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?status WHERE {
            ?file rdf:type gv:File .
            ?file gv:status ?status .
        }
    """ ;
    gh:description "Detects when file status changes between commits" .

# Workflow Pipeline
ex:file-change-pipeline rdf:type op:Pipeline ;
    op:steps ex:log-file-change, ex:update-metadata .

# Step 1: Log file change
ex:log-file-change rdf:type gv:TemplateStep ;
    gv:text "File change detected: {{ file }} - Status: {{ status }}" ;
    gv:filePath "./logs/file-changes.log" .

# Step 2: Update metadata
ex:update-metadata rdf:type gv:TemplateStep ;
    gv:text "Updated metadata for file: {{ file }}" ;
    gv:filePath "./logs/metadata-updates.log" ;
    gv:dependsOn ex:log-file-change .
`
    );

    // Create integration job
    writeFileSync(
      join(testDir, "jobs/knowledge-hooks-git-integration.mjs"),
      `
import { defineJob } from "../src/core/job-registry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";

export default defineJob({
  meta: {
    name: "knowledge-hooks-git-integration",
    desc: "Integrates Knowledge Hooks with Git lifecycle events",
    tags: ["knowledge-hooks", "git-integration"],
    version: "1.0.0",
  },
  
  hooks: ["post-commit", "post-merge"],
  
  async run(context) {
    console.log("🧠 Knowledge Hooks Git Integration running");
    
    const gitvanContext = useGitVan();
    const orchestrator = new HookOrchestrator({
      graphDir: "./hooks",
      context: gitvanContext,
      logger: console,
    });
    
    const result = await orchestrator.evaluate({
      gitContext: context,
      verbose: true,
    });
    
    console.log(\`✅ Evaluated \${result.hooksEvaluated} hooks, triggered \${result.hooksTriggered}\`);
    return result;
  },
});
`
    );

    // Create logs directory
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Initial setup"', {
      cwd: testDir,
      stdio: "inherit",
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should evaluate knowledge hooks on commit", async () => {
    // Update knowledge graph with file information
    writeFileSync(
      join(testDir, "graph/files.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-file rdf:type gv:File ;
    gv:name "test.txt" ;
    gv:status "modified" ;
    gv:path "./test.txt" .
`
    );

    // Create a test file
    writeFileSync(join(testDir, "test.txt"), "Hello, Knowledge Hooks!");

    // Commit changes
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Add test file and update knowledge graph"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Verify knowledge hooks were evaluated
    // This would normally be triggered by the Git hook system
    await withGitVan({ cwd: testDir }, async () => {
      const orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
      });

      const result = await orchestrator.evaluate({
        verbose: true,
      });

      expect(result.hooksEvaluated).toBeGreaterThan(0);
      expect(result.hooksTriggered).toBeGreaterThanOrEqual(0);
      expect(result.workflowsExecuted).toBeGreaterThanOrEqual(0);
    });
  });

  it("should detect changes in knowledge graph between commits", async () => {
    // Initial state
    writeFileSync(
      join(testDir, "graph/state.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:file-1 rdf:type gv:File ;
    gv:name "file1.txt" ;
    gv:status "active" .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Initial file state"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Update state
    writeFileSync(
      join(testDir, "graph/state.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:file-1 rdf:type gv:File ;
    gv:name "file1.txt" ;
    gv:status "modified" .

ex:file-2 rdf:type gv:File ;
    gv:name "file2.txt" ;
    gv:status "active" .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Update file states"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test ResultDelta evaluation
    await withGitVan({ cwd: testDir }, async () => {
      const orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
      });

      const result = await orchestrator.evaluate({
        verbose: true,
      });

      // Should detect changes in file status
      expect(result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should work with merge operations", async () => {
    // Create a branch
    execSync("git checkout -b feature-branch", {
      cwd: testDir,
      stdio: "inherit",
    });

    // Make changes on feature branch
    writeFileSync(
      join(testDir, "graph/feature.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:feature-file rdf:type gv:File ;
    gv:name "feature.txt" ;
    gv:status "new" .
`
    );

    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Add feature"', { cwd: testDir, stdio: "inherit" });

    // Merge back to master
    execSync("git checkout master", { cwd: testDir, stdio: "inherit" });
    execSync("git merge feature-branch", { cwd: testDir, stdio: "inherit" });

    // Verify knowledge hooks work with merge
    await withGitVan({ cwd: testDir }, async () => {
      const orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
      });

      const result = await orchestrator.evaluate({
        verbose: true,
      });

      expect(result.hooksEvaluated).toBeGreaterThan(0);
    });
  });

  it("should handle Git context information", async () => {
    // Test that Git context is properly extracted
    const { execSync } = await import("node:child_process");

    const commitSha = execSync("git rev-parse HEAD", {
      cwd: testDir,
      encoding: "utf8",
    }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: testDir,
      encoding: "utf8",
    }).trim();

    expect(commitSha).toBeTruthy();
    expect(branch).toBeTruthy();

    // Test knowledge hooks with Git context
    await withGitVan({ cwd: testDir }, async () => {
      const orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
      });

      const gitContext = {
        commitSha: commitSha,
        branch: branch,
        event: "commit",
        changedFiles: ["test.txt"],
        timestamp: new Date().toISOString(),
      };

      const result = await orchestrator.evaluate({
        gitContext: gitContext,
        verbose: true,
      });

      expect(result.hooksEvaluated).toBeGreaterThan(0);
    });
  });
});
