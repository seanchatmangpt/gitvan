import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CapabilityRuntime,
  CapabilityService,
  FileReceiptStore,
  createGitVanCapabilityRegistry,
} from "../../src/capabilities/index.mjs";

function runtime(root, execute = async capability => ({ ok: true, output: capability.id })) {
  return new CapabilityRuntime({
    registry: createGitVanCapabilityRegistry(),
    execute,
    receipts: new FileReceiptStore({ root }),
    subject: { repository: "seanchatmangpt/gitvan", sha: "exact-head" },
  });
}

describe("CapabilityService", () => {
  it("verifies, records evidence, and admits actuation", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-service-"));
    const service = new CapabilityService({ runtime: runtime(root) });

    const receipt = await service.verify("gitvan.lock");
    const admission = await service.admitActuation("gitvan.lock");

    expect(receipt.standing).toBe("ALIVE");
    expect(admission.admitted).toBe(true);
    expect(service.ledger.list({ capability: "gitvan.lock" }).map(item => item.body.type)).toEqual([
      "verification.started",
      "verification.finished",
      "receipt.read",
      "actuation.admitted",
    ]);
  });

  it("stops verify-all at the first non-ALIVE receipt by default", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-service-"));
    const service = new CapabilityService({
      runtime: runtime(root, async capability => ({ ok: capability.id !== "gitvan.receipt" })),
    });
    const receipts = await service.verifyAll();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].standing).toBe("PARTIAL_ALIVE");
  });

  it("projects status and graph formats", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-service-"));
    const service = new CapabilityService({ runtime: runtime(root) });
    expect(service.status().capabilities).toBe(9);
    expect(service.graph("mermaid")).toContain("flowchart LR");
    expect(service.graph("dot")).toContain("digraph gitvan_capabilities");
    expect(JSON.parse(service.graph("json")).nodes).toHaveLength(9);
  });
});
