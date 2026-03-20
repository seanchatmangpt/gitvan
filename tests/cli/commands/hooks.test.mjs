/**
 * Tests for Hooks Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHooksCLIInstance = {
  initialize: vi.fn(async () => {}),
  list: vi.fn(async () => {}),
  listByCategory: vi.fn(async () => {}),
  listByDomain: vi.fn(async () => {}),
  evaluate: vi.fn(async () => {}),
  evaluateByCategory: vi.fn(async () => {}),
  evaluateByDomain: vi.fn(async () => {}),
  validate: vi.fn(async () => {}),
  stats: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
  create: vi.fn(async () => {}),
  help: vi.fn(() => {}),
};

vi.mock("../../../src/cli/hooks.mjs", () => {
  function MockHooksCLI() {
    return mockHooksCLIInstance;
  }
  return { HooksCLI: MockHooksCLI };
});

vi.mock("../../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ cwd: "/tmp/test" })),
  withGitVan: vi.fn(async (ctx, fn) => await fn()),
}));

import { hooksCommand } from "../../../src/cli/commands/hooks.mjs";
import { HooksCLI } from "../../../src/cli/hooks.mjs";
import { withGitVan } from "../../../src/core/context.mjs";

beforeEach(() => {
  Object.values(mockHooksCLIInstance).forEach((fn) => {
    if (typeof fn.mockClear === "function") fn.mockClear();
  });
});

describe("Hooks Command", () => {
  describe("hooksCommand", () => {
    it("should be defined", () => {
      expect(hooksCommand).toBeDefined();
      expect(hooksCommand.meta).toBeDefined();
      expect(hooksCommand.meta.name).toBe("hooks");
    });

    it("should have proper metadata", () => {
      expect(hooksCommand.meta.description).toContain("Knowledge Hooks");
      expect(hooksCommand.meta.usage).toContain("gitvan hooks");
      expect(hooksCommand.meta.examples).toBeDefined();
      expect(hooksCommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should have all required subcommands", () => {
      expect(hooksCommand.subCommands).toBeDefined();
      expect(hooksCommand.subCommands.list).toBeDefined();
      expect(hooksCommand.subCommands.evaluate).toBeDefined();
      expect(hooksCommand.subCommands.validate).toBeDefined();
      expect(hooksCommand.subCommands.stats).toBeDefined();
      expect(hooksCommand.subCommands.refresh).toBeDefined();
      expect(hooksCommand.subCommands.create).toBeDefined();
      expect(hooksCommand.subCommands.help).toBeDefined();
    });

    it("should have a default run function", () => {
      expect(typeof hooksCommand.run).toBe("function");
    });
  });

  describe("list subcommand", () => {
    const listCmd = hooksCommand.subCommands.list;

    it("should be properly defined", () => {
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have category filter", () => {
      expect(listCmd.args.category).toBeDefined();
      expect(listCmd.args.category.type).toBe("string");
    });

    it("should have domain filter", () => {
      expect(listCmd.args.domain).toBeDefined();
      expect(listCmd.args.domain.type).toBe("string");
    });

    it("should have usage and examples", () => {
      expect(listCmd.meta.usage).toContain("hooks list");
      expect(listCmd.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("evaluate subcommand", () => {
    const evalCmd = hooksCommand.subCommands.evaluate;

    it("should be properly defined", () => {
      expect(evalCmd).toBeDefined();
      expect(evalCmd.meta.name).toBe("evaluate");
      expect(evalCmd.meta.description).toContain("Evaluate");
    });

    it("should have dry-run flag", () => {
      expect(evalCmd.args["dry-run"]).toBeDefined();
      expect(evalCmd.args["dry-run"].type).toBe("boolean");
      expect(evalCmd.args["dry-run"].default).toBe(false);
    });

    it("should have verbose flag", () => {
      expect(evalCmd.args.verbose).toBeDefined();
      expect(evalCmd.args.verbose.type).toBe("boolean");
      expect(evalCmd.args.verbose.default).toBe(false);
    });

    it("should have category filter", () => {
      expect(evalCmd.args.category).toBeDefined();
      expect(evalCmd.args.category.type).toBe("string");
    });

    it("should have domain filter", () => {
      expect(evalCmd.args.domain).toBeDefined();
      expect(evalCmd.args.domain.type).toBe("string");
    });
  });

  describe("validate subcommand", () => {
    const validateCmd = hooksCommand.subCommands.validate;

    it("should be properly defined", () => {
      expect(validateCmd).toBeDefined();
      expect(validateCmd.meta.name).toBe("validate");
      expect(validateCmd.meta.description).toContain("Validate");
    });

    it("should require hookId argument", () => {
      expect(validateCmd.args.hookId).toBeDefined();
      expect(validateCmd.args.hookId.type).toBe("positional");
      expect(validateCmd.args.hookId.required).toBe(true);
    });
  });

  describe("stats subcommand", () => {
    const statsCmd = hooksCommand.subCommands.stats;

    it("should be properly defined", () => {
      expect(statsCmd).toBeDefined();
      expect(statsCmd.meta.name).toBe("stats");
      expect(statsCmd.meta.description).toContain("statistics");
    });
  });

  describe("refresh subcommand", () => {
    const refreshCmd = hooksCommand.subCommands.refresh;

    it("should be properly defined", () => {
      expect(refreshCmd).toBeDefined();
      expect(refreshCmd.meta.name).toBe("refresh");
      expect(refreshCmd.meta.description).toContain("Refresh");
    });
  });

  describe("create subcommand", () => {
    const createCmd = hooksCommand.subCommands.create;

    it("should be properly defined", () => {
      expect(createCmd).toBeDefined();
      expect(createCmd.meta.name).toBe("create");
      expect(createCmd.meta.description).toContain("Create");
    });

    it("should require hookId argument", () => {
      expect(createCmd.args.hookId).toBeDefined();
      expect(createCmd.args.hookId.type).toBe("positional");
      expect(createCmd.args.hookId.required).toBe(true);
    });

    it("should have optional title argument", () => {
      expect(createCmd.args.title).toBeDefined();
      expect(createCmd.args.title.type).toBe("positional");
    });

    it("should have optional predicateType argument with default", () => {
      expect(createCmd.args.predicateType).toBeDefined();
      expect(createCmd.args.predicateType.type).toBe("positional");
      expect(createCmd.args.predicateType.default).toBe("ask");
    });
  });

  describe("help subcommand", () => {
    const helpCmd = hooksCommand.subCommands.help;

    it("should be properly defined", () => {
      expect(helpCmd).toBeDefined();
      expect(helpCmd.meta.name).toBe("help");
    });
  });
});

describe("Hooks Command Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call HooksCLI.list when no filters provided", async () => {
    const listCmd = hooksCommand.subCommands.list;
    await listCmd.run({ args: {} });

    expect(mockHooksCLIInstance.list).toHaveBeenCalled();
  });

  it("should call listByCategory when category filter provided", async () => {
    const listCmd = hooksCommand.subCommands.list;
    await listCmd.run({ args: { category: "development" } });

    expect(mockHooksCLIInstance.listByCategory).toHaveBeenCalledWith("development");
  });

  it("should call listByDomain when domain filter provided", async () => {
    const listCmd = hooksCommand.subCommands.list;
    await listCmd.run({ args: { domain: "git" } });

    expect(mockHooksCLIInstance.listByDomain).toHaveBeenCalledWith("git");
  });

  it("should call evaluate with options", async () => {
    const evalCmd = hooksCommand.subCommands.evaluate;
    await evalCmd.run({
      args: { "dry-run": true, verbose: true },
    });

    expect(mockHooksCLIInstance.evaluate).toHaveBeenCalledWith({
      dryRun: true,
      verbose: true,
    });
  });

  it("should call evaluateByCategory when category provided", async () => {
    const evalCmd = hooksCommand.subCommands.evaluate;
    await evalCmd.run({
      args: { "dry-run": false, verbose: false, category: "security" },
    });

    expect(mockHooksCLIInstance.evaluateByCategory).toHaveBeenCalledWith("security", {
      dryRun: false,
      verbose: false,
    });
  });

  it("should call evaluateByDomain when domain provided", async () => {
    const evalCmd = hooksCommand.subCommands.evaluate;
    await evalCmd.run({
      args: { "dry-run": false, verbose: false, domain: "git" },
    });

    expect(mockHooksCLIInstance.evaluateByDomain).toHaveBeenCalledWith("git", {
      dryRun: false,
      verbose: false,
    });
  });

  it("should call validate with hookId", async () => {
    const validateCmd = hooksCommand.subCommands.validate;
    await validateCmd.run({ args: { hookId: "version-change" } });

    expect(mockHooksCLIInstance.validate).toHaveBeenCalledWith("version-change");
  });

  it("should call stats on stats subcommand", async () => {
    const statsCmd = hooksCommand.subCommands.stats;
    await statsCmd.run();

    expect(mockHooksCLIInstance.stats).toHaveBeenCalled();
  });

  it("should call refresh on refresh subcommand", async () => {
    const refreshCmd = hooksCommand.subCommands.refresh;
    await refreshCmd.run();

    expect(mockHooksCLIInstance.refresh).toHaveBeenCalled();
  });

  it("should call create with hookId, title, and predicateType", async () => {
    const createCmd = hooksCommand.subCommands.create;
    await createCmd.run({
      args: {
        hookId: "my-hook",
        title: "My Hook",
        predicateType: "selectThreshold",
      },
    });

    expect(mockHooksCLIInstance.create).toHaveBeenCalledWith(
      "my-hook",
      "My Hook",
      "selectThreshold"
    );
  });

  it("should call help on help subcommand", async () => {
    const helpCmd = hooksCommand.subCommands.help;
    await helpCmd.run();

    expect(mockHooksCLIInstance.help).toHaveBeenCalled();
  });

  it("should call help on default run (no subcommand)", async () => {
    await hooksCommand.run();

    expect(mockHooksCLIInstance.help).toHaveBeenCalled();
  });
});
