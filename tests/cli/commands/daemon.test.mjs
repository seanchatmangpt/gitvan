/**
 * Tests for Daemon Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/runtime/daemon.mjs", () => ({
  startDaemon: vi.fn().mockResolvedValue(undefined),
  daemonStatus: vi.fn().mockResolvedValue({ running: false }),
  stopDaemon: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

const { daemonCommand } = await import(
  "../../../src/cli/commands/daemon.mjs"
);
const { startDaemon, stopDaemon, daemonStatus } = await import(
  "../../../src/runtime/daemon.mjs"
);

describe("Daemon Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("daemonCommand", () => {
    it("should be defined", () => {
      expect(daemonCommand).toBeDefined();
      expect(daemonCommand.meta).toBeDefined();
      expect(daemonCommand.meta.name).toBe("daemon");
    });

    it("should have proper description", () => {
      expect(daemonCommand.meta.description).toContain("daemon");
    });

    it("should have all required subcommands", () => {
      expect(daemonCommand.subCommands).toBeDefined();
      expect(daemonCommand.subCommands.start).toBeDefined();
      expect(daemonCommand.subCommands.stop).toBeDefined();
      expect(daemonCommand.subCommands.status).toBeDefined();
      expect(daemonCommand.subCommands.restart).toBeDefined();
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/daemon.mjs");
      expect(mod.default).toBe(mod.daemonCommand);
    });
  });

  describe("start subcommand", () => {
    const startCmd = daemonCommand.subCommands.start;

    it("should be properly defined", () => {
      expect(startCmd.meta.name).toBe("start");
      expect(startCmd.meta.description).toContain("Start");
    });

    it("should have root-dir argument", () => {
      expect(startCmd.args["root-dir"]).toBeDefined();
      expect(startCmd.args["root-dir"].type).toBe("string");
    });

    it("should have worktrees argument with default current", () => {
      expect(startCmd.args.worktrees).toBeDefined();
      expect(startCmd.args.worktrees.type).toBe("string");
      expect(startCmd.args.worktrees.default).toBe("current");
    });

    it("should have auto-start boolean argument", () => {
      expect(startCmd.args["auto-start"]).toBeDefined();
      expect(startCmd.args["auto-start"].type).toBe("boolean");
      expect(startCmd.args["auto-start"].default).toBe(false);
    });

    it("should have port argument with default 3000", () => {
      expect(startCmd.args.port).toBeDefined();
      expect(startCmd.args.port.type).toBe("number");
      expect(startCmd.args.port.default).toBe(3000);
    });

    it("should call startDaemon with correct options", async () => {
      startDaemon.mockResolvedValueOnce(undefined);
      await startCmd.run({
        args: {
          "root-dir": "/tmp",
          worktrees: "all",
          "auto-start": true,
          port: 4000,
        },
      });
      expect(startDaemon).toHaveBeenCalledWith({
        rootDir: "/tmp",
        worktrees: "all",
        autoStart: true,
        port: 4000,
      });
    });

    it("should handle start errors gracefully", async () => {
      startDaemon.mockRejectedValueOnce(new Error("Port in use"));
      // Should not throw - error is caught internally
      await expect(
        startCmd.run({
          args: {
            "root-dir": "/tmp",
            worktrees: "current",
            "auto-start": false,
            port: 3000,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("stop subcommand", () => {
    const stopCmd = daemonCommand.subCommands.stop;

    it("should be properly defined", () => {
      expect(stopCmd.meta.name).toBe("stop");
      expect(stopCmd.meta.description).toContain("Stop");
    });

    it("should have force argument", () => {
      expect(stopCmd.args.force).toBeDefined();
      expect(stopCmd.args.force.type).toBe("boolean");
      expect(stopCmd.args.force.default).toBe(false);
    });

    it("should call stopDaemon", async () => {
      stopDaemon.mockResolvedValueOnce(undefined);
      await stopCmd.run({ args: { force: false } });
      expect(stopDaemon).toHaveBeenCalledWith({ force: false });
    });

    it("should pass force flag to stopDaemon", async () => {
      stopDaemon.mockResolvedValueOnce(undefined);
      await stopCmd.run({ args: { force: true } });
      expect(stopDaemon).toHaveBeenCalledWith({ force: true });
    });
  });

  describe("status subcommand", () => {
    const statusCmd = daemonCommand.subCommands.status;

    it("should be properly defined", () => {
      expect(statusCmd.meta.name).toBe("status");
      expect(statusCmd.meta.description).toContain("status");
    });

    it("should have root-dir and verbose arguments", () => {
      expect(statusCmd.args["root-dir"]).toBeDefined();
      expect(statusCmd.args.verbose).toBeDefined();
      expect(statusCmd.args.verbose.type).toBe("boolean");
    });

    it("should handle running daemon", async () => {
      daemonStatus.mockResolvedValueOnce({
        running: true,
        rootDir: "/tmp",
        startedAt: "2026-01-01T00:00:00Z",
        uptime: "1h",
        worktrees: ["main"],
        jobsExecuted: 5,
        port: 3000,
      });
      await statusCmd.run({
        args: { "root-dir": "/tmp", verbose: true },
      });
      expect(daemonStatus).toHaveBeenCalled();
    });

    it("should handle stopped daemon", async () => {
      daemonStatus.mockResolvedValueOnce({ running: false });
      await statusCmd.run({
        args: { "root-dir": "/tmp", verbose: false },
      });
      expect(daemonStatus).toHaveBeenCalled();
    });
  });

  describe("restart subcommand", () => {
    const restartCmd = daemonCommand.subCommands.restart;

    it("should be properly defined", () => {
      expect(restartCmd.meta.name).toBe("restart");
      expect(restartCmd.meta.description).toContain("Restart");
    });

    it("should have all start arguments plus force", () => {
      expect(restartCmd.args["root-dir"]).toBeDefined();
      expect(restartCmd.args.worktrees).toBeDefined();
      expect(restartCmd.args["auto-start"]).toBeDefined();
      expect(restartCmd.args.port).toBeDefined();
      expect(restartCmd.args.force).toBeDefined();
    });

    it("should stop then start daemon", async () => {
      stopDaemon.mockResolvedValueOnce(undefined);
      startDaemon.mockResolvedValueOnce(undefined);
      await restartCmd.run({
        args: {
          "root-dir": "/tmp",
          worktrees: "current",
          "auto-start": false,
          port: 3000,
          force: false,
        },
      });
      expect(stopDaemon).toHaveBeenCalledBefore(startDaemon);
      expect(startDaemon).toHaveBeenCalled();
    });

    it("should force stop when force flag is set", async () => {
      stopDaemon.mockRejectedValueOnce(new Error("Cannot stop"));
      startDaemon.mockResolvedValueOnce(undefined);
      // With force=true, stop error is caught and start proceeds
      await restartCmd.run({
        args: {
          "root-dir": "/tmp",
          worktrees: "current",
          "auto-start": false,
          port: 3000,
          force: true,
        },
      });
      expect(startDaemon).toHaveBeenCalled();
    });

    it("should propagate stop error when not forced", async () => {
      stopDaemon.mockRejectedValueOnce(new Error("Cannot stop"));
      await expect(
        restartCmd.run({
          args: {
            "root-dir": "/tmp",
            worktrees: "current",
            "auto-start": false,
            port: 3000,
            force: false,
          },
        })
      ).rejects.toThrow();
    });
  });
});
