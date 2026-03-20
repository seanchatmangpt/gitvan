/**
 * Tests for Cleanroom Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockReturnValue("mock output"),
}));

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue("{}"),
}));

const { cleanroomCommand } = await import(
  "../../../src/cli/commands/cleanroom.mjs"
);

describe("Cleanroom Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cleanroomCommand", () => {
    it("should be defined", () => {
      expect(cleanroomCommand).toBeDefined();
      expect(cleanroomCommand.meta).toBeDefined();
      expect(cleanroomCommand.meta.name).toBe("cleanroom");
    });

    it("should have proper description", () => {
      expect(cleanroomCommand.meta.description).toContain("Cleanroom");
    });

    it("should have usage and examples", () => {
      expect(cleanroomCommand.meta.usage).toContain("gitvan cleanroom");
      expect(cleanroomCommand.meta.examples).toBeDefined();
      expect(cleanroomCommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should have all required subcommands", () => {
      expect(cleanroomCommand.subCommands).toBeDefined();
      expect(cleanroomCommand.subCommands.build).toBeDefined();
      expect(cleanroomCommand.subCommands.test).toBeDefined();
      expect(cleanroomCommand.subCommands.validate).toBeDefined();
      expect(cleanroomCommand.subCommands.benchmark).toBeDefined();
      expect(cleanroomCommand.subCommands.report).toBeDefined();
      expect(cleanroomCommand.subCommands.help).toBeDefined();
    });

    it("should show help when run without subcommand", async () => {
      // Main run shows help
      await cleanroomCommand.run({ args: {} });
    });
  });

  describe("build subcommand", () => {
    const buildCmd = cleanroomCommand.subCommands.build;

    it("should be properly defined", () => {
      expect(buildCmd.meta.name).toBe("build");
      expect(buildCmd.meta.description).toContain("Build");
    });

    it("should have type argument with default optimized", () => {
      expect(buildCmd.args.type).toBeDefined();
      expect(buildCmd.args.type.type).toBe("string");
      expect(buildCmd.args.type.default).toBe("optimized");
    });

    it("should have tag argument", () => {
      expect(buildCmd.args.tag).toBeDefined();
      expect(buildCmd.args.tag.type).toBe("string");
      expect(buildCmd.args.tag.default).toBe("gitvan-cleanroom");
    });

    it("should have no-cache boolean argument", () => {
      expect(buildCmd.args["no-cache"]).toBeDefined();
      expect(buildCmd.args["no-cache"].type).toBe("boolean");
      expect(buildCmd.args["no-cache"].default).toBe(false);
    });

    it("should have examples", () => {
      expect(buildCmd.meta.examples).toBeDefined();
      expect(buildCmd.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("test subcommand", () => {
    const testCmd = cleanroomCommand.subCommands.test;

    it("should be properly defined", () => {
      expect(testCmd.meta.name).toBe("test");
      expect(testCmd.meta.description).toContain("cleanroom test");
    });

    it("should have suite argument with default all", () => {
      expect(testCmd.args.suite).toBeDefined();
      expect(testCmd.args.suite.type).toBe("string");
      expect(testCmd.args.suite.default).toBe("all");
    });

    it("should have image argument", () => {
      expect(testCmd.args.image).toBeDefined();
      expect(testCmd.args.image.default).toBe("gitvan-cleanroom");
    });

    it("should have verbose argument", () => {
      expect(testCmd.args.verbose).toBeDefined();
      expect(testCmd.args.verbose.type).toBe("boolean");
    });

    it("should have test-dir argument", () => {
      expect(testCmd.args["test-dir"]).toBeDefined();
      expect(testCmd.args["test-dir"].type).toBe("string");
    });
  });

  describe("validate subcommand", () => {
    const validateCmd = cleanroomCommand.subCommands.validate;

    it("should be properly defined", () => {
      expect(validateCmd.meta.name).toBe("validate");
      expect(validateCmd.meta.description).toContain("Validate");
    });

    it("should have image argument", () => {
      expect(validateCmd.args.image).toBeDefined();
      expect(validateCmd.args.image.default).toBe("gitvan-cleanroom");
    });
  });

  describe("benchmark subcommand", () => {
    const benchmarkCmd = cleanroomCommand.subCommands.benchmark;

    it("should be properly defined", () => {
      expect(benchmarkCmd.meta.name).toBe("benchmark");
      expect(benchmarkCmd.meta.description).toContain("benchmark");
    });

    it("should have iterations argument with default 10", () => {
      expect(benchmarkCmd.args.iterations).toBeDefined();
      expect(benchmarkCmd.args.iterations.type).toBe("number");
      expect(benchmarkCmd.args.iterations.default).toBe(10);
    });

    it("should have image argument", () => {
      expect(benchmarkCmd.args.image).toBeDefined();
      expect(benchmarkCmd.args.image.default).toBe("gitvan-cleanroom");
    });
  });

  describe("report subcommand", () => {
    const reportCmd = cleanroomCommand.subCommands.report;

    it("should be properly defined", () => {
      expect(reportCmd.meta.name).toBe("report");
      expect(reportCmd.meta.description).toContain("report");
    });

    it("should have format argument with default markdown", () => {
      expect(reportCmd.args.format).toBeDefined();
      expect(reportCmd.args.format.type).toBe("string");
      expect(reportCmd.args.format.default).toBe("markdown");
    });

    it("should have test-dir argument", () => {
      expect(reportCmd.args["test-dir"]).toBeDefined();
      expect(reportCmd.args["test-dir"].type).toBe("string");
    });
  });

  describe("help subcommand", () => {
    const helpCmd = cleanroomCommand.subCommands.help;

    it("should be properly defined", () => {
      expect(helpCmd.meta.name).toBe("help");
      expect(helpCmd.meta.description).toContain("help");
    });

    it("should run without error", async () => {
      await helpCmd.run();
    });
  });
});

describe("Cleanroom default export", () => {
  it("should export cleanroomCommand", async () => {
    const mod = await import("../../../src/cli/commands/cleanroom.mjs");
    expect(mod.cleanroomCommand).toBeDefined();
  });
});
