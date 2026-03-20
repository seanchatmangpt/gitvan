/**
 * Tests for Validate Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/composables/shacl-validator.mjs", () => ({
  useSHACLValidator: vi.fn(() => ({
    validateWorkflow: vi.fn(async () => ({
      conforms: true,
      stats: { totalViolations: 0 },
    })),
    validateHook: vi.fn(async () => ({
      conforms: true,
    })),
    validatePack: vi.fn(async () => ({
      conforms: true,
    })),
    formatErrorReport: vi.fn(() => ({
      summary: "No issues",
      violations: [],
      warnings: [],
    })),
  })),
}));

vi.mock("../../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ cwd: "/tmp/test" })),
  withGitVan: vi.fn(async (ctx, fn) => await fn()),
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn(() => "mock turtle content"),
}));

vi.mock("@unrdf/core", () => ({
  createStore: vi.fn(async () => ({
    addQuad: vi.fn(),
  })),
  parseTurtle: vi.fn(() => []),
}));

import { validateCommand } from "../../../src/cli/commands/validate.mjs";

describe("Validate Command", () => {
  describe("validateCommand", () => {
    it("should be defined", () => {
      expect(validateCommand).toBeDefined();
      expect(validateCommand.meta).toBeDefined();
      expect(validateCommand.meta.name).toBe("validate");
    });

    it("should have proper metadata", () => {
      expect(validateCommand.meta.description).toContain("Validate");
      expect(validateCommand.meta.usage).toContain("gitvan validate");
      expect(validateCommand.meta.examples).toBeDefined();
      expect(validateCommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should have all required subcommands", () => {
      expect(validateCommand.subCommands).toBeDefined();
      expect(validateCommand.subCommands.workflow).toBeDefined();
      expect(validateCommand.subCommands.hook).toBeDefined();
      expect(validateCommand.subCommands.config).toBeDefined();
      expect(validateCommand.subCommands.pack).toBeDefined();
      expect(validateCommand.subCommands.all).toBeDefined();
    });
  });

  describe("workflow subcommand", () => {
    const wfCmd = validateCommand.subCommands.workflow;

    it("should be properly defined", () => {
      expect(wfCmd).toBeDefined();
      expect(wfCmd.meta.name).toBe("workflow");
      expect(wfCmd.meta.description).toContain("workflow");
    });

    it("should require file argument", () => {
      expect(wfCmd.args.file).toBeDefined();
      expect(wfCmd.args.file.type).toBe("string");
      expect(wfCmd.args.file.required).toBe(true);
    });

    it("should have strict flag", () => {
      expect(wfCmd.args.strict).toBeDefined();
      expect(wfCmd.args.strict.type).toBe("boolean");
      expect(wfCmd.args.strict.default).toBe(false);
    });

    it("should have verbose flag", () => {
      expect(wfCmd.args.verbose).toBeDefined();
      expect(wfCmd.args.verbose.type).toBe("boolean");
      expect(wfCmd.args.verbose.default).toBe(false);
    });

    it("should have usage and examples", () => {
      expect(wfCmd.meta.usage).toContain("validate workflow");
      expect(wfCmd.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("hook subcommand", () => {
    const hookCmd = validateCommand.subCommands.hook;

    it("should be properly defined", () => {
      expect(hookCmd).toBeDefined();
      expect(hookCmd.meta.name).toBe("hook");
      expect(hookCmd.meta.description).toContain("hook");
    });

    it("should require file argument", () => {
      expect(hookCmd.args.file).toBeDefined();
      expect(hookCmd.args.file.type).toBe("string");
      expect(hookCmd.args.file.required).toBe(true);
    });

    it("should have strict flag", () => {
      expect(hookCmd.args.strict).toBeDefined();
      expect(hookCmd.args.strict.type).toBe("boolean");
      expect(hookCmd.args.strict.default).toBe(false);
    });

    it("should have verbose flag", () => {
      expect(hookCmd.args.verbose).toBeDefined();
      expect(hookCmd.args.verbose.type).toBe("boolean");
      expect(hookCmd.args.verbose.default).toBe(false);
    });
  });

  describe("config subcommand", () => {
    const configCmd = validateCommand.subCommands.config;

    it("should be properly defined", () => {
      expect(configCmd).toBeDefined();
      expect(configCmd.meta.name).toBe("config");
      expect(configCmd.meta.description).toContain("config");
    });

    it("should require file argument", () => {
      expect(configCmd.args.file).toBeDefined();
      expect(configCmd.args.file.type).toBe("string");
      expect(configCmd.args.file.required).toBe(true);
    });

    it("should have strict and verbose flags", () => {
      expect(configCmd.args.strict).toBeDefined();
      expect(configCmd.args.strict.default).toBe(false);
      expect(configCmd.args.verbose).toBeDefined();
      expect(configCmd.args.verbose.default).toBe(false);
    });
  });

  describe("pack subcommand", () => {
    const packCmd = validateCommand.subCommands.pack;

    it("should be properly defined", () => {
      expect(packCmd).toBeDefined();
      expect(packCmd.meta.name).toBe("pack");
      expect(packCmd.meta.description).toContain("pack");
    });

    it("should require file argument", () => {
      expect(packCmd.args.file).toBeDefined();
      expect(packCmd.args.file.type).toBe("string");
      expect(packCmd.args.file.required).toBe(true);
    });

    it("should have strict and verbose flags", () => {
      expect(packCmd.args.strict).toBeDefined();
      expect(packCmd.args.verbose).toBeDefined();
    });
  });

  describe("all subcommand", () => {
    const allCmd = validateCommand.subCommands.all;

    it("should be properly defined", () => {
      expect(allCmd).toBeDefined();
      expect(allCmd.meta.name).toBe("all");
      expect(allCmd.meta.description).toContain("all");
    });

    it("should have strict flag", () => {
      expect(allCmd.args.strict).toBeDefined();
      expect(allCmd.args.strict.type).toBe("boolean");
      expect(allCmd.args.strict.default).toBe(false);
    });

    it("should have verbose flag", () => {
      expect(allCmd.args.verbose).toBeDefined();
      expect(allCmd.args.verbose.type).toBe("boolean");
      expect(allCmd.args.verbose.default).toBe(false);
    });
  });
});

describe("Validate Command Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("workflow validation run", () => {
    it("should validate a workflow file without error", async () => {
      const wfCmd = validateCommand.subCommands.workflow;
      await expect(
        wfCmd.run({
          args: {
            file: "./test-workflow.ttl",
            strict: false,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });

    it("should validate a workflow in strict mode", async () => {
      const wfCmd = validateCommand.subCommands.workflow;
      await expect(
        wfCmd.run({
          args: {
            file: "./test-workflow.ttl",
            strict: true,
            verbose: true,
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("hook validation run", () => {
    it("should validate a hook file without error", async () => {
      const hookCmd = validateCommand.subCommands.hook;
      await expect(
        hookCmd.run({
          args: {
            file: "./test-hook.ttl",
            strict: false,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("config validation run", () => {
    it("should validate a config file without error", async () => {
      const configCmd = validateCommand.subCommands.config;
      await expect(
        configCmd.run({
          args: {
            file: "./gitvan.config.js",
            strict: false,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("pack validation run", () => {
    it("should validate a JSON pack file without error", async () => {
      const { readFileSync } = await import("fs");
      readFileSync.mockReturnValue('{"name":"test","version":"1.0.0"}');

      const packCmd = validateCommand.subCommands.pack;
      await expect(
        packCmd.run({
          args: {
            file: "./pack.json",
            strict: false,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });

    it("should validate a Turtle pack file without error", async () => {
      const { readFileSync } = await import("fs");
      readFileSync.mockReturnValue("@prefix gv: <http://gitvan.org/> .");

      const packCmd = validateCommand.subCommands.pack;
      await expect(
        packCmd.run({
          args: {
            file: "./pack.ttl",
            strict: false,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("all validation run", () => {
    it("should validate all configurations without error", async () => {
      const allCmd = validateCommand.subCommands.all;
      await expect(
        allCmd.run({
          args: { strict: false, verbose: false },
        })
      ).resolves.not.toThrow();
    });
  });
});
