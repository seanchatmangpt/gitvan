/**
 * Tests for Event Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/jobs/scan.mjs", () => ({
  scanJobs: vi.fn(async () => []),
}));

vi.mock("../../../src/router/events.mjs", () => ({
  matches: vi.fn(() => false),
}));

vi.mock("../../../src/config/loader.mjs", () => ({
  loadOptions: vi.fn(async () => ({
    rootDir: "/tmp/test",
    version: "3.0.0",
  })),
}));

import { eventCommand } from "../../../src/cli/commands/event.mjs";
import { scanJobs } from "../../../src/jobs/scan.mjs";
import { matches } from "../../../src/router/events.mjs";

describe("Event Command", () => {
  describe("eventCommand", () => {
    it("should be defined", () => {
      expect(eventCommand).toBeDefined();
      expect(eventCommand.meta).toBeDefined();
      expect(eventCommand.meta.name).toBe("event");
    });

    it("should have proper metadata", () => {
      expect(eventCommand.meta.description).toContain("event");
    });

    it("should have all required subcommands", () => {
      expect(eventCommand.subCommands).toBeDefined();
      expect(eventCommand.subCommands.simulate).toBeDefined();
      expect(eventCommand.subCommands.test).toBeDefined();
      expect(eventCommand.subCommands.list).toBeDefined();
      expect(eventCommand.subCommands.trigger).toBeDefined();
    });
  });

  describe("simulate subcommand", () => {
    const simCmd = eventCommand.subCommands.simulate;

    it("should be properly defined", () => {
      expect(simCmd).toBeDefined();
      expect(simCmd.meta.name).toBe("simulate");
      expect(simCmd.meta.description).toContain("Simulate");
    });

    it("should require type argument", () => {
      expect(simCmd.args.type).toBeDefined();
      expect(simCmd.args.type.type).toBe("string");
      expect(simCmd.args.type.required).toBe(true);
    });

    it("should have files argument", () => {
      expect(simCmd.args.files).toBeDefined();
      expect(simCmd.args.files.type).toBe("string");
      expect(simCmd.args.files.default).toBe("");
    });

    it("should have branch argument with main default", () => {
      expect(simCmd.args.branch).toBeDefined();
      expect(simCmd.args.branch.type).toBe("string");
      expect(simCmd.args.branch.default).toBe("main");
    });

    it("should have dry-run flag defaulting to true", () => {
      expect(simCmd.args["dry-run"]).toBeDefined();
      expect(simCmd.args["dry-run"].type).toBe("boolean");
      expect(simCmd.args["dry-run"].default).toBe(true);
    });

    it("should have verbose flag", () => {
      expect(simCmd.args.verbose).toBeDefined();
      expect(simCmd.args.verbose.type).toBe("boolean");
      expect(simCmd.args.verbose.default).toBe(false);
    });
  });

  describe("test subcommand", () => {
    const testCmd = eventCommand.subCommands.test;

    it("should be properly defined", () => {
      expect(testCmd).toBeDefined();
      expect(testCmd.meta.name).toBe("test");
      expect(testCmd.meta.description).toContain("predicate");
    });

    it("should require predicate argument", () => {
      expect(testCmd.args.predicate).toBeDefined();
      expect(testCmd.args.predicate.type).toBe("string");
      expect(testCmd.args.predicate.required).toBe(true);
    });

    it("should require sample-data argument", () => {
      expect(testCmd.args["sample-data"]).toBeDefined();
      expect(testCmd.args["sample-data"].type).toBe("string");
      expect(testCmd.args["sample-data"].required).toBe(true);
    });

    it("should have verbose flag", () => {
      expect(testCmd.args.verbose).toBeDefined();
      expect(testCmd.args.verbose.type).toBe("boolean");
    });
  });

  describe("list subcommand", () => {
    const listCmd = eventCommand.subCommands.list;

    it("should be properly defined", () => {
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have event-type filter", () => {
      expect(listCmd.args["event-type"]).toBeDefined();
      expect(listCmd.args["event-type"].type).toBe("string");
      expect(listCmd.args["event-type"].default).toBe("");
    });

    it("should have verbose flag", () => {
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.verbose.type).toBe("boolean");
    });
  });

  describe("trigger subcommand", () => {
    const triggerCmd = eventCommand.subCommands.trigger;

    it("should be properly defined", () => {
      expect(triggerCmd).toBeDefined();
      expect(triggerCmd.meta.name).toBe("trigger");
      expect(triggerCmd.meta.description).toContain("trigger");
    });

    it("should require type argument", () => {
      expect(triggerCmd.args.type).toBeDefined();
      expect(triggerCmd.args.type.type).toBe("string");
      expect(triggerCmd.args.type.required).toBe(true);
    });

    it("should have files argument", () => {
      expect(triggerCmd.args.files).toBeDefined();
      expect(triggerCmd.args.files.type).toBe("string");
    });

    it("should have branch argument", () => {
      expect(triggerCmd.args.branch).toBeDefined();
      expect(triggerCmd.args.branch.default).toBe("main");
    });

    it("should have execute-jobs flag", () => {
      expect(triggerCmd.args["execute-jobs"]).toBeDefined();
      expect(triggerCmd.args["execute-jobs"].type).toBe("boolean");
      expect(triggerCmd.args["execute-jobs"].default).toBe(false);
    });
  });
});

describe("Event Command Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("simulate subcommand run", () => {
    it("should scan jobs and check matches", async () => {
      const mockJobs = [
        { name: "deploy", on: { type: "push" }, description: "Deploy job" },
        { name: "test", on: { type: "commit" }, description: "Test job" },
      ];
      scanJobs.mockResolvedValue(mockJobs);
      matches.mockReturnValue(false);

      const simCmd = eventCommand.subCommands.simulate;
      await expect(
        simCmd.run({
          args: {
            type: "push",
            files: "",
            branch: "main",
            "dry-run": true,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();

      expect(scanJobs).toHaveBeenCalled();
      expect(matches).toHaveBeenCalled();
    });

    it("should identify triggered jobs", async () => {
      const mockJobs = [
        { name: "deploy", on: { type: "push" } },
        { name: "lint", on: { type: "commit" } },
      ];
      scanJobs.mockResolvedValue(mockJobs);
      matches.mockImplementation((on, event) => on.type === event.type);

      const simCmd = eventCommand.subCommands.simulate;
      await simCmd.run({
        args: {
          type: "push",
          files: "",
          branch: "main",
          "dry-run": true,
          verbose: false,
        },
      });

      // matches should be called for each event job
      expect(matches).toHaveBeenCalledTimes(2);
    });

    it("should parse comma-separated files", async () => {
      scanJobs.mockResolvedValue([]);

      const simCmd = eventCommand.subCommands.simulate;
      await simCmd.run({
        args: {
          type: "commit",
          files: "file1.js,file2.mjs,file3.ts",
          branch: "develop",
          "dry-run": true,
          verbose: false,
        },
      });

      expect(scanJobs).toHaveBeenCalled();
    });

    it("should handle no event jobs gracefully", async () => {
      scanJobs.mockResolvedValue([
        { name: "no-event-job" }, // no "on" property
      ]);

      const simCmd = eventCommand.subCommands.simulate;
      await expect(
        simCmd.run({
          args: {
            type: "push",
            files: "",
            branch: "main",
            "dry-run": true,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("test subcommand run", () => {
    it("should test predicate against sample data", async () => {
      matches.mockReturnValue(true);

      const testCmd = eventCommand.subCommands.test;
      await expect(
        testCmd.run({
          args: {
            predicate: '{"type":"push"}',
            "sample-data": '{"type":"push","branch":"main"}',
            verbose: false,
          },
        })
      ).resolves.not.toThrow();

      expect(matches).toHaveBeenCalledWith(
        { type: "push" },
        { type: "push", branch: "main" }
      );
    });

    it("should handle invalid JSON gracefully", async () => {
      const testCmd = eventCommand.subCommands.test;
      // Invalid JSON should cause a parse error caught by the error handler
      await expect(
        testCmd.run({
          args: {
            predicate: "not-json",
            "sample-data": '{"type":"push"}',
            verbose: false,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("list subcommand run", () => {
    it("should list event-triggered jobs", async () => {
      scanJobs.mockResolvedValue([
        { name: "deploy", on: "push", description: "Deploy" },
        { name: "test", on: { type: "commit" }, description: "Test" },
        { name: "build" }, // no event trigger
      ]);

      const listCmd = eventCommand.subCommands.list;
      await expect(
        listCmd.run({
          args: { "event-type": "", verbose: false },
        })
      ).resolves.not.toThrow();
    });

    it("should filter by event type", async () => {
      scanJobs.mockResolvedValue([
        { name: "deploy", on: { type: "push" } },
        { name: "test", on: { type: "commit" } },
      ]);

      const listCmd = eventCommand.subCommands.list;
      await expect(
        listCmd.run({
          args: { "event-type": "push", verbose: false },
        })
      ).resolves.not.toThrow();
    });

    it("should handle empty job list", async () => {
      scanJobs.mockResolvedValue([]);

      const listCmd = eventCommand.subCommands.list;
      await expect(
        listCmd.run({
          args: { "event-type": "", verbose: false },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("trigger subcommand run", () => {
    it("should trigger events and find matching jobs", async () => {
      const mockJobs = [
        { name: "deploy", on: { type: "push" } },
      ];
      scanJobs.mockResolvedValue(mockJobs);
      matches.mockReturnValue(true);

      const triggerCmd = eventCommand.subCommands.trigger;
      await expect(
        triggerCmd.run({
          args: {
            type: "push",
            files: "",
            branch: "main",
            "execute-jobs": false,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();

      expect(matches).toHaveBeenCalled();
    });
  });
});
