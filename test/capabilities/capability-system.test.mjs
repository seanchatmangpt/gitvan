import { describe, expect, it } from "vitest";
import {
  CapabilityRefusal,
  CapabilityRegistry,
  assertReceiptedActuation,
  createGitVanCapabilityRegistry,
  verifyCapability,
} from "../../src/capabilities/index.mjs";

describe("capability registry", () => {
  it("is dependency closed and deterministically ordered", () => {
    const registry = createGitVanCapabilityRegistry();
    const order = registry.dependencyOrder("gitvan.template").map(item => item.id);
    expect(order.at(-1)).toBe("gitvan.template");
    expect(order).toContain("gitvan.receipt");
    expect(new Set(order).size).toBe(order.length);
  });

  it("refuses missing dependencies and cycles", () => {
    expect(() => new CapabilityRegistry([{ id: "a", dependsOn: ["missing"] }])).toThrow(CapabilityRefusal);
    expect(() => new CapabilityRegistry([{ id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }])).toThrow(/cycle/i);
  });
});

describe("capability receipts", () => {
  it("manufactures a deterministic, replay-verifiable ALIVE receipt", async () => {
    const registry = new CapabilityRegistry([
      { id: "base", state: "PARTIAL_ALIVE", verifier: "base.test" },
      { id: "target", state: "PARTIAL_ALIVE", dependsOn: ["base"], verifier: "target.test" },
    ]);
    let tick = 0;
    const receipt = await verifyCapability(registry, "target", {
      now: () => `t${tick++}`,
      subject: { repo: "seanchatmangpt/gitvan", base: "a46182c283ffb7af76e6fabde3efe2b810d75fc7" },
      execute: async capability => ({ ok: true, output: capability.id }),
    });
    expect(receipt.standing).toBe("ALIVE");
    expect(receipt.observations).toHaveLength(2);
    expect(receipt.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(assertReceiptedActuation(receipt, "target")).toBe(true);
  });

  it("refuses failed, blocked, and tampered evidence", async () => {
    const registry = new CapabilityRegistry([{ id: "target", state: "PARTIAL_ALIVE", verifier: "target.test" }]);
    const failed = await verifyCapability(registry, "target", { execute: async () => ({ ok: false }) });
    expect(failed.standing).toBe("PARTIAL_ALIVE");
    expect(() => assertReceiptedActuation(failed, "target")).toThrow(/requires an ALIVE receipt/);
    const alive = await verifyCapability(registry, "target", { execute: async () => ({ ok: true }) });
    expect(() => assertReceiptedActuation({ ...alive, hash: "0".repeat(64) }, "target")).toThrow(/hash mismatch/);
  });
});
