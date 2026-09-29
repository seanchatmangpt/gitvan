import { describe, expect, it } from "vitest";
import {
  swarmReceiptAppendCommand,
  swarmReceiptShowCommand,
} from "../../src/cli/commands/swarm.mjs";

describe("swarm Citty contract", () => {
  it("requires exact repository and commit on append", () => {
    expect(swarmReceiptAppendCommand.args.repository.required).toBe(true);
    expect(swarmReceiptAppendCommand.args.commit.required).toBe(true);
    expect(swarmReceiptAppendCommand.args.commit.default).toBeUndefined();\n    expect(swarmReceiptAppendCommand.args.base.required).toBe(true);\n    expect(swarmReceiptAppendCommand.args.tool.required).toBe(true);\n    expect(swarmReceiptAppendCommand.args.task.required).toBe(true);
  });

  it("requires exact repository and commit on show", () => {
    expect(swarmReceiptShowCommand.args.repository.required).toBe(true);
    expect(swarmReceiptShowCommand.args.commit.required).toBe(true);
    expect(swarmReceiptShowCommand.args.commit.default).toBeUndefined();
  });
});
