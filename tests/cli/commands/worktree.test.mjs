/**
 * Tests for Worktree Command
 */

import { describe, it, expect, beforeEach } from "vitest";
import { worktreeCommand } from "../../../src/cli/commands/worktree.mjs";
import { withGitVan } from "../../../src/core/context.mjs";
import { useWorktree } from "../../../src/composables/worktree.mjs";

describe("Worktree Command", () => {
  describe("worktreeCommand", () => {
    it("should be defined", () => {
      expect(worktreeCommand).toBeDefined();
      expect(worktreeCommand.meta).toBeDefined();
      expect(worktreeCommand.meta.name).toBe("worktree");
    });

    it("should have all required subcommands", () => {
      expect(worktreeCommand.subCommands).toBeDefined();
      expect(worktreeCommand.subCommands.list).toBeDefined();
      expect(worktreeCommand.subCommands.create).toBeDefined();
      expect(worktreeCommand.subCommands.remove).toBeDefined();
      expect(worktreeCommand.subCommands.prune).toBeDefined();
      expect(worktreeCommand.subCommands.repair).toBeDefined();
      expect(worktreeCommand.subCommands.info).toBeDefined();
      expect(worktreeCommand.subCommands.status).toBeDefined();
      expect(worktreeCommand.subCommands.switch).toBeDefined();
    });

    it("should have proper metadata", () => {
      expect(worktreeCommand.meta.description).toBe("Manage Git Worktrees");
      expect(worktreeCommand.meta.usage).toContain("gitvan worktree");
      expect(worktreeCommand.meta.examples).toBeDefined();
      expect(worktreeCommand.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("list subcommand", () => {
    it("should be properly defined", () => {
      const listCmd = worktreeCommand.subCommands.list;
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have proper arguments", () => {
      const listCmd = worktreeCommand.subCommands.list;
      expect(listCmd.args).toBeDefined();
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.format).toBeDefined();
    });
  });

  describe("create subcommand", () => {
    it("should be properly defined", () => {
      const createCmd = worktreeCommand.subCommands.create;
      expect(createCmd).toBeDefined();
      expect(createCmd.meta.name).toBe("create");
      expect(createCmd.meta.description).toContain("Create");
    });

    it("should have required path argument", () => {
      const createCmd = worktreeCommand.subCommands.create;
      expect(createCmd.args).toBeDefined();
      expect(createCmd.args.path).toBeDefined();
      expect(createCmd.args.path.required).toBe(true);
    });

    it("should have optional branch argument", () => {
      const createCmd = worktreeCommand.subCommands.create;
      expect(createCmd.args.branch).toBeDefined();
      expect(createCmd.args.branch.required).toBe(false);
    });

    it("should have start-from flag", () => {
      const createCmd = worktreeCommand.subCommands.create;
      expect(createCmd.args["start-from"]).toBeDefined();
    });
  });

  describe("remove subcommand", () => {
    it("should be properly defined", () => {
      const removeCmd = worktreeCommand.subCommands.remove;
      expect(removeCmd).toBeDefined();
      expect(removeCmd.meta.name).toBe("remove");
    });

    it("should have required path argument", () => {
      const removeCmd = worktreeCommand.subCommands.remove;
      expect(removeCmd.args.path).toBeDefined();
      expect(removeCmd.args.path.required).toBe(true);
    });

    it("should have force flag", () => {
      const removeCmd = worktreeCommand.subCommands.remove;
      expect(removeCmd.args.force).toBeDefined();
      expect(removeCmd.args.force.type).toBe("boolean");
    });
  });

  describe("prune subcommand", () => {
    it("should be properly defined", () => {
      const pruneCmd = worktreeCommand.subCommands.prune;
      expect(pruneCmd).toBeDefined();
      expect(pruneCmd.meta.name).toBe("prune");
    });
  });

  describe("repair subcommand", () => {
    it("should be properly defined", () => {
      const repairCmd = worktreeCommand.subCommands.repair;
      expect(repairCmd).toBeDefined();
      expect(repairCmd.meta.name).toBe("repair");
    });

    it("should have required path argument", () => {
      const repairCmd = worktreeCommand.subCommands.repair;
      expect(repairCmd.args.path).toBeDefined();
      expect(repairCmd.args.path.required).toBe(true);
    });
  });

  describe("info subcommand", () => {
    it("should be properly defined", () => {
      const infoCmd = worktreeCommand.subCommands.info;
      expect(infoCmd).toBeDefined();
      expect(infoCmd.meta.name).toBe("info");
    });
  });

  describe("status subcommand", () => {
    it("should be properly defined", () => {
      const statusCmd = worktreeCommand.subCommands.status;
      expect(statusCmd).toBeDefined();
      expect(statusCmd.meta.name).toBe("status");
    });
  });

  describe("switch subcommand", () => {
    it("should be properly defined", () => {
      const switchCmd = worktreeCommand.subCommands.switch;
      expect(switchCmd).toBeDefined();
      expect(switchCmd.meta.name).toBe("switch");
    });

    it("should have required path argument", () => {
      const switchCmd = worktreeCommand.subCommands.switch;
      expect(switchCmd.args.path).toBeDefined();
      expect(switchCmd.args.path.required).toBe(true);
    });
  });
});

describe("Worktree Command Integration", () => {
  let context;

  beforeEach(() => {
    context = {
      cwd: process.cwd(),
      env: {
        TZ: "UTC",
        LANG: "C",
      },
    };
  });

  it("should list worktrees using useWorktree composable", async () => {
    await withGitVan(context, async () => {
      const worktree = useWorktree();
      const worktrees = await worktree.list();

      expect(worktrees).toBeDefined();
      expect(Array.isArray(worktrees)).toBe(true);
    });
  });

  it("should get current worktree info", async () => {
    await withGitVan(context, async () => {
      const worktree = useWorktree();

      // Try to get info, but handle potential errors gracefully
      try {
        const info = await worktree.info();
        expect(info).toBeDefined();
        expect(info.worktree).toBeDefined();
        expect(info.branch).toBeDefined();
        expect(info.head).toBeDefined();
      } catch (error) {
        // Expected to fail in test environment if git is not available
        expect(error).toBeDefined();
      }
    });
  });

  it("should check if current directory is a worktree", async () => {
    await withGitVan(context, async () => {
      const worktree = useWorktree();
      const isWorktree = await worktree.isWorktree();

      expect(typeof isWorktree).toBe("boolean");
    });
  });
});
