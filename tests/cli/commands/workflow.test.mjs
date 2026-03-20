/**
 * Tests for Workflow Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockWorkflowCLIInstance = {
  initialize: vi.fn(async () => {}),
  list: vi.fn(async () => {}),
  run: vi.fn(async () => {}),
  validate: vi.fn(async () => {}),
  create: vi.fn(async () => {}),
  stats: vi.fn(async () => {}),
  cursor: vi.fn(async () => {}),
  generateCursorScript: vi.fn(async () => {}),
  help: vi.fn(() => {}),
};

vi.mock("../../../src/cli/workflow.mjs", () => {
  function MockWorkflowCLI() {
    return mockWorkflowCLIInstance;
  }
  return { WorkflowCLI: MockWorkflowCLI };
});

vi.mock("../../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ cwd: "/tmp/test" })),
  withGitVan: vi.fn(async (ctx, fn) => await fn()),
}));

import { workflowCommand } from "../../../src/cli/commands/workflow.mjs";
import { WorkflowCLI } from "../../../src/cli/workflow.mjs";
import { withGitVan } from "../../../src/core/context.mjs";

// Reset mock instance between tests
beforeEach(() => {
  Object.values(mockWorkflowCLIInstance).forEach((fn) => {
    if (typeof fn.mockClear === "function") fn.mockClear();
  });
});

describe("Workflow Command", () => {
  describe("workflowCommand", () => {
    it("should be defined", () => {
      expect(workflowCommand).toBeDefined();
      expect(workflowCommand.meta).toBeDefined();
      expect(workflowCommand.meta.name).toBe("workflow");
    });

    it("should have proper metadata", () => {
      expect(workflowCommand.meta.description).toBe("Manage GitVan Workflows");
      expect(workflowCommand.meta.usage).toContain("gitvan workflow");
      expect(workflowCommand.meta.examples).toBeDefined();
      expect(workflowCommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should have all required subcommands", () => {
      expect(workflowCommand.subCommands).toBeDefined();
      expect(workflowCommand.subCommands.list).toBeDefined();
      expect(workflowCommand.subCommands.run).toBeDefined();
      expect(workflowCommand.subCommands.validate).toBeDefined();
      expect(workflowCommand.subCommands.create).toBeDefined();
      expect(workflowCommand.subCommands.stats).toBeDefined();
      expect(workflowCommand.subCommands.cursor).toBeDefined();
      expect(workflowCommand.subCommands["cursor-script"]).toBeDefined();
      expect(workflowCommand.subCommands.help).toBeDefined();
    });
  });

  describe("list subcommand", () => {
    const listCmd = workflowCommand.subCommands.list;

    it("should be properly defined", () => {
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have verbose argument", () => {
      expect(listCmd.args).toBeDefined();
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.verbose.type).toBe("boolean");
      expect(listCmd.args.verbose.default).toBe(false);
    });

    it("should have usage and examples", () => {
      expect(listCmd.meta.usage).toContain("workflow list");
      expect(listCmd.meta.examples).toBeDefined();
      expect(listCmd.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("run subcommand", () => {
    const runCmd = workflowCommand.subCommands.run;

    it("should be properly defined", () => {
      expect(runCmd).toBeDefined();
      expect(runCmd.meta.name).toBe("run");
      expect(runCmd.meta.description).toContain("Execute");
    });

    it("should require workflowId argument", () => {
      expect(runCmd.args.workflowId).toBeDefined();
      expect(runCmd.args.workflowId.type).toBe("positional");
      expect(runCmd.args.workflowId.required).toBe(true);
    });

    it("should have dry-run flag", () => {
      expect(runCmd.args["dry-run"]).toBeDefined();
      expect(runCmd.args["dry-run"].type).toBe("boolean");
      expect(runCmd.args["dry-run"].default).toBe(false);
    });

    it("should have verbose flag", () => {
      expect(runCmd.args.verbose).toBeDefined();
      expect(runCmd.args.verbose.type).toBe("boolean");
      expect(runCmd.args.verbose.default).toBe(false);
    });

    it("should have input argument", () => {
      expect(runCmd.args.input).toBeDefined();
      expect(runCmd.args.input.type).toBe("string");
    });
  });

  describe("validate subcommand", () => {
    const validateCmd = workflowCommand.subCommands.validate;

    it("should be properly defined", () => {
      expect(validateCmd).toBeDefined();
      expect(validateCmd.meta.name).toBe("validate");
      expect(validateCmd.meta.description).toContain("Validate");
    });

    it("should require workflowId argument", () => {
      expect(validateCmd.args.workflowId).toBeDefined();
      expect(validateCmd.args.workflowId.type).toBe("positional");
      expect(validateCmd.args.workflowId.required).toBe(true);
    });
  });

  describe("create subcommand", () => {
    const createCmd = workflowCommand.subCommands.create;

    it("should be properly defined", () => {
      expect(createCmd).toBeDefined();
      expect(createCmd.meta.name).toBe("create");
      expect(createCmd.meta.description).toContain("Create");
    });

    it("should require workflowId argument", () => {
      expect(createCmd.args.workflowId).toBeDefined();
      expect(createCmd.args.workflowId.type).toBe("positional");
      expect(createCmd.args.workflowId.required).toBe(true);
    });

    it("should have optional title argument", () => {
      expect(createCmd.args.title).toBeDefined();
      expect(createCmd.args.title.type).toBe("positional");
      expect(createCmd.args.title.required).toBe(false);
    });
  });

  describe("stats subcommand", () => {
    const statsCmd = workflowCommand.subCommands.stats;

    it("should be properly defined", () => {
      expect(statsCmd).toBeDefined();
      expect(statsCmd.meta.name).toBe("stats");
      expect(statsCmd.meta.description).toContain("statistics");
    });
  });

  describe("cursor subcommand", () => {
    const cursorCmd = workflowCommand.subCommands.cursor;

    it("should be properly defined", () => {
      expect(cursorCmd).toBeDefined();
      expect(cursorCmd.meta.name).toBe("cursor");
      expect(cursorCmd.meta.description).toContain("Cursor");
    });

    it("should require workflowId argument", () => {
      expect(cursorCmd.args.workflowId).toBeDefined();
      expect(cursorCmd.args.workflowId.type).toBe("positional");
      expect(cursorCmd.args.workflowId.required).toBe(true);
    });

    it("should have interactive flag", () => {
      expect(cursorCmd.args.interactive).toBeDefined();
      expect(cursorCmd.args.interactive.type).toBe("boolean");
      expect(cursorCmd.args.interactive.default).toBe(false);
    });

    it("should have non-interactive flag", () => {
      expect(cursorCmd.args["non-interactive"]).toBeDefined();
      expect(cursorCmd.args["non-interactive"].type).toBe("boolean");
    });

    it("should have model and prompt arguments", () => {
      expect(cursorCmd.args.model).toBeDefined();
      expect(cursorCmd.args.model.type).toBe("string");
      expect(cursorCmd.args.prompt).toBeDefined();
      expect(cursorCmd.args.prompt.type).toBe("string");
    });
  });

  describe("cursor-script subcommand", () => {
    const cursorScriptCmd = workflowCommand.subCommands["cursor-script"];

    it("should be properly defined", () => {
      expect(cursorScriptCmd).toBeDefined();
      expect(cursorScriptCmd.meta.name).toBe("cursor-script");
      expect(cursorScriptCmd.meta.description).toContain("Cursor");
    });

    it("should require workflowId argument", () => {
      expect(cursorScriptCmd.args.workflowId).toBeDefined();
      expect(cursorScriptCmd.args.workflowId.type).toBe("positional");
      expect(cursorScriptCmd.args.workflowId.required).toBe(true);
    });
  });

  describe("help subcommand", () => {
    const helpCmd = workflowCommand.subCommands.help;

    it("should be properly defined", () => {
      expect(helpCmd).toBeDefined();
      expect(helpCmd.meta.name).toBe("help");
    });
  });
});

describe("Workflow Command Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call WorkflowCLI.list on list subcommand run", async () => {
    const listCmd = workflowCommand.subCommands.list;
    await listCmd.run({ args: { verbose: false } });

    expect(withGitVan).toHaveBeenCalled();
    expect(mockWorkflowCLIInstance.list).toHaveBeenCalled();
  });

  it("should call WorkflowCLI.run with correct args on run subcommand", async () => {
    const runCmd = workflowCommand.subCommands.run;
    await runCmd.run({
      args: {
        workflowId: "my-workflow",
        "dry-run": true,
        verbose: false,
        input: "key=value",
      },
    });

    expect(mockWorkflowCLIInstance.run).toHaveBeenCalledWith("my-workflow", {
      inputs: { key: "value" },
      dryRun: true,
      verbose: false,
    });
  });

  it("should parse multiple input parameters", async () => {
    const runCmd = workflowCommand.subCommands.run;
    await runCmd.run({
      args: {
        workflowId: "my-workflow",
        "dry-run": false,
        verbose: false,
        input: ["key1=val1", "key2=val2"],
      },
    });

    expect(mockWorkflowCLIInstance.run).toHaveBeenCalledWith("my-workflow", {
      inputs: { key1: "val1", key2: "val2" },
      dryRun: false,
      verbose: false,
    });
  });

  it("should call WorkflowCLI.validate on validate subcommand", async () => {
    const validateCmd = workflowCommand.subCommands.validate;
    await validateCmd.run({ args: { workflowId: "test-wf" } });

    expect(mockWorkflowCLIInstance.validate).toHaveBeenCalledWith("test-wf");
  });

  it("should call WorkflowCLI.create on create subcommand", async () => {
    const createCmd = workflowCommand.subCommands.create;
    await createCmd.run({
      args: { workflowId: "new-wf", title: "New Workflow" },
    });

    expect(mockWorkflowCLIInstance.create).toHaveBeenCalledWith("new-wf", "New Workflow");
  });

  it("should call WorkflowCLI.stats on stats subcommand", async () => {
    const statsCmd = workflowCommand.subCommands.stats;
    await statsCmd.run();

    expect(mockWorkflowCLIInstance.stats).toHaveBeenCalled();
  });

  it("should call WorkflowCLI.cursor with options", async () => {
    const cursorCmd = workflowCommand.subCommands.cursor;
    await cursorCmd.run({
      args: {
        workflowId: "my-wf",
        interactive: true,
        "non-interactive": false,
        model: "gpt-4",
        prompt: "Test prompt",
      },
    });

    expect(mockWorkflowCLIInstance.cursor).toHaveBeenCalledWith("my-wf", {
      interactive: true,
      nonInteractive: false,
      model: "gpt-4",
      prompt: "Test prompt",
    });
  });

  it("should call WorkflowCLI.help on help subcommand", async () => {
    const helpCmd = workflowCommand.subCommands.help;
    await helpCmd.run();

    expect(mockWorkflowCLIInstance.help).toHaveBeenCalled();
  });

  it("should call generateCursorScript on cursor-script subcommand", async () => {
    const cursorScriptCmd = workflowCommand.subCommands["cursor-script"];
    await cursorScriptCmd.run({ args: { workflowId: "wf-1" } });

    expect(mockWorkflowCLIInstance.generateCursorScript).toHaveBeenCalledWith("wf-1");
  });
});
