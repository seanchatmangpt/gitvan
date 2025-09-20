/**
 * GitVan Graph Command 360-Degree Test
 *
 * Comprehensive test of all graph command functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { graphCommand } from "../src/cli/commands/graph.mjs";

describe("GitVan Graph Command - 360 Degree Test", () => {
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-graph-test-${randomUUID()}`);
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

  describe("Command Structure", () => {
    it("should have proper main command structure", () => {
      expect(graphCommand.meta.name).toBe("graph");
      expect(graphCommand.meta.description).toBe(
        "Graph persistence and operations for GitVan"
      );
      expect(graphCommand.subCommands).toBeDefined();
      expect(Object.keys(graphCommand.subCommands).length).toBe(7);
    });

    it("should have all required subcommands", () => {
      const expectedSubcommands = [
        "save",
        "load",
        "save-default",
        "load-default",
        "init-default",
        "list-files",
        "stats",
      ];

      expectedSubcommands.forEach((subcommand) => {
        expect(graphCommand.subCommands[subcommand]).toBeDefined();
        expect(graphCommand.subCommands[subcommand].meta.name).toBe(subcommand);
      });
    });

    it("should have proper argument definitions", () => {
      // Test save command arguments
      const saveCmd = graphCommand.subCommands.save;
      expect(saveCmd.args.fileName).toBeDefined();
      expect(saveCmd.args.fileName.required).toBe(true);
      expect(saveCmd.args.fileName.type).toBe("string");
      expect(saveCmd.args["graph-dir"]).toBeDefined();
      expect(saveCmd.args["graph-dir"].default).toBe("graph");
      expect(saveCmd.args.backup).toBeDefined();
      expect(saveCmd.args.backup.type).toBe("boolean");
      expect(saveCmd.args.validate).toBeDefined();
      expect(saveCmd.args.validate.type).toBe("boolean");

      // Test load command arguments
      const loadCmd = graphCommand.subCommands.load;
      expect(loadCmd.args.fileName).toBeDefined();
      expect(loadCmd.args.fileName.required).toBe(true);
      expect(loadCmd.args.merge).toBeDefined();
      expect(loadCmd.args.merge.default).toBe(true);

      // Test init-default command arguments
      const initCmd = graphCommand.subCommands["init-default"];
      expect(initCmd.args["graph-dir"]).toBeDefined();
      expect(initCmd.args["graph-dir"].default).toBe("graph");
      expect(initCmd.args.validate).toBeDefined();
      expect(initCmd.args.validate.default).toBe(true);
    });
  });

  describe("Command Execution", () => {
    it("should execute init-default command successfully", async () => {
      const initCmd = graphCommand.subCommands["init-default"];

      // Mock console.log to capture output
      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await initCmd.run({
          args: {
            "graph-dir": "graph",
            validate: true,
          },
        });

        // Check that the command executed without errors
        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs.some((log) => log.includes("Default graph"))).toBe(
          true
        );

        // Check that the graph directory was created
        const graphDirExists = await fs
          .access(join(testDir, "graph"))
          .then(() => true)
          .catch(() => false);
        expect(graphDirExists).toBe(true);

        // Check that default.ttl was created
        const defaultTtlExists = await fs
          .access(join(testDir, "graph", "default.ttl"))
          .then(() => true)
          .catch(() => false);
        expect(defaultTtlExists).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it("should execute list-files command successfully", async () => {
      // First create a graph directory with some files
      await fs.mkdir(join(testDir, "graph"), { recursive: true });
      await fs.writeFile(
        join(testDir, "graph", "test.ttl"),
        "@prefix ex: <http://example.org/> .\nex:test a ex:Test ."
      );
      await fs.writeFile(
        join(testDir, "graph", "default.ttl"),
        "@prefix ex: <http://example.org/> .\nex:default a ex:Default ."
      );

      const listCmd = graphCommand.subCommands["list-files"];

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await listCmd.run({
          args: {
            "graph-dir": "graph",
          },
        });

        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs.some((log) => log.includes("Found"))).toBe(true);
        expect(consoleLogs.some((log) => log.includes("test.ttl"))).toBe(true);
        expect(consoleLogs.some((log) => log.includes("default.ttl"))).toBe(
          true
        );
      } finally {
        console.log = originalLog;
      }
    });

    it("should execute stats command successfully", async () => {
      const statsCmd = graphCommand.subCommands.stats;

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await statsCmd.run({
          args: {
            "graph-dir": "graph",
          },
        });

        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(
          consoleLogs.some((log) => log.includes("Graph Store Statistics"))
        ).toBe(true);
        expect(consoleLogs.some((log) => log.includes("Quads:"))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it("should handle save command with proper arguments", async () => {
      const saveCmd = graphCommand.subCommands.save;

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await saveCmd.run({
          args: {
            fileName: "test-save",
            "graph-dir": "graph",
            backup: true,
            validate: true,
          },
        });

        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs.some((log) => log.includes("Graph saved"))).toBe(
          true
        );
      } finally {
        console.log = originalLog;
      }
    });

    it("should handle load command with proper arguments", async () => {
      // First create a file to load
      await fs.mkdir(join(testDir, "graph"), { recursive: true });
      await fs.writeFile(
        join(testDir, "graph", "test-load.ttl"),
        "@prefix ex: <http://example.org/> .\nex:test a ex:Test ."
      );

      const loadCmd = graphCommand.subCommands.load;

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await loadCmd.run({
          args: {
            fileName: "test-load",
            "graph-dir": "graph",
            merge: true,
            validate: true,
          },
        });

        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs.some((log) => log.includes("Graph loaded"))).toBe(
          true
        );
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required arguments", async () => {
      const saveCmd = graphCommand.subCommands.save;

      // Should handle missing fileName gracefully
      await expect(
        saveCmd.run({ args: { "graph-dir": "graph" } })
      ).rejects.toThrow();
    });

    it("should handle invalid file operations", async () => {
      const loadCmd = graphCommand.subCommands.load;

      // Should handle non-existent file gracefully
      const consoleLogs = [];
      const originalLog = console.log;
      const originalError = console.error;
      console.log = (...args) => consoleLogs.push(args.join(" "));
      console.error = (...args) => consoleLogs.push(args.join(" "));

      try {
        await loadCmd.run({
          args: {
            fileName: "non-existent",
            "graph-dir": "graph",
          },
        });

        // Should either succeed with empty result or handle error gracefully
        expect(consoleLogs.length).toBeGreaterThan(0);
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    });
  });

  describe("Integration with Composables", () => {
    it("should properly use useTurtle composable", async () => {
      const initCmd = graphCommand.subCommands["init-default"];

      // This test verifies that the command properly integrates with the useTurtle composable
      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await initCmd.run({
          args: {
            "graph-dir": "graph",
            validate: true,
          },
        });

        // The command should execute without throwing errors, indicating proper composable integration
        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs.some((log) => log.includes("Default graph"))).toBe(
          true
        );
      } finally {
        console.log = originalLog;
      }
    });

    it("should properly use withGitVan context", async () => {
      const statsCmd = graphCommand.subCommands.stats;

      // This test verifies that the command properly uses the GitVan context
      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await statsCmd.run({
          args: {
            "graph-dir": "graph",
          },
        });

        // The command should execute without context errors
        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(
          consoleLogs.some((log) => log.includes("Graph Store Statistics"))
        ).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("File System Operations", () => {
    it("should create graph directory when needed", async () => {
      const initCmd = graphCommand.subCommands["init-default"];

      // Ensure graph directory doesn't exist initially
      const graphDirPath = join(testDir, "graph");
      const initialExists = await fs
        .access(graphDirPath)
        .then(() => true)
        .catch(() => false);
      expect(initialExists).toBe(false);

      await initCmd.run({
        args: {
          "graph-dir": "graph",
          validate: true,
        },
      });

      // Check that directory was created
      const finalExists = await fs
        .access(graphDirPath)
        .then(() => true)
        .catch(() => false);
      expect(finalExists).toBe(true);
    });

    it("should handle existing files properly", async () => {
      // Create initial files
      await fs.mkdir(join(testDir, "graph"), { recursive: true });
      await fs.writeFile(
        join(testDir, "graph", "default.ttl"),
        "@prefix ex: <http://example.org/> .\nex:existing a ex:Existing ."
      );

      const initCmd = graphCommand.subCommands["init-default"];

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await initCmd.run({
          args: {
            "graph-dir": "graph",
            validate: true,
          },
        });

        // Should handle existing file gracefully
        expect(consoleLogs.some((log) => log.includes("already exists"))).toBe(
          true
        );
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Argument Validation", () => {
    it("should validate argument types", async () => {
      const saveCmd = graphCommand.subCommands.save;

      // Test with invalid argument types
      await expect(
        saveCmd.run({
          args: {
            fileName: "test",
            backup: "invalid-boolean",
            "graph-dir": "graph",
          },
        })
      ).rejects.toThrow();
    });

    it("should use default values correctly", async () => {
      const initCmd = graphCommand.subCommands["init-default"];

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        // Run with minimal args to test defaults
        await initCmd.run({
          args: {},
        });

        // Should use default graph-dir and validate values
        expect(consoleLogs.length).toBeGreaterThan(0);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Help Generation", () => {
    it("should generate help for main command", () => {
      const help = graphCommand.getHelp();
      expect(help).toContain("graph");
      expect(help).toContain("Graph persistence and operations");
    });

    it("should generate help for subcommands", () => {
      const saveCmd = graphCommand.subCommands.save;
      const help = saveCmd.getHelp();
      expect(help).toContain("save");
      expect(help).toContain("Save current graph");
    });
  });

  describe("End-to-End Workflow", () => {
    it("should complete full workflow: init -> save -> load -> stats", async () => {
      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        // 1. Initialize default graph
        const initCmd = graphCommand.subCommands["init-default"];
        await initCmd.run({
          args: { "graph-dir": "graph", validate: true },
        });

        // 2. Save to custom file
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "workflow-test",
            "graph-dir": "graph",
            backup: true,
            validate: true,
          },
        });

        // 3. Load the file
        const loadCmd = graphCommand.subCommands.load;
        await loadCmd.run({
          args: {
            fileName: "workflow-test",
            "graph-dir": "graph",
            merge: true,
            validate: true,
          },
        });

        // 4. Show stats
        const statsCmd = graphCommand.subCommands.stats;
        await statsCmd.run({
          args: { "graph-dir": "graph" },
        });

        // 5. List files
        const listCmd = graphCommand.subCommands["list-files"];
        await listCmd.run({
          args: { "graph-dir": "graph" },
        });

        // Verify all steps completed
        expect(consoleLogs.some((log) => log.includes("Default graph"))).toBe(
          true
        );
        expect(consoleLogs.some((log) => log.includes("Graph saved"))).toBe(
          true
        );
        expect(consoleLogs.some((log) => log.includes("Graph loaded"))).toBe(
          true
        );
        expect(
          consoleLogs.some((log) => log.includes("Graph Store Statistics"))
        ).toBe(true);
        expect(consoleLogs.some((log) => log.includes("Found"))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
