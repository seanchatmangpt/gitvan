import { describe, expect, it } from "vitest";
import { createProbeExecutor, listCapabilityProbes } from "../../src/capabilities/index.mjs";

describe("runtime capability probes", () => {
  it("registers a probe for every generated capability", () => {
    expect(listCapabilityProbes()).toEqual([
      "gitvan.job.discovery",
      "gitvan.job.execution",
      "gitvan.lock",
      "gitvan.pack",
      "gitvan.receipt",
      "gitvan.registry",
      "gitvan.scheduler",
      "gitvan.template",
      "gitvan.workflow.dag",
    ]);
  });

  it("executes the real workflow DAG planner and negative cycle control", async () => {
    const execute = createProbeExecutor({ mode: "behavior" });
    const result = await execute({ id: "gitvan.workflow.dag" });
    expect(result.ok).toBe(true);
    expect(result.standing).toBe("ALIVE");
    expect(result.report.evidence.order).toEqual(["observe", "admit", "receipt"]);
    expect(result.report.evidence.cycleRefused).toBe(true);
  });

  it("keeps surface inspection at PARTIAL_ALIVE", async () => {
    const execute = createProbeExecutor({ mode: "surface" });
    const result = await execute({ id: "gitvan.workflow.dag" });
    expect(result.ok).toBe(true);
    expect(result.standing).toBe("PARTIAL_ALIVE");
  });

  it("classifies unregistered probes as UNSUPPORTED", async () => {
    const execute = createProbeExecutor();
    await expect(execute({ id: "gitvan.unknown" })).resolves.toMatchObject({
      ok: false,
      standing: "UNSUPPORTED",
    });
  });
});
