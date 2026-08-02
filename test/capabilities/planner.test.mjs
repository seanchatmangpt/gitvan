import { describe, expect, it } from "vitest";
import {
  createGitVanCapabilityRegistry,
  createVerificationPlan,
  planToMermaid,
  selectCapabilities,
  verifyPlanHash,
} from "../../src/capabilities/index.mjs";

describe("capability verification planner", () => {
  const registry = createGitVanCapabilityRegistry();

  it("deduplicates dependency closure into topological stages", () => {
    const plan = createVerificationPlan(registry, ["gitvan.template", "gitvan.scheduler"]);
    expect(plan.targets).toEqual(["gitvan.scheduler", "gitvan.template"]);
    expect(plan.closure).toContain("gitvan.receipt");
    expect(plan.closure.filter(id => id === "gitvan.receipt")).toHaveLength(1);
    expect(plan.stages[0]).toContain("gitvan.receipt");
    expect(plan.stages.flat()).toEqual(expect.arrayContaining(plan.closure));
    expect(verifyPlanHash(plan)).toBe(true);
  });

  it("supports prefix and standing selectors", () => {
    expect(selectCapabilities(registry, { prefix: "gitvan.job" }).map(item => item.id)).toEqual([
      "gitvan.job.discovery",
      "gitvan.job.execution",
    ]);
    expect(selectCapabilities(registry, { states: ["PARTIAL_ALIVE"] })).toHaveLength(9);
  });

  it("detects plan tampering and renders Mermaid", () => {
    const plan = createVerificationPlan(registry, ["gitvan.lock"]);
    expect(verifyPlanHash({ ...plan, targets: ["gitvan.template"] })).toBe(false);
    expect(planToMermaid(plan)).toContain("Stage 1");
    expect(planToMermaid(plan)).toContain("gitvan.receipt");
  });
});
