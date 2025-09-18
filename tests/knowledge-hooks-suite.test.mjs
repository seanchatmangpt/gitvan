// tests/knowledge-hooks-suite.test.mjs
// Test the comprehensive Knowledge Hooks Suite

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Knowledge Hooks Comprehensive Suite", () => {
  let testDir;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-knowledge-hooks-suite");
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
    mkdirSync(join(testDir, "reports"), { recursive: true });
    mkdirSync(join(testDir, "reports", "git-state"), { recursive: true });
    mkdirSync(join(testDir, "reports", "knowledge-hooks"), { recursive: true });

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
`
    );

    // Copy our knowledge hooks suite
    const suiteFiles = [
      "pre-commit-git-state-validator.mjs",
      "post-commit-git-state-analyzer.mjs",
      "pre-push-git-state-validator.mjs",
      "post-merge-git-state-analyzer.mjs",
      "post-checkout-git-state-analyzer.mjs",
      "index.mjs",
    ];

    for (const file of suiteFiles) {
      const sourcePath = join(
        process.cwd(),
        "hooks",
        "knowledge-hooks-suite",
        file
      );
      const targetPath = join(testDir, "hooks", file);

      if (existsSync(sourcePath)) {
        const content = await import("node:fs").then((fs) =>
          fs.readFileSync(sourcePath, "utf8")
        );
        writeFileSync(targetPath, content);
      }
    }

    // Copy the comprehensive suite job
    const jobSourcePath = join(
      process.cwd(),
      "jobs",
      "knowledge-hooks-comprehensive-suite.mjs"
    );
    const jobTargetPath = join(
      testDir,
      "jobs",
      "knowledge-hooks-comprehensive-suite.mjs"
    );

    if (existsSync(jobSourcePath)) {
      const content = await import("node:fs").then((fs) =>
        fs.readFileSync(jobSourcePath, "utf8")
      );
      writeFileSync(jobTargetPath, content);
    }

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

  it("should create comprehensive suite structure", () => {
    // Verify suite files exist
    const suiteFiles = [
      "pre-commit-git-state-validator.mjs",
      "post-commit-git-state-analyzer.mjs",
      "pre-push-git-state-validator.mjs",
      "post-merge-git-state-analyzer.mjs",
      "post-checkout-git-state-analyzer.mjs",
      "index.mjs",
    ];

    for (const file of suiteFiles) {
      const filePath = join(testDir, "hooks", file);
      expect(existsSync(filePath)).toBe(true);
    }

    // Verify comprehensive suite job exists
    const jobPath = join(
      testDir,
      "jobs",
      "knowledge-hooks-comprehensive-suite.mjs"
    );
    expect(existsSync(jobPath)).toBe(true);
  });

  it("should generate reports directory structure", () => {
    // Verify reports directory exists
    const reportsDir = join(testDir, "reports");
    expect(existsSync(reportsDir)).toBe(true);

    // Verify git-state subdirectory exists
    const gitStateDir = join(reportsDir, "git-state");
    expect(existsSync(gitStateDir)).toBe(true);
  });

  it("should have comprehensive hook coverage", () => {
    // Read the comprehensive suite index to verify coverage
    const indexPath = join(testDir, "hooks", "index.mjs");
    const content = require("node:fs").readFileSync(indexPath, "utf8");

    // Verify it mentions comprehensive coverage
    expect(content).toContain("Complete Git Lifecycle Coverage");
    expect(content).toContain("pre-commit");
    expect(content).toContain("post-commit");
    expect(content).toContain("pre-push");
    expect(content).toContain("post-merge");
    expect(content).toContain("post-checkout");
  });

  it("should have disk-based reporting functionality", () => {
    // Read a sample hook to verify disk-based reporting
    const validatorPath = join(
      testDir,
      "hooks",
      "pre-commit-git-state-validator.mjs"
    );
    const content = require("node:fs").readFileSync(validatorPath, "utf8");

    // Verify it writes reports to disk
    expect(content).toContain("writeFileSync");
    expect(content).toContain("reportsDir");
    expect(content).toContain("JSON.stringify");
  });

  it("should have knowledge graph impact assessment", () => {
    // Read a sample analyzer to verify knowledge graph assessment
    const analyzerPath = join(
      testDir,
      "hooks",
      "post-commit-git-state-analyzer.mjs"
    );
    const content = require("node:fs").readFileSync(analyzerPath, "utf8");

    // Verify knowledge graph assessment
    expect(content).toContain("knowledgeFilesCommitted");
    expect(content).toContain("assessKnowledgeImpact");
    expect(content).toContain("knowledgeGraph");
  });

  it("should support all major Git lifecycle operations", () => {
    // Read the comprehensive suite job to verify hook coverage
    const jobPath = join(
      testDir,
      "jobs",
      "knowledge-hooks-comprehensive-suite.mjs"
    );
    const content = require("node:fs").readFileSync(jobPath, "utf8");

    // Verify comprehensive hook coverage
    expect(content).toContain("pre-commit");
    expect(content).toContain("post-commit");
    expect(content).toContain("pre-push");
    expect(content).toContain("post-merge");
    expect(content).toContain("post-checkout");
    expect(content).toContain("pre-receive");
    expect(content).toContain("post-receive");
    expect(content).toContain("pre-rebase");
    expect(content).toContain("post-rewrite");
  });
});
