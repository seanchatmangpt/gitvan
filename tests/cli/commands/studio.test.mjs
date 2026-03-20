/**
 * Tests for Studio Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockReturnValue('{"key": "value"}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

const { studioCommand } = await import(
  "../../../src/cli/commands/studio.mjs"
);

describe("Studio Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("studioCommand", () => {
    it("should be defined", () => {
      expect(studioCommand).toBeDefined();
      expect(studioCommand.meta).toBeDefined();
      expect(studioCommand.meta.name).toBe("studio");
    });

    it("should have proper description", () => {
      expect(studioCommand.meta.description).toContain("Studio");
    });

    it("should have all required subcommands", () => {
      expect(studioCommand.subCommands).toBeDefined();
      expect(studioCommand.subCommands.init).toBeDefined();
      expect(studioCommand.subCommands.hook).toBeDefined();
      expect(studioCommand.subCommands["hook:execute"]).toBeDefined();
      expect(studioCommand.subCommands["workflow:run"]).toBeDefined();
      expect(studioCommand.subCommands["knowledge:registry"]).toBeDefined();
      expect(studioCommand.subCommands["knowledge:store"]).toBeDefined();
      expect(studioCommand.subCommands["knowledge:retrieve"]).toBeDefined();
      expect(studioCommand.subCommands["automation:trigger"]).toBeDefined();
      expect(studioCommand.subCommands["automation:status"]).toBeDefined();
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/studio.mjs");
      expect(mod.default).toBe(mod.studioCommand);
    });

    it("should show help when run without subcommand", async () => {
      await studioCommand.run({});
    });
  });

  describe("init subcommand", () => {
    const initCmd = studioCommand.subCommands.init;

    it("should be properly defined", () => {
      expect(initCmd.meta.name).toBe("init");
      expect(initCmd.meta.description).toContain("Initialize");
    });

    it("should create directories and write config", async () => {
      const { mkdirSync, writeFileSync } = await import("node:fs");
      await initCmd.run({});
      expect(mkdirSync).toHaveBeenCalledTimes(2);
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe("hook:execute subcommand", () => {
    const hookCmd = studioCommand.subCommands["hook:execute"];

    it("should be properly defined", () => {
      expect(hookCmd.meta.name).toBe("hook:execute");
      expect(hookCmd.meta.description).toContain("Execute");
    });

    it("should have required name argument", () => {
      expect(hookCmd.args.name).toBeDefined();
      expect(hookCmd.args.name.type).toBe("string");
      expect(hookCmd.args.name.required).toBe(true);
    });

    it("should have context argument with default", () => {
      expect(hookCmd.args.context).toBeDefined();
      expect(hookCmd.args.context.default).toBe("{}");
    });

    it("should execute a hook and return result", async () => {
      const result = await hookCmd.run({
        args: { name: "test-hook", context: '{"key": "value"}' },
      });
      expect(result).toBeDefined();
      expect(result.hook).toBe("test-hook");
      expect(result.status).toBe("executed");
    });

    it("should handle invalid JSON context", async () => {
      await expect(
        hookCmd.run({ args: { name: "test-hook", context: "invalid" } })
      ).rejects.toThrow();
    });
  });

  describe("workflow:run subcommand", () => {
    const workflowCmd = studioCommand.subCommands["workflow:run"];

    it("should be properly defined", () => {
      expect(workflowCmd.meta.name).toBe("workflow:run");
      expect(workflowCmd.meta.description).toContain("workflow");
    });

    it("should have required name argument", () => {
      expect(workflowCmd.args.name).toBeDefined();
      expect(workflowCmd.args.name.required).toBe(true);
    });

    it("should have params argument with default", () => {
      expect(workflowCmd.args.params).toBeDefined();
      expect(workflowCmd.args.params.default).toBe("{}");
    });
  });

  describe("knowledge:registry subcommand", () => {
    const registryCmd = studioCommand.subCommands["knowledge:registry"];

    it("should be properly defined", () => {
      expect(registryCmd.meta.name).toBe("knowledge:registry");
      expect(registryCmd.meta.description).toContain("knowledge hooks");
    });

    it("should have format argument", () => {
      expect(registryCmd.args.format).toBeDefined();
      expect(registryCmd.args.format.default).toBe("text");
    });

    it("should list hooks in text format", async () => {
      const result = await registryCmd.run({ args: { format: "text" } });
      expect(result).toBeDefined();
    });

    it("should list hooks in json format", async () => {
      const result = await registryCmd.run({ args: { format: "json" } });
      expect(result).toBeDefined();
    });
  });

  describe("knowledge:store subcommand", () => {
    const storeCmd = studioCommand.subCommands["knowledge:store"];

    it("should be properly defined", () => {
      expect(storeCmd.meta.name).toBe("knowledge:store");
      expect(storeCmd.meta.description).toContain("Store");
    });

    it("should have required key and value arguments", () => {
      expect(storeCmd.args.key).toBeDefined();
      expect(storeCmd.args.key.required).toBe(true);
      expect(storeCmd.args.value).toBeDefined();
      expect(storeCmd.args.value.required).toBe(true);
    });

    it("should store knowledge data", async () => {
      const { writeFileSync, mkdirSync } = await import("node:fs");
      await storeCmd.run({
        args: { key: "test-key", value: '{"data": "test"}' },
      });
      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe("knowledge:retrieve subcommand", () => {
    const retrieveCmd = studioCommand.subCommands["knowledge:retrieve"];

    it("should be properly defined", () => {
      expect(retrieveCmd.meta.name).toBe("knowledge:retrieve");
      expect(retrieveCmd.meta.description).toContain("Retrieve");
    });

    it("should have required key argument", () => {
      expect(retrieveCmd.args.key).toBeDefined();
      expect(retrieveCmd.args.key.required).toBe(true);
    });

    it("should have format argument with default json", () => {
      expect(retrieveCmd.args.format).toBeDefined();
      expect(retrieveCmd.args.format.default).toBe("json");
    });

    it("should retrieve knowledge data in json format", async () => {
      const result = await retrieveCmd.run({
        args: { key: "test-key", format: "json" },
      });
      expect(result).toBeDefined();
    });

    it("should retrieve knowledge data in text format", async () => {
      const result = await retrieveCmd.run({
        args: { key: "test-key", format: "text" },
      });
      expect(result).toBeDefined();
    });
  });

  describe("automation:trigger subcommand", () => {
    const triggerCmd = studioCommand.subCommands["automation:trigger"];

    it("should be properly defined", () => {
      expect(triggerCmd.meta.name).toBe("automation:trigger");
      expect(triggerCmd.meta.description).toContain("Trigger");
    });

    it("should have required type argument", () => {
      expect(triggerCmd.args.type).toBeDefined();
      expect(triggerCmd.args.type.required).toBe(true);
    });

    it("should have metadata argument with default", () => {
      expect(triggerCmd.args.metadata).toBeDefined();
      expect(triggerCmd.args.metadata.default).toBe("{}");
    });

    it("should trigger automation and return result", async () => {
      const result = await triggerCmd.run({
        args: { type: "test", metadata: '{"env": "staging"}' },
      });
      expect(result).toBeDefined();
      expect(result.automation).toBe("test");
      expect(result.status).toBe("triggered");
    });
  });

  describe("automation:status subcommand", () => {
    const statusCmd = studioCommand.subCommands["automation:status"];

    it("should be properly defined", () => {
      expect(statusCmd.meta.name).toBe("automation:status");
      expect(statusCmd.meta.description).toContain("status");
    });

    it("should have format argument", () => {
      expect(statusCmd.args.format).toBeDefined();
      expect(statusCmd.args.format.default).toBe("json");
    });

    it("should return status in json format", async () => {
      const result = await statusCmd.run({ args: { format: "json" } });
      expect(result).toBeDefined();
      expect(result.studio).toBe("ready");
    });

    it("should return status in text format", async () => {
      const result = await statusCmd.run({ args: { format: "text" } });
      expect(result).toBeDefined();
    });
  });
});
