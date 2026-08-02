import { describe, expect, it, vi } from "vitest";
import {
  CapabilityBatchRunner,
  createGitVanCapabilityRegistry,
  verifyBatchReceipt,
} from "../../src/capabilities/index.mjs";

describe("CapabilityBatchRunner", () => {
  it("executes each dependency once in staged order", async () => {
    const registry = createGitVanCapabilityRegistry();
    const calls = [];
    let tick = 0;
    const runner = new CapabilityBatchRunner({
      registry,
      concurrency: 2,
      now: () => `t${tick++}`,
      subject: { sha: "exact-head" },
      execute: vi.fn(async capability => {
        calls.push(capability.id);
        return { ok: true, standing: "ALIVE", output: capability.id };
      }),
    });

    const receipt = await runner.run(["gitvan.template", "gitvan.scheduler"]);
    expect(receipt.standing).toBe("ALIVE");
    expect(receipt.complete).toBe(true);
    expect(new Set(calls).size).toBe(calls.length);
    expect(calls).toEqual(expect.arrayContaining(receipt.closure));
    expect(receipt.observations).toHaveLength(receipt.closure.length);
    expect(verifyBatchReceipt(receipt)).toBe(true);
  });

  it("blocks downstream stages after a failed dependency", async () => {
    const registry = createGitVanCapabilityRegistry();
    const runner = new CapabilityBatchRunner({
      registry,
      execute: async capability => ({
        ok: capability.id !== "gitvan.receipt",
        standing: capability.id === "gitvan.receipt" ? "BUILD_BROKEN" : "ALIVE",
      }),
    });

    const receipt = await runner.run(["gitvan.lock"]);
    expect(receipt.standing).toBe("BUILD_BROKEN");
    expect(receipt.observations).toContainEqual(expect.objectContaining({
      capability: "gitvan.receipt",
      standing: "BUILD_BROKEN",
    }));
    expect(receipt.observations).toContainEqual(expect.objectContaining({
      capability: "gitvan.lock",
      standing: "BLOCKED",
    }));
  });

  it("detects batch receipt tampering", async () => {
    const runner = new CapabilityBatchRunner({
      registry: createGitVanCapabilityRegistry(),
      execute: async () => ({ ok: true, standing: "PARTIAL_ALIVE" }),
    });
    const receipt = await runner.run(["gitvan.receipt"]);
    expect(receipt.standing).toBe("PARTIAL_ALIVE");
    expect(verifyBatchReceipt({ ...receipt, standing: "ALIVE" })).toBe(false);
  });
});
