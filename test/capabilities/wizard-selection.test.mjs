import { describe, expect, it } from "vitest";
import { admitWizardActuation, composeWizardPlan } from "../../src/capabilities/index.mjs";

describe("Wizard desired capability admission", () => {
  it("selects a lawful frontier bundle satisfying every achievable desired capability", () => {
    const plan = composeWizardPlan({
      id: "wizard-complete",
      goal: "manufacture a verified distributed workflow",
      desiredCapabilities: ["dx", "doctor", "telco", "wizard"],
      constraints: { maxCost: 6, maxAuthorityRisk: 0.5 },
    }, [
      { id: "dx", provides: ["dx"], utility: 5, cost: 1, reversibility: 1, evidence: 1 },
      { id: "doctor", provides: ["doctor"], utility: 5, cost: 1, reversibility: 1, evidence: 1 },
      { id: "telco", provides: ["telco"], utility: 8, cost: 2, reversibility: 0.9, evidence: 0.9 },
      { id: "wizard", provides: ["wizard"], requires: ["dx", "doctor"], utility: 10, cost: 2, reversibility: 1, evidence: 0.9 },
    ]);
    expect(plan.desiredCapabilitiesSatisfied).toBe(true);
    expect(plan.missingDesiredCapabilities).toEqual([]);
    expect(plan.selection.selected.provided).toEqual(expect.arrayContaining(["dx", "doctor", "telco", "wizard"]));
  });

  it("refuses actuation when no admitted combination satisfies the intent", () => {
    const plan = composeWizardPlan({
      id: "wizard-incomplete",
      goal: "manufacture unavailable capability",
      desiredCapabilities: ["missing"],
      constraints: { maxCost: 1 },
    }, [{ id: "dx", provides: ["dx"], utility: 1, cost: 1 }]);
    expect(plan.desiredCapabilitiesSatisfied).toBe(false);
    expect(() => admitWizardActuation(plan, [])).toThrow(/omits desired capabilities/);
  });
});
