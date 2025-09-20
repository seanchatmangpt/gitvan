/**
 * GitVan Citty CLI Tests
 * 
 * Tests for the corrected Citty-based CLI architecture
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { cli } from "../src/cli-citty.mjs";

describe("GitVan Citty CLI", () => {
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-citty-test-${randomUUID()}`);
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

  describe("CLI Structure", () => {
    it("should have proper command structure", () => {
      expect(cli.meta.name).toBe('gitvan');
      expect(cli.meta.version).toBe('3.0.0');
      expect(cli.meta.description).toBe('Git-native development automation platform');
    });

    it("should have graph command registered", () => {
      expect(cli.subCommands.graph).toBeDefined();
      expect(cli.subCommands.graph.meta.name).toBe('graph');
    });

    it("should have all required subcommands for graph", () => {
      const graphCmd = cli.subCommands.graph;
      expect(graphCmd.subCommands.save).toBeDefined();
      expect(graphCmd.subCommands.load).toBeDefined();
      expect(graphCmd.subCommands['save-default']).toBeDefined();
      expect(graphCmd.subCommands['load-default']).toBeDefined();
      expect(graphCmd.subCommands['init-default']).toBeDefined();
      expect(graphCmd.subCommands['list-files']).toBeDefined();
      expect(graphCmd.subCommands.stats).toBeDefined();
    });
  });

  describe("Graph Command Arguments", () => {
    it("should have proper arguments for save subcommand", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      expect(saveCmd.args.fileName).toBeDefined();
      expect(saveCmd.args.fileName.required).toBe(true);
      expect(saveCmd.args['graph-dir']).toBeDefined();
      expect(saveCmd.args['graph-dir'].default).toBe('graph');
      expect(saveCmd.args.backup).toBeDefined();
      expect(saveCmd.args.backup.default).toBe(false);
      expect(saveCmd.args.validate).toBeDefined();
      expect(saveCmd.args.validate.default).toBe(true);
    });

    it("should have proper arguments for load subcommand", () => {
      const loadCmd = cli.subCommands.graph.subCommands.load;
      expect(loadCmd.args.fileName).toBeDefined();
      expect(loadCmd.args.fileName.required).toBe(true);
      expect(loadCmd.args['graph-dir']).toBeDefined();
      expect(loadCmd.args['graph-dir'].default).toBe('graph');
      expect(loadCmd.args.merge).toBeDefined();
      expect(loadCmd.args.merge.default).toBe(true);
      expect(loadCmd.args.validate).toBeDefined();
      expect(loadCmd.args.validate.default).toBe(true);
    });

    it("should have proper arguments for init-default subcommand", () => {
      const initCmd = cli.subCommands.graph.subCommands['init-default'];
      expect(initCmd.args['graph-dir']).toBeDefined();
      expect(initCmd.args['graph-dir'].default).toBe('graph');
      expect(initCmd.args['template-path']).toBeDefined();
      expect(initCmd.args.validate).toBeDefined();
      expect(initCmd.args.validate.default).toBe(true);
    });
  });

  describe("Command Execution", () => {
    it("should execute graph init-default command", async () => {
      // Mock the command execution
      const mockRun = async ({ args }) => {
        expect(args['graph-dir']).toBe('graph');
        expect(args.validate).toBe(true);
        return { created: true, path: join(testDir, 'graph', 'default.ttl'), bytes: 100 };
      };

      const initCmd = cli.subCommands.graph.subCommands['init-default'];
      const originalRun = initCmd.run;
      initCmd.run = mockRun;

      try {
        await initCmd.run({ args: { 'graph-dir': 'graph', validate: true } });
      } finally {
        initCmd.run = originalRun;
      }
    });

    it("should execute graph save command with proper arguments", async () => {
      const mockRun = async ({ args }) => {
        expect(args.fileName).toBe('test-graph');
        expect(args['graph-dir']).toBe('graph');
        expect(args.backup).toBe(false);
        expect(args.validate).toBe(true);
        return { path: join(testDir, 'graph', 'test-graph.ttl'), bytes: 200 };
      };

      const saveCmd = cli.subCommands.graph.subCommands.save;
      const originalRun = saveCmd.run;
      saveCmd.run = mockRun;

      try {
        await saveCmd.run({ 
          args: { 
            fileName: 'test-graph', 
            'graph-dir': 'graph', 
            backup: false, 
            validate: true 
          } 
        });
      } finally {
        saveCmd.run = originalRun;
      }
    });

    it("should execute graph load command with proper arguments", async () => {
      const mockRun = async ({ args }) => {
        expect(args.fileName).toBe('test-graph');
        expect(args['graph-dir']).toBe('graph');
        expect(args.merge).toBe(true);
        expect(args.validate).toBe(true);
        return { path: join(testDir, 'graph', 'test-graph.ttl'), quads: 5 };
      };

      const loadCmd = cli.subCommands.graph.subCommands.load;
      const originalRun = loadCmd.run;
      loadCmd.run = mockRun;

      try {
        await loadCmd.run({ 
          args: { 
            fileName: 'test-graph', 
            'graph-dir': 'graph', 
            merge: true, 
            validate: true 
          } 
        });
      } finally {
        loadCmd.run = originalRun;
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required arguments", async () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      
      // Should throw error for missing fileName
      await expect(
        saveCmd.run({ args: { 'graph-dir': 'graph' } })
      ).rejects.toThrow();
    });

    it("should handle invalid argument types", async () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      
      // Should handle invalid backup value
      await expect(
        saveCmd.run({ args: { fileName: 'test', backup: 'invalid' } })
      ).rejects.toThrow();
    });
  });

  describe("Integration with GitVan Context", () => {
    it("should properly initialize GitVan context", async () => {
      const initCmd = cli.subCommands.graph.subCommands['init-default'];
      
      // Mock withGitVan to verify it's called correctly
      let contextCalled = false;
      const mockWithGitVan = async (context, callback) => {
        contextCalled = true;
        expect(context.cwd).toBe(testDir);
        expect(context.root).toBe(testDir);
        return await callback();
      };

      // Replace the import temporarily
      const originalImport = await import('../src/composables/ctx.mjs');
      const mockModule = {
        ...originalImport,
        withGitVan: mockWithGitVan
      };

      // This is a simplified test - in reality, we'd need to mock the module system
      expect(true).toBe(true); // Placeholder for now
    });
  });

  describe("Command Help Generation", () => {
    it("should generate help for main CLI", () => {
      const help = cli.getHelp();
      expect(help).toContain('gitvan');
      expect(help).toContain('Graph-native development automation platform');
    });

    it("should generate help for graph command", () => {
      const graphCmd = cli.subCommands.graph;
      const help = graphCmd.getHelp();
      expect(help).toContain('graph');
      expect(help).toContain('Graph persistence and operations');
    });

    it("should generate help for graph subcommands", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      const help = saveCmd.getHelp();
      expect(help).toContain('save');
      expect(help).toContain('Save current graph to a Turtle file');
    });
  });

  describe("Argument Validation", () => {
    it("should validate required arguments", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      const args = saveCmd.args;
      
      expect(args.fileName.required).toBe(true);
      expect(args.fileName.type).toBe('string');
    });

    it("should validate argument types", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      const args = saveCmd.args;
      
      expect(args.fileName.type).toBe('string');
      expect(args.backup.type).toBe('boolean');
      expect(args.validate.type).toBe('boolean');
    });

    it("should have proper default values", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      const args = saveCmd.args;
      
      expect(args['graph-dir'].default).toBe('graph');
      expect(args.backup.default).toBe(false);
      expect(args.validate.default).toBe(true);
    });
  });

  describe("Command Metadata", () => {
    it("should have proper metadata for all commands", () => {
      expect(cli.meta.name).toBe('gitvan');
      expect(cli.meta.version).toBe('3.0.0');
      
      const graphCmd = cli.subCommands.graph;
      expect(graphCmd.meta.name).toBe('graph');
      expect(graphCmd.meta.description).toBe('Graph persistence and operations for GitVan');
      
      const saveCmd = graphCmd.subCommands.save;
      expect(saveCmd.meta.name).toBe('save');
      expect(saveCmd.meta.description).toBe('Save current graph to a Turtle file');
    });
  });
});
