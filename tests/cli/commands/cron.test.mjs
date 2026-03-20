/**
 * Tests for Cron Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/jobs/cron.mjs", () => ({
  startCronScheduler: vi.fn().mockResolvedValue(undefined),
  scanJobs: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../src/runtime/config.mjs", () => ({
  loadConfig: vi.fn().mockResolvedValue({ rootDir: "/tmp/test" }),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

vi.mock("node-cron", () => ({
  default: {
    validate: vi.fn().mockReturnValue(true),
    schedule: vi.fn().mockReturnValue({ _fnSchedule: null }),
  },
}));

const { cronCommand } = await import("../../../src/cli/commands/cron.mjs");
const { scanJobs, startCronScheduler } = await import(
  "../../../src/jobs/cron.mjs"
);

describe("Cron Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cronCommand", () => {
    it("should be defined", () => {
      expect(cronCommand).toBeDefined();
      expect(cronCommand.meta).toBeDefined();
      expect(cronCommand.meta.name).toBe("cron");
    });

    it("should have proper description", () => {
      expect(cronCommand.meta.description).toContain("cron");
    });

    it("should have all required subcommands", () => {
      expect(cronCommand.subCommands).toBeDefined();
      expect(cronCommand.subCommands.list).toBeDefined();
      expect(cronCommand.subCommands.start).toBeDefined();
      expect(cronCommand.subCommands["dry-run"]).toBeDefined();
      expect(cronCommand.subCommands.status).toBeDefined();
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/cron.mjs");
      expect(mod.default).toBe(mod.cronCommand);
    });
  });

  describe("list subcommand", () => {
    const listCmd = cronCommand.subCommands.list;

    it("should be properly defined", () => {
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have verbose argument", () => {
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.verbose.type).toBe("boolean");
      expect(listCmd.args.verbose.default).toBe(false);
    });

    it("should have show-schedule argument", () => {
      expect(listCmd.args["show-schedule"]).toBeDefined();
      expect(listCmd.args["show-schedule"].type).toBe("boolean");
      expect(listCmd.args["show-schedule"].default).toBe(false);
    });

    it("should handle empty job list", async () => {
      scanJobs.mockResolvedValueOnce([]);
      await listCmd.run({ args: { verbose: false, "show-schedule": false } });
      expect(scanJobs).toHaveBeenCalled();
    });

    it("should handle jobs with cron schedules", async () => {
      scanJobs.mockResolvedValueOnce([
        {
          name: "test-job",
          cron: "*/5 * * * *",
          description: "Test",
          file: "/test.mjs",
          modified: "2026-01-01",
        },
      ]);
      await listCmd.run({ args: { verbose: true, "show-schedule": false } });
      expect(scanJobs).toHaveBeenCalled();
    });

    it("should handle show-schedule flag", async () => {
      scanJobs.mockResolvedValueOnce([
        {
          name: "test-job",
          cron: "*/5 * * * *",
          description: "Test",
          file: "/test.mjs",
          modified: "2026-01-01",
        },
      ]);
      await listCmd.run({ args: { verbose: false, "show-schedule": true } });
      expect(scanJobs).toHaveBeenCalled();
    });

    it("should filter out non-cron jobs", async () => {
      scanJobs.mockResolvedValueOnce([
        { name: "regular-job", description: "No cron" },
        { name: "cron-job", cron: "0 * * * *", description: "Has cron" },
      ]);
      await listCmd.run({ args: { verbose: false, "show-schedule": false } });
      expect(scanJobs).toHaveBeenCalled();
    });
  });

  describe("start subcommand", () => {
    const startCmd = cronCommand.subCommands.start;

    it("should be properly defined", () => {
      expect(startCmd.meta.name).toBe("start");
      expect(startCmd.meta.description).toContain("Start");
    });

    it("should have root-dir argument with string type", () => {
      expect(startCmd.args["root-dir"]).toBeDefined();
      expect(startCmd.args["root-dir"].type).toBe("string");
    });

    it("should have check-interval with default 60", () => {
      expect(startCmd.args["check-interval"].type).toBe("number");
      expect(startCmd.args["check-interval"].default).toBe(60);
    });

    it("should have max-concurrent with default 5", () => {
      expect(startCmd.args["max-concurrent"].type).toBe("number");
      expect(startCmd.args["max-concurrent"].default).toBe(5);
    });

    it("should convert check-interval to milliseconds", async () => {
      startCronScheduler.mockResolvedValueOnce(undefined);
      await startCmd.run({
        args: {
          "root-dir": "/tmp",
          "check-interval": 30,
          "max-concurrent": 3,
          verbose: true,
        },
      });
      expect(startCronScheduler).toHaveBeenCalledWith(
        expect.objectContaining({ checkInterval: 30000 })
      );
    });
  });

  describe("dry-run subcommand", () => {
    const dryRunCmd = cronCommand.subCommands["dry-run"];

    it("should be properly defined", () => {
      expect(dryRunCmd.meta.name).toBe("dry-run");
      expect(dryRunCmd.meta.description).toContain("Simulate");
    });

    it("should have at, root-dir, and verbose arguments", () => {
      expect(dryRunCmd.args.at).toBeDefined();
      expect(dryRunCmd.args.at.type).toBe("string");
      expect(dryRunCmd.args["root-dir"]).toBeDefined();
      expect(dryRunCmd.args.verbose).toBeDefined();
    });

    it("should handle empty jobs", async () => {
      scanJobs.mockResolvedValueOnce([]);
      await dryRunCmd.run({
        args: {
          at: "2026-01-01T00:00:00Z",
          "root-dir": "/tmp",
          verbose: false,
        },
      });
      expect(scanJobs).toHaveBeenCalled();
    });

    it("should simulate cron jobs", async () => {
      scanJobs.mockResolvedValueOnce([
        { name: "backup", cron: "0 2 * * *", description: "Daily backup" },
      ]);
      await dryRunCmd.run({
        args: {
          at: "2026-01-01T02:00:00Z",
          "root-dir": "/tmp",
          verbose: true,
        },
      });
      expect(scanJobs).toHaveBeenCalled();
    });
  });

  describe("status subcommand", () => {
    const statusCmd = cronCommand.subCommands.status;

    it("should be properly defined", () => {
      expect(statusCmd.meta.name).toBe("status");
      expect(statusCmd.meta.description).toContain("status");
    });

    it("should have root-dir and verbose arguments", () => {
      expect(statusCmd.args["root-dir"]).toBeDefined();
      expect(statusCmd.args.verbose).toBeDefined();
    });

    it("should show status with empty jobs", async () => {
      scanJobs.mockResolvedValueOnce([]);
      await statusCmd.run({
        args: { "root-dir": "/tmp", verbose: false },
      });
      expect(scanJobs).toHaveBeenCalled();
    });

    it("should show verbose status", async () => {
      scanJobs.mockResolvedValueOnce([
        { name: "test", cron: "* * * * *" },
      ]);
      await statusCmd.run({
        args: { "root-dir": "/tmp", verbose: true },
      });
      expect(scanJobs).toHaveBeenCalled();
    });
  });
});
