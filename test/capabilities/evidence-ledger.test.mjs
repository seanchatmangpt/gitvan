import { describe, expect, it } from "vitest";
import { CapabilityEvidenceLedger } from "../../src/capabilities/index.mjs";

describe("CapabilityEvidenceLedger", () => {
  it("creates a deterministic hash chain", () => {
    let tick = 0;
    const ledger = new CapabilityEvidenceLedger({ now: () => `t${tick++}` });
    const first = ledger.append("verification.started", { capability: "gitvan.receipt" });
    const second = ledger.append("verification.finished", { capability: "gitvan.receipt", standing: "ALIVE" });

    expect(first.body.previousHash).toBeNull();
    expect(second.body.previousHash).toBe(first.hash);
    expect(ledger.verify()).toEqual({ valid: true, entries: 2, head: second.hash });
    expect(ledger.summary().byType).toEqual({ "verification.started": 1, "verification.finished": 1 });
    expect(ledger.list({ capability: "gitvan.receipt" })).toHaveLength(2);
    expect(ledger.toNDJSON().trim().split("\n")).toHaveLength(2);
  });

  it("refuses imported evidence with a broken chain", () => {
    expect(() => new CapabilityEvidenceLedger({
      entries: [{
        body: { sequence: 1, type: "x", recordedAt: "t0", previousHash: "wrong", payload: {} },
        hash: "not-a-hash",
      }],
    })).toThrow(/chain mismatch/);
  });
});
