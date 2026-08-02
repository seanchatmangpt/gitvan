import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CapabilityRuntime, FileReceiptStore, createGitVanCapabilityRegistry, verifyReceipt } from "../../src/capabilities/index.mjs";

describe("CapabilityRuntime", () => {
  it("verifies dependency closure, persists the receipt, and admits actuation", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-capability-"));
    const registry = createGitVanCapabilityRegistry([
      { id: "gitvan.receipt", state: "PARTIAL_ALIVE", verifier: "receipt.test.mjs" },
      { id: "gitvan.lock", state: "PARTIAL_ALIVE", verifier: "lock.test.mjs" },
    ]);
    const execute = vi.fn(async capability => ({ ok: true, standing: "ALIVE", output: `${capability.id}:pass` }));
    const nowValues = [
      "2026-08-02T00:00:00.000Z",
      "2026-08-02T00:00:01.000Z",
      "2026-08-02T00:00:02.000Z",
      "2026-08-02T00:00:03.000Z",
    ];
    const runtime = new CapabilityRuntime({
      registry,
      execute,
      receipts: new FileReceiptStore({ root }),
      subject: { repository: "seanchatmangpt/gitvan", sha: "exact-head" },
      now: () => nowValues.shift(),
    });

    const receipt = await runtime.verify("gitvan.lock");
    const admission = await runtime.admitActuation("gitvan.lock");
    const stored = JSON.parse(await readFile(join(root, "gitvan.lock.json"), "utf8"));

    expect(runtime.transport).toBe("custom");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls.map(([capability]) => capability.id)).toEqual(["gitvan.receipt", "gitvan.lock"]);
    expect(receipt.standing).toBe("ALIVE");
    expect(receipt.subject.transport).toBe("custom");
    expect(verifyReceipt(receipt)).toBe(true);
    expect(stored.hash).toBe(receipt.hash);
    expect(admission).toEqual({
      admitted: true,
      capability: "gitvan.lock",
      receiptHash: receipt.hash,
      subject: { repository: "seanchatmangpt/gitvan", sha: "exact-head", transport: "custom" },
    });
  });

  it("does not admit actuation when a dependency verifier fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-capability-"));
    const runtime = new CapabilityRuntime({
      registry: createGitVanCapabilityRegistry(),
      execute: async capability => ({
        ok: capability.id !== "gitvan.receipt",
        standing: capability.id !== "gitvan.receipt" ? "ALIVE" : "PARTIAL_ALIVE",
        output: "failure",
      }),
      receipts: new FileReceiptStore({ root }),
    });

    const receipt = await runtime.verify("gitvan.lock");

    expect(receipt.standing).toBe("PARTIAL_ALIVE");
    await expect(runtime.admitActuation("gitvan.lock")).rejects.toMatchObject({
      type: "UNRECEIPTED_ACTUATION_REFUSED",
    });
  });

  it("selects the probe transport without ambient process execution", () => {
    const runtime = new CapabilityRuntime({ transport: "probe", probe: { mode: "surface" } });
    expect(runtime.transport).toBe("probe");
    expect(runtime.inspect("gitvan.workflow.dag").transport).toBe("probe");
  });

  it("refuses unknown verification transports", () => {
    expect(() => new CapabilityRuntime({ transport: "network" })).toThrow(/Unknown capability verification transport/);
  });
});
