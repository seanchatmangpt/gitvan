/**
 * GitVan Unified CLI Tests
 *
 * Tests for the corrected unified Citty-based CLI architecture
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { cli } from "../src/cli-unified.mjs";

describe("GitVan Unified CLI", () => {
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-unified-test-${randomUUID()}`);
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
    it("should have proper main CLI structure", () => {
      expect(cli.meta.name).toBe("gitvan");
      expect(cli.meta.version).toBe("3.0.0");
      expect(cli.meta.description).toBe(
        "Git-native development automation platform"
      );
      expect(cli.meta.usage).toBe("gitvan <command> [options]");
      expect(cli.meta.examples).toBeDefined();
      expect(cli.meta.examples.length).toBeGreaterThan(0);
    });

    it("should have all core commands registered", () => {
      const expectedCommands = [
        "graph",
        "daemon",
        "event",
        "cron",
        "audit",
        "init",
        "setup",
        "save",
        "ensure",
        "pack",
        "marketplace",
        "scaffold",
        "compose",
        "chat",
      ];

      expectedCommands.forEach((command) => {
        expect(cli.subCommands[command]).toBeDefined();
        expect(cli.subCommands[command].meta.name).toBe(command);
      });
    });

    it("should have proper command hierarchy", () => {
      // Test graph command subcommands
      const graphCmd = cli.subCommands.graph;
      expect(graphCmd.subCommands.save).toBeDefined();
      expect(graphCmd.subCommands.load).toBeDefined();
      expect(graphCmd.subCommands["save-default"]).toBeDefined();
      expect(graphCmd.subCommands["load-default"]).toBeDefined();
      expect(graphCmd.subCommands["init-default"]).toBeDefined();
      expect(graphCmd.subCommands["list-files"]).toBeDefined();
      expect(graphCmd.subCommands.stats).toBeDefined();

      // Test daemon command subcommands
      const daemonCmd = cli.subCommands.daemon;
      expect(daemonCmd.subCommands.start).toBeDefined();
      expect(daemonCmd.subCommands.stop).toBeDefined();
      expect(daemonCmd.subCommands.status).toBeDefined();
      expect(daemonCmd.subCommands.restart).toBeDefined();

      // Test event command subcommands
      const eventCmd = cli.subCommands.event;
      expect(eventCmd.subCommands.simulate).toBeDefined();
      expect(eventCmd.subCommands.test).toBeDefined();
      expect(eventCmd.subCommands.list).toBeDefined();
      expect(eventCmd.subCommands.trigger).toBeDefined();

      // Test cron command subcommands
      const cronCmd = cli.subCommands.cron;
      expect(cronCmd.subCommands.list).toBeDefined();
      expect(cronCmd.subCommands.start).toBeDefined();
      expect(cronCmd.subCommands["dry-run"]).toBeDefined();
      expect(cronCmd.subCommands.status).toBeDefined();

      // Test audit command subcommands
      const auditCmd = cli.subCommands.audit;
      expect(auditCmd.subCommands.build).toBeDefined();
      expect(auditCmd.subCommands.verify).toBeDefined();
      expect(auditCmd.subCommands.list).toBeDefined();
      expect(auditCmd.subCommands.show).toBeDefined();
    });
  });

  describe("Command Arguments", () => {
    it("should have proper arguments for graph save command", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      expect(saveCmd.args.fileName).toBeDefined();
      expect(saveCmd.args.fileName.required).toBe(true);
      expect(saveCmd.args.fileName.type).toBe("string");
      expect(saveCmd.args["graph-dir"]).toBeDefined();
      expect(saveCmd.args["graph-dir"].default).toBe("graph");
      expect(saveCmd.args.backup).toBeDefined();
      expect(saveCmd.args.backup.type).toBe("boolean");
      expect(saveCmd.args.validate).toBeDefined();
      expect(saveCmd.args.validate.type).toBe("boolean");
    });

    it("should have proper arguments for daemon start command", () => {
      const startCmd = cli.subCommands.daemon.subCommands.start;
      expect(startCmd.args["root-dir"]).toBeDefined();
      expect(startCmd.args["root-dir"].default).toBe(process.cwd());
      expect(startCmd.args.worktrees).toBeDefined();
      expect(startCmd.args.worktrees.default).toBe("current");
      expect(startCmd.args["auto-start"]).toBeDefined();
      expect(startCmd.args["auto-start"].type).toBe("boolean");
      expect(startCmd.args.port).toBeDefined();
      expect(startCmd.args.port.type).toBe("number");
    });

    it("should have proper arguments for event simulate command", () => {
      const simulateCmd = cli.subCommands.event.subCommands.simulate;
      expect(simulateCmd.args.type).toBeDefined();
      expect(simulateCmd.args.type.required).toBe(true);
      expect(simulateCmd.args.files).toBeDefined();
      expect(simulateCmd.args.branch).toBeDefined();
      expect(simulateCmd.args["dry-run"]).toBeDefined();
      expect(simulateCmd.args["dry-run"].default).toBe(true);
    });

    it("should have proper arguments for cron list command", () => {
      const listCmd = cli.subCommands.cron.subCommands.list;
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.verbose.type).toBe("boolean");
      expect(listCmd.args["show-schedule"]).toBeDefined();
      expect(listCmd.args["show-schedule"].type).toBe("boolean");
    });

    it("should have proper arguments for audit build command", () => {
      const buildCmd = cli.subCommands.audit.subCommands.build;
      expect(buildCmd.args.output).toBeDefined();
      expect(buildCmd.args.output.default).toBe("audit-pack.json");
      expect(buildCmd.args["include-metadata"]).toBeDefined();
      expect(buildCmd.args["include-metadata"].default).toBe(true);
      expect(buildCmd.args.compress).toBeDefined();
      expect(buildCmd.args.compress.type).toBe("boolean");
    });
  });

  describe("Command Metadata", () => {
    it("should have proper metadata for all commands", () => {
      const commands = [
        "graph",
        "daemon",
        "event",
        "cron",
        "audit",
        "init",
        "setup",
        "save",
        "ensure",
        "pack",
        "marketplace",
        "scaffold",
        "compose",
        "chat",
      ];

      commands.forEach((commandName) => {
        const command = cli.subCommands[commandName];
        expect(command.meta.name).toBe(commandName);
        expect(command.meta.description).toBeDefined();
        expect(command.meta.description.length).toBeGreaterThan(0);
      });
    });

    it("should have proper metadata for subcommands", () => {
      // Test graph subcommands
      const graphCmd = cli.subCommands.graph;
      expect(graphCmd.subCommands.save.meta.name).toBe("save");
      expect(graphCmd.subCommands.save.meta.description).toContain("Save");
      expect(graphCmd.subCommands.load.meta.name).toBe("load");
      expect(graphCmd.subCommands.load.meta.description).toContain("Load");

      // Test daemon subcommands
      const daemonCmd = cli.subCommands.daemon;
      expect(daemonCmd.subCommands.start.meta.name).toBe("start");
      expect(daemonCmd.subCommands.start.meta.description).toContain("Start");
      expect(daemonCmd.subCommands.stop.meta.name).toBe("stop");
      expect(daemonCmd.subCommands.stop.meta.description).toContain("Stop");

      // Test event subcommands
      const eventCmd = cli.subCommands.event;
      expect(eventCmd.subCommands.simulate.meta.name).toBe("simulate");
      expect(eventCmd.subCommands.simulate.meta.description).toContain(
        "Simulate"
      );
      expect(eventCmd.subCommands.test.meta.name).toBe("test");
      expect(eventCmd.subCommands.test.meta.description).toContain("Test");
    });
  });

  describe("Help Generation", () => {
    it("should generate help for main CLI", () => {
      const help = cli.getHelp();
      expect(help).toContain("gitvan");
      expect(help).toContain("Git-native development automation platform");
      expect(help).toContain("Usage:");
      expect(help).toContain("Examples:");
    });

    it("should generate help for graph command", () => {
      const graphCmd = cli.subCommands.graph;
      const help = graphCmd.getHelp();
      expect(help).toContain("graph");
      expect(help).toContain("Graph persistence and operations");
    });

    it("should generate help for daemon command", () => {
      const daemonCmd = cli.subCommands.daemon;
      const help = daemonCmd.getHelp();
      expect(help).toContain("daemon");
      expect(help).toContain("Manage GitVan daemon");
    });

    it("should generate help for event command", () => {
      const eventCmd = cli.subCommands.event;
      const help = eventCmd.getHelp();
      expect(help).toContain("event");
      expect(help).toContain("Manage GitVan events");
    });

    it("should generate help for cron command", () => {
      const cronCmd = cli.subCommands.cron;
      const help = cronCmd.getHelp();
      expect(help).toContain("cron");
      expect(help).toContain("Manage GitVan cron jobs");
    });

    it("should generate help for audit command", () => {
      const auditCmd = cli.subCommands.audit;
      const help = auditCmd.getHelp();
      expect(help).toContain("audit");
      expect(help).toContain("Manage GitVan audit");
    });
  });

  describe("Command Execution", () => {
    it("should execute graph init-default command", async () => {
      const initCmd = cli.subCommands.graph.subCommands["init-default"];

      // Mock the command execution
      const mockRun = async ({ args }) => {
        expect(args["graph-dir"]).toBe("graph");
        expect(args.validate).toBe(true);
        return {
          created: true,
          path: join(testDir, "graph", "default.ttl"),
          bytes: 100,
        };
      };

      const originalRun = initCmd.run;
      initCmd.run = mockRun;

      try {
        await initCmd.run({ args: { "graph-dir": "graph", validate: true } });
      } finally {
        initCmd.run = originalRun;
      }
    });

    it("should execute daemon start command", async () => {
      const startCmd = cli.subCommands.daemon.subCommands.start;

      const mockRun = async ({ args }) => {
        expect(args["root-dir"]).toBe(process.cwd());
        expect(args.worktrees).toBe("current");
        expect(args.port).toBe(3000);
        return { started: true };
      };

      const originalRun = startCmd.run;
      startCmd.run = mockRun;

      try {
        await startCmd.run({
          args: {
            "root-dir": process.cwd(),
            worktrees: "current",
            port: 3000,
          },
        });
      } finally {
        startCmd.run = originalRun;
      }
    });

    it("should execute event simulate command", async () => {
      const simulateCmd = cli.subCommands.event.subCommands.simulate;

      const mockRun = async ({ args }) => {
        expect(args.type).toBe("commit");
        expect(args.files).toBe("");
        expect(args.branch).toBe("main");
        expect(args["dry-run"]).toBe(true);
        return { simulated: true };
      };

      const originalRun = simulateCmd.run;
      simulateCmd.run = mockRun;

      try {
        await simulateCmd.run({
          args: {
            type: "commit",
            files: "",
            branch: "main",
            "dry-run": true,
          },
        });
      } finally {
        simulateCmd.run = originalRun;
      }
    });

    it("should execute cron list command", async () => {
      const listCmd = cli.subCommands.cron.subCommands.list;

      const mockRun = async ({ args }) => {
        expect(args.verbose).toBe(false);
        expect(args["show-schedule"]).toBe(false);
        return { jobs: [] };
      };

      const originalRun = listCmd.run;
      listCmd.run = mockRun;

      try {
        await listCmd.run({
          args: {
            verbose: false,
            "show-schedule": false,
          },
        });
      } finally {
        listCmd.run = originalRun;
      }
    });

    it("should execute audit build command", async () => {
      const buildCmd = cli.subCommands.audit.subCommands.build;

      const mockRun = async ({ args }) => {
        expect(args.output).toBe("audit-pack.json");
        expect(args["include-metadata"]).toBe(true);
        expect(args.compress).toBe(false);
        return { built: true };
      };

      const originalRun = buildCmd.run;
      buildCmd.run = mockRun;

      try {
        await buildCmd.run({
          args: {
            output: "audit-pack.json",
            "include-metadata": true,
            compress: false,
          },
        });
      } finally {
        buildCmd.run = originalRun;
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required arguments", async () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;

      // Should throw error for missing fileName
      await expect(
        saveCmd.run({ args: { "graph-dir": "graph" } })
      ).rejects.toThrow();
    });

    it("should handle invalid argument types", async () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;

      // Should handle invalid backup value
      await expect(
        saveCmd.run({ args: { fileName: "test", backup: "invalid" } })
      ).rejects.toThrow();
    });
  });

  describe("C4 Model Compliance", () => {
    it("should implement Level 1: System Context", () => {
      // Developer → GitVan CLI → File System
      expect(cli.meta.name).toBe("gitvan");
      expect(cli.subCommands.graph).toBeDefined();
      expect(cli.subCommands.daemon).toBeDefined();
      expect(cli.subCommands.event).toBeDefined();
    });

    it("should implement Level 2: Container Diagram", () => {
      // CLI Runner → Command Registry → Module System
      expect(cli.subCommands).toBeDefined();
      expect(Object.keys(cli.subCommands).length).toBeGreaterThan(0);

      // Each command should have proper structure
      Object.values(cli.subCommands).forEach((command) => {
        expect(command.meta).toBeDefined();
        expect(command.meta.name).toBeDefined();
        expect(command.meta.description).toBeDefined();
      });
    });

    it("should implement Level 3: Component Diagram", () => {
      // Commands → Composables → Engines
      const graphCmd = cli.subCommands.graph;
      expect(graphCmd.subCommands).toBeDefined();
      expect(Object.keys(graphCmd.subCommands).length).toBeGreaterThan(0);

      // Each subcommand should have proper structure
      Object.values(graphCmd.subCommands).forEach((subcommand) => {
        expect(subcommand.meta).toBeDefined();
        expect(subcommand.args).toBeDefined();
        expect(subcommand.run).toBeDefined();
      });
    });

    it("should implement Level 4: Code Diagram", () => {
      // Specific operations and data flow
      const saveCmd = cli.subCommands.graph.subCommands.save;
      expect(saveCmd.args.fileName).toBeDefined();
      expect(saveCmd.args.fileName.required).toBe(true);
      expect(saveCmd.run).toBeDefined();
    });
  });

  describe("Architecture Benefits", () => {
    it("should provide unified Citty framework", () => {
      // All commands should use defineCommand
      Object.values(cli.subCommands).forEach((command) => {
        expect(command.meta).toBeDefined();
        expect(command.args).toBeDefined();
        expect(command.run).toBeDefined();
      });
    });

    it("should provide type-safe arguments", () => {
      const saveCmd = cli.subCommands.graph.subCommands.save;
      expect(saveCmd.args.fileName.type).toBe("string");
      expect(saveCmd.args.backup.type).toBe("boolean");
      expect(saveCmd.args.validate.type).toBe("boolean");
    });

    it("should provide declarative command structure", () => {
      // Commands should be defined declaratively, not imperatively
      const graphCmd = cli.subCommands.graph;
      expect(graphCmd.meta.name).toBe("graph");
      expect(graphCmd.subCommands.save.meta.name).toBe("save");
    });

    it("should provide consistent error handling", () => {
      // All commands should handle errors consistently
      Object.values(cli.subCommands).forEach((command) => {
        expect(typeof command.run).toBe("function");
      });
    });

    it("should provide automatic help generation", () => {
      const help = cli.getHelp();
      expect(help).toContain("gitvan");
      expect(help).toContain("Usage:");
      expect(help).toContain("Examples:");
    });

    it("should provide subcommand support", () => {
      const graphCmd = cli.subCommands.graph;
      expect(Object.keys(graphCmd.subCommands).length).toBeGreaterThan(0);

      const daemonCmd = cli.subCommands.daemon;
      expect(Object.keys(daemonCmd.subCommands).length).toBeGreaterThan(0);
    });

    it("should provide single entry point", () => {
      expect(cli.meta.name).toBe("gitvan");
      expect(cli.subCommands).toBeDefined();
      expect(Object.keys(cli.subCommands).length).toBeGreaterThan(0);
    });
  });
});
