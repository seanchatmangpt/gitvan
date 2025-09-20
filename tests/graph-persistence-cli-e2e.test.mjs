/**
 * GitVan Graph Persistence CLI End-to-End Test
 * 
 * This test demonstrates the complete end-to-end flow:
 * 1. CLI command parsing and routing
 * 2. Graph persistence operations
 * 3. File system integration
 * 4. C4 model implementation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { graphCommand } from "../src/cli/graph-command.mjs";
import { graphCLI } from "../src/cli/graph.mjs";

describe("GitVan Graph Persistence CLI End-to-End", () => {
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-cli-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("CLI Command Integration", () => {
    it("should handle graph help command", async () => {
      const consoleSpy = { log: () => {} };
      const originalConsole = console.log;
      console.log = consoleSpy.log;

      try {
        await graphCommand(["help"]);
        // Help command should not throw
        expect(true).toBe(true);
      } finally {
        console.log = originalConsole;
      }
    });

    it("should handle graph init-default command", async () => {
      const result = await graphCommand(["init-default"], {
        graphDir: testDir,
      });

      // Verify default.ttl was created
      const defaultPath = join(testDir, "default.ttl");
      const exists = await fs.access(defaultPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify content
      const content = await fs.readFile(defaultPath, "utf8");
      expect(content).toContain("@prefix gv:");
      expect(content).toContain("GitVan Project");
    });

    it("should handle graph save command", async () => {
      // First initialize
      await graphCommand(["init-default"], { graphDir: testDir });

      // Add some data via CLI
      const turtle = await import("../src/composables/turtle.mjs");
      const ctx = await import("../src/composables/ctx.mjs");
      
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        // Add test data
        const { Store, DataFactory } = await import("n3");
        const { namedNode, literal } = DataFactory;
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/test/cli"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("https://gitvan.dev/ontology#Test")
        );
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/test/cli"),
          namedNode("http://purl.org/dc/terms/title"),
          literal("CLI Test Data")
        );
      });

      // Save via CLI
      await graphCommand(["save", "cli-test"], { graphDir: testDir });

      // Verify file was created
      const testPath = join(testDir, "cli-test.ttl");
      const exists = await fs.access(testPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify content
      const content = await fs.readFile(testPath, "utf8");
      expect(content).toContain("CLI Test Data");
    });

    it("should handle graph load command", async () => {
      // Create a test file first
      const testContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gv: <https://gitvan.dev/ontology#> .

<https://gitvan.dev/test/load> a gv:Test ;
    dct:title "Load Test Data" ;
    dct:description "Data loaded via CLI" .`;

      const testPath = join(testDir, "load-test.ttl");
      await fs.writeFile(testPath, testContent);

      // Load via CLI
      await graphCommand(["load", "load-test"], { graphDir: testDir });

      // Verify data was loaded by checking stats
      const statsResult = await graphCommand(["stats"], { graphDir: testDir });
      expect(statsResult).toBeDefined();
    });

    it("should handle graph list-files command", async () => {
      // Create some test files
      await fs.writeFile(join(testDir, "file1.ttl"), "test content 1");
      await fs.writeFile(join(testDir, "file2.ttl"), "test content 2");
      await fs.writeFile(join(testDir, "file3.txt"), "not a turtle file");

      // List files via CLI
      const files = await graphCommand(["list-files"], { graphDir: testDir });
      
      expect(files).toHaveLength(2);
      expect(files).toContain("file1.ttl");
      expect(files).toContain("file2.ttl");
      expect(files).not.toContain("file3.txt");
    });

    it("should handle graph stats command", async () => {
      // Initialize and add some data
      await graphCommand(["init-default"], { graphDir: testDir });

      const turtle = await import("../src/composables/turtle.mjs");
      const ctx = await import("../src/composables/ctx.mjs");
      
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        const { Store, DataFactory } = await import("n3");
        const { namedNode } = DataFactory;
        
        // Add multiple quads
        for (let i = 0; i < 5; i++) {
          t.store.addQuad(
            namedNode(`https://gitvan.dev/test/${i}`),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("https://gitvan.dev/ontology#Test")
          );
        }
      });

      // Get stats via CLI
      const stats = await graphCommand(["stats"], { graphDir: testDir });
      
      expect(stats.quads).toBeGreaterThan(0);
      expect(stats.subjects).toBeGreaterThan(0);
      expect(stats.predicates).toBeGreaterThan(0);
      expect(stats.objects).toBeGreaterThan(0);
    });

    it("should handle graph save-default command", async () => {
      // Initialize first
      await graphCommand(["init-default"], { graphDir: testDir });

      // Add data
      const turtle = await import("../src/composables/turtle.mjs");
      const ctx = await import("../src/composables/ctx.mjs");
      
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        const { Store, DataFactory } = await import("n3");
        const { namedNode, literal } = DataFactory;
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/test/default-save"),
          namedNode("http://purl.org/dc/terms/title"),
          literal("Default Save Test")
        );
      });

      // Save to default via CLI
      await graphCommand(["save-default"], { graphDir: testDir });

      // Verify default.ttl was updated
      const defaultPath = join(testDir, "default.ttl");
      const content = await fs.readFile(defaultPath, "utf8");
      expect(content).toContain("Default Save Test");
    });

    it("should handle graph load-default command", async () => {
      // Create a default.ttl file
      const defaultContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gv: <https://gitvan.dev/ontology#> .

<https://gitvan.dev/test/default-load> a gv:Test ;
    dct:title "Default Load Test" ;
    dct:description "Data loaded from default.ttl" .`;

      const defaultPath = join(testDir, "default.ttl");
      await fs.writeFile(defaultPath, defaultContent);

      // Load default via CLI
      const result = await graphCommand(["load-default"], { graphDir: testDir });
      
      expect(result).toBeDefined();
      expect(result.path).toBe(defaultPath);
      expect(result.quads).toBeGreaterThan(0);
    });
  });

  describe("CLI Options Parsing", () => {
    it("should parse graph-dir option", async () => {
      const customDir = join(testDir, "custom-graph");
      await fs.mkdir(customDir, { recursive: true });

      await graphCommand(["init-default"], { graphDir: customDir });

      const defaultPath = join(customDir, "default.ttl");
      const exists = await fs.access(defaultPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should parse validate option", async () => {
      await graphCommand(["init-default"], { 
        graphDir: testDir,
        validate: true 
      });

      // Should not throw with validation enabled
      expect(true).toBe(true);
    });

    it("should parse backup option", async () => {
      // Initialize first
      await graphCommand(["init-default"], { graphDir: testDir });

      // Save with backup
      await graphCommand(["save", "backup-test"], { 
        graphDir: testDir,
        backup: true 
      });

      // Check if backup was created
      const backupPath = join(testDir, "backup-test.ttl.backup");
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid subcommand", async () => {
      await expect(
        graphCommand(["invalid-command"])
      ).rejects.toThrow();
    });

    it("should handle missing arguments", async () => {
      await expect(
        graphCommand(["save"])
      ).rejects.toThrow();
    });

    it("should handle non-existent file load", async () => {
      await expect(
        graphCommand(["load", "non-existent"])
      ).rejects.toThrow("File not found");
    });
  });

  describe("C4 Model Integration", () => {
    it("should implement complete C4 model flow via CLI", async () => {
      // Level 1: Developer uses GitVan CLI
      // Level 2: CLI routes to Graph Module
      // Level 3: Graph Module uses useTurtle and PersistenceHelper
      // Level 4: Complete save/load flow

      // Initialize default graph
      await graphCommand(["init-default"], { graphDir: testDir });

      // Add data programmatically
      const turtle = await import("../src/composables/turtle.mjs");
      const ctx = await import("../src/composables/ctx.mjs");
      
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        const { Store, DataFactory } = await import("n3");
        const { namedNode, literal } = DataFactory;
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/c4/test"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("https://gitvan.dev/ontology#C4Test")
        );
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/c4/test"),
          namedNode("http://purl.org/dc/terms/title"),
          literal("C4 Model Integration Test")
        );
      });

      // Save via CLI (Level 4: Save Flow)
      await graphCommand(["save", "c4-test"], { graphDir: testDir });

      // Verify file exists
      const testPath = join(testDir, "c4-test.ttl");
      const exists = await fs.access(testPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Clear and load via CLI (Level 4: Load Flow)
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        t.store.removeQuads([...t.store]);
      });

      await graphCommand(["load", "c4-test"], { graphDir: testDir });

      // Verify data was loaded
      const stats = await graphCommand(["stats"], { graphDir: testDir });
      expect(stats.quads).toBeGreaterThan(0);
    });

    it("should handle default graph location pattern via CLI", async () => {
      // Initialize default graph location
      await graphCommand(["init-default"], { graphDir: testDir });

      // Add data and save to default location
      const turtle = await import("../src/composables/turtle.mjs");
      const ctx = await import("../src/composables/ctx.mjs");
      
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        const { Store, DataFactory } = await import("n3");
        const { namedNode } = DataFactory;
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/graph/default/cli-test"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("https://gitvan.dev/ontology#Graph")
        );
      });

      // Save to default location via CLI
      await graphCommand(["save-default"], { graphDir: testDir });

      // Load from default location via CLI
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        t.store.removeQuads([...t.store]);
      });

      const result = await graphCommand(["load-default"], { graphDir: testDir });
      
      expect(result).toBeDefined();
      expect(result.path).toBe(join(testDir, "default.ttl"));
      expect(result.quads).toBeGreaterThan(0);
    });
  });

  describe("Real-world Usage Scenarios", () => {
    it("should handle project initialization workflow", async () => {
      // 1. Initialize GitVan project
      await graphCommand(["init-default"], { graphDir: testDir });

      // 2. Add project metadata
      const turtle = await import("../src/composables/turtle.mjs");
      const ctx = await import("../src/composables/ctx.mjs");
      
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        const { Store, DataFactory } = await import("n3");
        const { namedNode, literal } = DataFactory;
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/project/my-project"),
          namedNode("http://purl.org/dc/terms/title"),
          literal("My GitVan Project")
        );
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/project/my-project"),
          namedNode("http://purl.org/dc/terms/description"),
          literal("A project using GitVan graph persistence")
        );
      });

      // 3. Save project data
      await graphCommand(["save", "project-data"], { 
        graphDir: testDir,
        backup: true 
      });

      // 4. List available files
      const files = await graphCommand(["list-files"], { graphDir: testDir });
      expect(files).toContain("project-data.ttl");
      expect(files).toContain("default.ttl");

      // 5. Show statistics
      const stats = await graphCommand(["stats"], { graphDir: testDir });
      expect(stats.quads).toBeGreaterThan(0);
    });

    it("should handle data migration workflow", async () => {
      // 1. Create source data
      const sourceContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://gitvan.dev/migration/source> a dct:Dataset ;
    dct:title "Source Dataset" ;
    dct:created "2025-01-01T00:00:00Z"^^xsd:dateTime .`;

      const sourcePath = join(testDir, "source-data.ttl");
      await fs.writeFile(sourcePath, sourceContent);

      // 2. Load source data
      await graphCommand(["load", "source-data"], { graphDir: testDir });

      // 3. Transform data (add new properties)
      await ctx.withGitVan({ cwd: testDir, root: testDir }, async () => {
        const t = await turtle.useTurtle({ graphDir: testDir });
        
        const { Store, DataFactory } = await import("n3");
        const { namedNode, literal } = DataFactory;
        
        t.store.addQuad(
          namedNode("https://gitvan.dev/migration/source"),
          namedNode("https://gitvan.dev/ontology#migrated"),
          literal("true")
        );
      });

      // 4. Save transformed data
      await graphCommand(["save", "migrated-data"], { 
        graphDir: testDir,
        backup: true 
      });

      // 5. Verify migration
      const migratedPath = join(testDir, "migrated-data.ttl");
      const migratedContent = await fs.readFile(migratedPath, "utf8");
      expect(migratedContent).toContain("Source Dataset");
      expect(migratedContent).toContain("migrated");
    });
  });
});
