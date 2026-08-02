import { describe, expect, it } from "vitest";
import {
  admitWizardActuation,
  composeWizardPlan,
  exploreCapabilitySpace,
  planTelcoMesh,
  selectCapabilityCombination,
  simulateTelcoFailure,
} from "../../src/capabilities/index.mjs";

describe("combinatorial maximalist explorer", () => {
  const options = [
    { id: "fast", provides: ["dx"], utility: 5, cost: 2, reversibility: 0.9, evidence: 0.8 },
    { id: "safe", provides: ["doctor"], utility: 4, cost: 1, reversibility: 1, evidence: 1 },
    { id: "dominated", provides: ["dx"], utility: 1, cost: 4, reversibility: 0.2, evidence: 0.1 },
    { id: "actuator", provides: ["do"], utility: 100, cost: 1, actuation: true },
    { id: "conflict", provides: ["bad"], conflicts: ["safe"], utility: 50, cost: 1 },
  ];

  it("preserves admitted Pareto-frontier combinations and refuses ambient actuation", () => {
    const space = exploreCapabilitySpace(options, { maximumCombinationSize: 3, maxCost: 5, allowActuation: false });
    expect(space.admitted).toBeGreaterThan(0);
    expect(space.frontier.some(item => item.ids.includes("dominated"))).toBe(false);
    expect(space.frontier.some(item => item.ids.includes("actuator"))).toBe(false);
    expect(space.frontier.some(item => item.ids.includes("safe") && item.ids.includes("conflict"))).toBe(false);
  });

  it("selects without actuating", () => {
    const selection = selectCapabilityCombination(exploreCapabilitySpace(options, { maxCost: 5 }), { objective: "balanced" });
    expect(selection.selected).toBeDefined();
    expect(selection.actuates).toBe(false);
  });
});

describe("wizard composition", () => {
  it("constructs a reversible plan and refuses missing receipts", () => {
    const plan = composeWizardPlan({
      id: "intent-1",
      goal: "manufacture verified developer workflow",
      desiredCapabilities: ["dx", "doctor"],
      constraints: { maxCost: 4, maxAuthorityRisk: 0.2 },
    }, [
      { id: "orientation", provides: ["dx"], utility: 5, cost: 1, evidence: 0.8 },
      { id: "diagnosis", provides: ["doctor"], utility: 5, cost: 1, evidence: 0.9 },
    ]);
    expect(plan.actuates).toBe(false);
    expect(plan.steps.every(step => step.authority === "NONE")).toBe(true);
    expect(() => admitWizardActuation(plan, [])).toThrow(/missing ALIVE receipts/);
  });
});

describe("telco resilience", () => {
  const nodes = [
    { id: "west-1", region: "west", capabilities: ["receipt", "route"], standing: "ALIVE" },
    { id: "east-1", region: "east", capabilities: ["receipt", "route"], standing: "ALIVE" },
    { id: "east-2", region: "east", capabilities: ["receipt", "route"], standing: "ALIVE" },
  ];
  const links = [
    { from: "west-1", to: "east-1", latencyMs: 40, reliability: 0.999, cost: 2 },
    { from: "west-1", to: "east-2", latencyMs: 45, reliability: 0.998, cost: 1 },
    { from: "east-1", to: "east-2", latencyMs: 5, reliability: 0.9999, cost: 1 },
  ];

  it("plans regional quorum and detects quorum loss", () => {
    const plan = planTelcoMesh(nodes, links, { requiredCapabilities: ["receipt", "route"], quorum: 2 });
    expect(plan.resilient).toBe(true);
    expect(plan.actuates).toBe(false);
    expect(simulateTelcoFailure(plan, ["west-1"]).standing).toBe("BLOCKED");
    expect(simulateTelcoFailure(plan, ["east-2"]).standing).toBe("ALIVE");
  });
});
