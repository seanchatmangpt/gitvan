import { describe, expect, it } from "vitest";
import { diagnoseCapabilities, repairPlan } from "../../src/capabilities/index.mjs";

describe("capability doctor", () => {
  it("localizes missing evidence and failed transitions", () => {
    const report = diagnoseCapabilities({
      capabilities: [
        { id: "gitvan.receipt", state: "PARTIAL_ALIVE", verifier: "receipt.test.mjs" },
        { id: "gitvan.lock", state: "BUILD_BROKEN", verifier: "lock.test.mjs" },
      ],
      receipts: [{
        capability: "gitvan.receipt",
        hash: "receipt-hash",
        standing: "PARTIAL_ALIVE",
        subject: { sha: "wrong" },
        observations: [{ capability: "gitvan.receipt", verifier: "receipt.test.mjs", ok: false, standing: "BUILD_BROKEN" }],
      }],
      expectedSubject: { sha: "exact" },
    });
    expect(report.healthy).toBe(false);
    expect(report.findings[0].severity).toBe("critical");
    expect(report.findings.some(item => item.id === "subject.gitvan.receipt")).toBe(true);
    expect(report.findings.some(item => item.id === "standing.gitvan.lock")).toBe(true);
    expect(report.nextAction).toBeDefined();
  });

  it("constructs repair intents without ambient actuation authority", () => {
    const report = diagnoseCapabilities({
      capabilities: [{ id: "gitvan.receipt", state: "PARTIAL_ALIVE", verifier: "receipt.test.mjs" }],
      receipts: [],
    });
    const plan = repairPlan(report);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.actions.every(action => action.actuates === false)).toBe(true);
    expect(plan.invariant).toMatch(/does not actuate/);
  });

  it("reports a healthy exact-subject ALIVE capability", () => {
    const report = diagnoseCapabilities({
      capabilities: [{ id: "gitvan.receipt", state: "PARTIAL_ALIVE", verifier: "receipt.test.mjs" }],
      receipts: [{ capability: "gitvan.receipt", standing: "ALIVE", hash: "h", subject: { sha: "exact" }, observations: [{ ok: true, standing: "ALIVE" }] }],
      expectedSubject: { sha: "exact" },
    });
    expect(report.healthy).toBe(true);
    expect(report.findings).toHaveLength(0);
  });
});
