/**
 * GitVan Graph Persistence Tests
 * Comprehensive test suite for the graph persistence functionality
 *
 * Tests the PersistenceHelper class and useTurtle composable persistence methods
 * as described in the C4 model for "GitVan Graph Persistence" feature.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  PersistenceHelper,
  createPersistenceHelper,
} from "../src/utils/persistence-helper.mjs";
import { useTurtle } from "../src/composables/turtle.mjs";
import { withGitVan } from "../src/composables/ctx.mjs";

describe("PersistenceHelper", () => {
  let testDir;
  let persistence;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-persistence-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    persistence = createPersistenceHelper({
      logger: { debug: () => {}, error: () => {}, warn: () => {} },
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Directory Operations", () => {
    it("should create directory if it does not exist", async () => {
      const newDir = join(testDir, "new-directory");
      const result = await persistence.ensureDirectory(newDir);

      expect(result).toBe(newDir);
      const stats = await fs.stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should not fail if directory already exists", async () => {
      const existingDir = join(testDir, "existing-directory");
      await fs.mkdir(existingDir);

      const result = await persistence.ensureDirectory(existingDir);
      expect(result).toBe(existingDir);
    });

    it("should create nested directories", async () => {
      const nestedDir = join(testDir, "level1", "level2", "level3");
      const result = await persistence.ensureDirectory(nestedDir);

      expect(result).toBe(nestedDir);
      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("File Operations", () => {
    it("should write Turtle file with atomic operation", async () => {
      const filePath = join(testDir, "test.ttl");
      const content = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource .`;

      const result = await persistence.writeTurtleFile(filePath, content);

      expect(result.path).toBe(filePath);
      expect(result.bytes).toBeGreaterThan(0);

      const writtenContent = await fs.readFile(filePath, "utf8");
      expect(writtenContent).toBe(content);
    });

    it("should read Turtle file content", async () => {
      const filePath = join(testDir, "test.ttl");
      const content = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource .`;

      await fs.writeFile(filePath, content);

      const result = await persistence.readTurtleFile(filePath);
      expect(result).toBe(content);
    });

    it("should return null for non-existent file", async () => {
      const filePath = join(testDir, "non-existent.ttl");
      const result = await persistence.readTurtleFile(filePath);
      expect(result).toBeNull();
    });

    it("should validate Turtle content when requested", async () => {
      const filePath = join(testDir, "valid.ttl");
      const validContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource .`;

      await expect(
        persistence.writeTurtleFile(filePath, validContent, { validate: true })
      ).resolves.toBeDefined();

      const invalidContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource . invalid syntax here`;

      await expect(
        persistence.writeTurtleFile(filePath, invalidContent, {
          validate: true,
        })
      ).rejects.toThrow("Invalid Turtle content");
    });

    it("should create backup when requested", async () => {
      const filePath = join(testDir, "test.ttl");
      const originalContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/original> a rdf:Resource .`;
      const newContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/new> a rdf:Resource .`;

      // Write original content
      await fs.writeFile(filePath, originalContent);

      // Write new content with backup
      await persistence.writeTurtleFile(filePath, newContent, {
        createBackup: true,
      });

      // Check that backup exists
      const backupPath = `${filePath}.backup`;
      const backupExists = await persistence.fileExists(backupPath);
      expect(backupExists).toBe(true);

      // Check that backup contains original content
      const backupContent = await fs.readFile(backupPath, "utf8");
      expect(backupContent).toBe(originalContent);

      // Check that main file contains new content
      const mainContent = await fs.readFile(filePath, "utf8");
      expect(mainContent).toBe(newContent);
    });
  });

  describe("Default Graph Operations", () => {
    it("should write default.ttl file", async () => {
      const content = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/default> a rdf:Resource .`;

      const result = await persistence.writeDefaultGraph(testDir, content);

      expect(result.path).toBe(join(testDir, "default.ttl"));
      expect(result.bytes).toBeGreaterThan(0);

      const writtenContent = await fs.readFile(
        join(testDir, "default.ttl"),
        "utf8"
      );
      expect(writtenContent).toBe(content);
    });

    it("should read default.ttl file", async () => {
      const content = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/default> a rdf:Resource .`;

      await fs.writeFile(join(testDir, "default.ttl"), content);

      const result = await persistence.readDefaultGraph(testDir);
      expect(result).toBe(content);
    });

    it("should return null for non-existent default.ttl", async () => {
      const result = await persistence.readDefaultGraph(testDir);
      expect(result).toBeNull();
    });
  });

  describe("File System Queries", () => {
    it("should check if file exists", async () => {
      const filePath = join(testDir, "test.ttl");

      expect(await persistence.fileExists(filePath)).toBe(false);

      await fs.writeFile(filePath, "test content");

      expect(await persistence.fileExists(filePath)).toBe(true);
    });

    it("should check if directory exists", async () => {
      const dirPath = join(testDir, "test-dir");

      expect(await persistence.directoryExists(dirPath)).toBe(false);

      await fs.mkdir(dirPath);

      expect(await persistence.directoryExists(dirPath)).toBe(true);
    });

    it("should list Turtle files in directory", async () => {
      // Create some test files
      await fs.writeFile(join(testDir, "file1.ttl"), "content1");
      await fs.writeFile(join(testDir, "file2.ttl"), "content2");
      await fs.writeFile(join(testDir, "file3.txt"), "content3"); // Not a .ttl file

      const turtleFiles = await persistence.listTurtleFiles(testDir);

      expect(turtleFiles).toHaveLength(2);
      expect(turtleFiles).toContain("file1.ttl");
      expect(turtleFiles).toContain("file2.ttl");
      expect(turtleFiles).not.toContain("file3.txt");
    });

    it("should return empty array for non-existent directory", async () => {
      const nonExistentDir = join(testDir, "non-existent");
      const files = await persistence.listTurtleFiles(nonExistentDir);
      expect(files).toEqual([]);
    });
  });

  describe("RDF Operations", () => {
    it("should serialize N3 Store to Turtle", async () => {
      const { Store, DataFactory } = await import("n3");
      const store = new Store();
      const { namedNode } = DataFactory;

      // Add some test data
      store.addQuad(
        namedNode("http://example.org/test"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/Resource")
      );

      const turtle = await persistence.serializeStore(store);

      expect(turtle).toContain("@prefix");
      expect(turtle).toContain("ex:test");
      expect(turtle).toContain("a");
    });

    it("should parse Turtle to N3 Store", () => {
      const turtle = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource .`;

      const store = persistence.parseTurtle(turtle);

      expect(store.size).toBe(1);
    });

    it("should validate Turtle content", async () => {
      const validTurtle = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource .`;

      await expect(
        persistence.validateTurtleContent(validTurtle)
      ).resolves.toBeUndefined();

      const invalidTurtle = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource . invalid syntax`;

      await expect(
        persistence.validateTurtleContent(invalidTurtle)
      ).rejects.toThrow("Invalid Turtle content");
    });
  });

  describe("File Statistics", () => {
    it("should get file statistics", async () => {
      const filePath = join(testDir, "test.ttl");
      const content = "test content";

      await fs.writeFile(filePath, content);

      const stats = await persistence.getFileStats(filePath);

      expect(stats).toBeDefined();
      expect(stats.size).toBe(content.length);
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
    });

    it("should return null for non-existent file", async () => {
      const filePath = join(testDir, "non-existent.ttl");
      const stats = await persistence.getFileStats(filePath);
      expect(stats).toBeNull();
    });
  });

  describe("Backup Operations", () => {
    it("should create file backup", async () => {
      const filePath = join(testDir, "test.ttl");
      const backupPath = join(testDir, "test.ttl.backup");
      const content = "test content";

      await fs.writeFile(filePath, content);

      await persistence.createBackup(filePath, backupPath);

      const backupExists = await persistence.fileExists(backupPath);
      expect(backupExists).toBe(true);

      const backupContent = await fs.readFile(backupPath, "utf8");
      expect(backupContent).toBe(content);
    });
  });

  describe("File Removal", () => {
    it("should remove existing file", async () => {
      const filePath = join(testDir, "test.ttl");
      await fs.writeFile(filePath, "test content");

      const removed = await persistence.removeFile(filePath);

      expect(removed).toBe(true);
      const exists = await persistence.fileExists(filePath);
      expect(exists).toBe(false);
    });

    it("should return false for non-existent file", async () => {
      const filePath = join(testDir, "non-existent.ttl");

      const removed = await persistence.removeFile(filePath);

      expect(removed).toBe(false);
    });
  });
});

describe("useTurtle Persistence Integration", () => {
  let testDir;
  let turtle;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-turtle-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create a test context
    const context = {
      cwd: testDir,
      root: testDir,
    };

    await withGitVan(context, async () => {
      turtle = await useTurtle({ graphDir: testDir });
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Graph Save Operations", () => {
    it("should save graph to file", async () => {
      // Add some data to the store
      const { Store, DataFactory } = await import("n3");
      const testStore = new Store();
      const { namedNode } = DataFactory;
      testStore.addQuad(
        namedNode("http://example.org/test"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/Resource")
      );

      // Replace the turtle store with our test data
      turtle.store.removeQuads([...turtle.store]);
      for (const quad of testStore) {
        turtle.store.add(quad);
      }

      const result = await turtle.saveGraph("test-graph");

      expect(result.path).toBe(join(testDir, "test-graph.ttl"));
      expect(result.bytes).toBeGreaterThan(0);

      // Verify file was created
      const fileExists = await turtle
        .getPersistenceHelper()
        .fileExists(result.path);
      expect(fileExists).toBe(true);
    });

    it("should save default graph", async () => {
      // Add some data to the store
      const { Store, DataFactory } = await import("n3");
      const testStore = new Store();
      const { namedNode } = DataFactory;
      testStore.addQuad(
        namedNode("http://example.org/default"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/Resource")
      );

      turtle.store.removeQuads([...turtle.store]);
      for (const quad of testStore) {
        turtle.store.add(quad);
      }

      const result = await turtle.saveDefaultGraph();

      expect(result.path).toBe(join(testDir, "default.ttl"));
      expect(result.bytes).toBeGreaterThan(0);

      // Verify file was created
      const fileExists = await turtle
        .getPersistenceHelper()
        .fileExists(result.path);
      expect(fileExists).toBe(true);
    });
  });

  describe("Graph Load Operations", () => {
    it("should load graph from file", async () => {
      // Create a test Turtle file
      const testContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/test> a rdf:Resource .`;

      await fs.writeFile(join(testDir, "test-graph.ttl"), testContent);

      // Clear the store first
      turtle.store.removeQuads([...turtle.store]);

      const result = await turtle.loadGraph("test-graph");

      expect(result.path).toBe(join(testDir, "test-graph.ttl"));
      expect(result.quads).toBeGreaterThan(0);

      // Verify data was loaded
      expect(turtle.store.size).toBeGreaterThan(0);
    });

    it("should load default graph", async () => {
      // Create a test default.ttl file
      const testContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/default> a rdf:Resource .`;

      await fs.writeFile(join(testDir, "default.ttl"), testContent);

      // Clear the store first
      turtle.store.removeQuads([...turtle.store]);

      const result = await turtle.loadDefaultGraph();

      expect(result.path).toBe(join(testDir, "default.ttl"));
      expect(result.quads).toBeGreaterThan(0);

      // Verify data was loaded
      expect(turtle.store.size).toBeGreaterThan(0);
    });

    it("should return null when loading non-existent default graph", async () => {
      const result = await turtle.loadDefaultGraph();
      expect(result).toBeNull();
    });

    it("should throw error when loading non-existent graph file", async () => {
      await expect(turtle.loadGraph("non-existent")).rejects.toThrow(
        "File not found: non-existent.ttl"
      );
    });
  });

  describe("Default Graph Initialization", () => {
    it("should initialize default graph with built-in template", async () => {
      const result = await turtle.initializeDefaultGraph();

      expect(result.path).toBe(join(testDir, "default.ttl"));
      expect(result.bytes).toBeGreaterThan(0);
      expect(result.created).toBe(true);

      // Verify file was created
      const fileExists = await turtle
        .getPersistenceHelper()
        .fileExists(result.path);
      expect(fileExists).toBe(true);
    });

    it("should not recreate existing default graph", async () => {
      // Create an existing default.ttl
      const existingContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/existing> a rdf:Resource .`;

      await fs.writeFile(join(testDir, "default.ttl"), existingContent);

      const result = await turtle.initializeDefaultGraph();

      expect(result.created).toBe(false);

      // Verify original content is preserved
      const content = await fs.readFile(join(testDir, "default.ttl"), "utf8");
      expect(content).toBe(existingContent);
    });

    it("should initialize with custom template", async () => {
      const templatePath = join(testDir, "custom-template.ttl");
      const templateContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
<http://example.org/custom> a rdf:Resource .`;

      await fs.writeFile(templatePath, templateContent);

      const result = await turtle.initializeDefaultGraph({ templatePath });

      expect(result.created).toBe(true);

      // Verify custom content was used
      const content = await fs.readFile(join(testDir, "default.ttl"), "utf8");
      expect(content).toBe(templateContent);
    });
  });

  describe("File Listing", () => {
    it("should list Turtle files in graph directory", async () => {
      // Create some test files
      await fs.writeFile(join(testDir, "file1.ttl"), "content1");
      await fs.writeFile(join(testDir, "file2.ttl"), "content2");
      await fs.writeFile(join(testDir, "file3.txt"), "content3"); // Not a .ttl file

      const files = await turtle.listGraphFiles();

      expect(files).toHaveLength(2);
      expect(files).toContain("file1.ttl");
      expect(files).toContain("file2.ttl");
      expect(files).not.toContain("file3.txt");
    });
  });

  describe("Store Statistics", () => {
    it("should get store statistics", async () => {
      // Add some test data
      const { Store, DataFactory } = await import("n3");
      const testStore = new Store();
      const { namedNode } = DataFactory;
      testStore.addQuad(
        namedNode("http://example.org/test1"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/Resource")
      );
      testStore.addQuad(
        namedNode("http://example.org/test2"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://example.org/Resource")
      );

      turtle.store.removeQuads([...turtle.store]);
      for (const quad of testStore) {
        turtle.store.add(quad);
      }

      const stats = turtle.getStoreStats();

      expect(stats.quads).toBe(2);
      expect(stats.subjects).toBe(2);
      expect(stats.predicates).toBe(1);
      expect(stats.objects).toBe(1);
      expect(stats.graphs).toBe(1);
    });
  });

  describe("Persistence Helper Access", () => {
    it("should provide access to persistence helper", async () => {
      const helper = turtle.getPersistenceHelper();

      expect(helper).toBeDefined();
      expect(helper).toBeInstanceOf(PersistenceHelper);
    });
  });
});

describe("C4 Model Integration", () => {
  let testDir;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-c4-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should implement the complete C4 model flow", async () => {
    const context = {
      cwd: testDir,
      root: testDir,
    };

    await withGitVan(context, async () => {
      // Level 1: System Context - Developer uses GitVan
      const turtle = await useTurtle({ graphDir: testDir });

      // Level 2: Containers - Workflow Engine uses Graph Module
      // Level 3: Components - useTurtle uses RdfEngine and PersistenceHelper

      // Initialize default graph (PersistenceHelper ensures directory)
      const initResult = await turtle.initializeDefaultGraph();
      expect(initResult.created).toBe(true);

      // Add some data to the store
      const { Store, DataFactory } = await import("n3");
      const testStore = new Store();
      const { namedNode } = DataFactory;
      testStore.addQuad(
        namedNode("https://gitvan.dev/project/test"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://gitvan.dev/ontology#Project")
      );

      turtle.store.removeQuads([...turtle.store]);
      for (const quad of testStore) {
        turtle.store.add(quad);
      }

      // Level 4: Code/Sequence - Save Flow
      // Developer triggers save workflow
      const saveResult = await turtle.saveGraph("project-data");

      // useTurtle.saveGraph() -> RdfEngine.serializeTurtle() -> PersistenceHelper.writeTurtleFile()
      expect(saveResult.path).toBe(join(testDir, "project-data.ttl"));
      expect(saveResult.bytes).toBeGreaterThan(0);

      // Verify the complete flow worked
      const fileExists = await turtle
        .getPersistenceHelper()
        .fileExists(saveResult.path);
      expect(fileExists).toBe(true);

      // Test load flow
      turtle.store.removeQuads([...turtle.store]);
      const loadResult = await turtle.loadGraph("project-data");

      expect(loadResult.path).toBe(join(testDir, "project-data.ttl"));
      expect(loadResult.quads).toBeGreaterThan(0);
      expect(turtle.store.size).toBeGreaterThan(0);
    });
  });

  it("should handle the default graph location pattern", async () => {
    const context = {
      cwd: testDir,
      root: testDir,
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: testDir });

      // Initialize default graph location
      await turtle.initializeDefaultGraph();

      // Add data and save to default location
      const { Store, DataFactory } = await import("n3");
      const testStore = new Store();
      const { namedNode } = DataFactory;
      testStore.addQuad(
        namedNode("https://gitvan.dev/graph/default/test"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://gitvan.dev/ontology#Graph")
      );

      turtle.store.removeQuads([...turtle.store]);
      for (const quad of testStore) {
        turtle.store.add(quad);
      }

      const saveResult = await turtle.saveDefaultGraph();
      expect(saveResult.path).toBe(join(testDir, "default.ttl"));

      // Load from default location
      turtle.store.removeQuads([...turtle.store]);
      const loadResult = await turtle.loadDefaultGraph();

      expect(loadResult.path).toBe(join(testDir, "default.ttl"));
      expect(loadResult.quads).toBeGreaterThan(0);
    });
  });
});
