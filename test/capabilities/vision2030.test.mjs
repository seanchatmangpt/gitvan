import { describe, expect, it } from "vitest";
import {
  defaultVision2030Candidates,
  evaluateVision2030,
  leverageScore,
  rankLeveragePortfolio,
  vision2030Roadmap,
} from "../../src/capabilities/index.mjs";

const capabilities = [
  "gitvan.receipt",
  "gitvan.lock",
  "gitvan.job.discovery",
  "gitvan.job.execution",
  "gitvan.scheduler",
  "gitvan.workflow.dag",
  "gitvan.pack",
  "gitvan.template",
  "gitvan.registry",
].map(id => ({ id, state: "PARTIAL_ALIVE" }));

describe("Vision 2030 capability assessment", () => {
  it("does not crown declared capabilities without ALIVE receipt-backed claims", () => {
    const assessment = evaluateVision2030(capabilities);
    expect(assessment.achieved).toBe(false);
    expect(assessment.horizon).toBe("SUBSYSTEM");
    expect(assessment.domains.every(domain => domain.gaps.length > 0)).toBe(true);
    expect(assessment.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("achieves Vision 2030 only when all required capabilities are ALIVE", () => {
    const claims = capabilities.map(item => ({ capability: item.id, standing: "ALIVE", receiptHash: `${item.id}-receipt` }));
    const assessment = evaluateVision2030(capabilities, claims, { subject: { sha: "exact-head" } });
    expect(assessment.achieved).toBe(true);
    expect(assessment.percent).toBe(100);
    expect(assessment.horizon).toBe("VISION_2030");
    expect(vision2030Roadmap(assessment).work).toHaveLength(0);
  });

  it("prioritizes weighted maturity gaps", () => {
    const claims = [{ capability: "gitvan.receipt", standing: "ALIVE", receiptHash: "r" }];
    const roadmap = vision2030Roadmap(evaluateVision2030(capabilities, claims));
    expect(roadmap.remainingDomains).toBeGreaterThan(0);
    expect(roadmap.work[0].priority).toBe(1);
    expect(roadmap.work[0].acceptance.every(item => item.includes("ALIVE receipt"))).toBe(true);
  });
});

describe("1000x leverage calculus", () => {
  it("recognizes multiplicative phase change rather than additive feature count", () => {
    const result = leverageScore({ frequency: 20, latencyReduction: 10, errorReduction: 5, reuse: 5, autonomy: 2, evidence: 2, cost: 5 });
    expect(result.score).toBeGreaterThanOrEqual(1000);
    expect(result.phase).toBe("PHASE_CHANGE_1000X");
  });

  it("ranks the default 2030 portfolio and respects bounded budget", () => {
    const portfolio = rankLeveragePortfolio(defaultVision2030Candidates(), { budget: 18 });
    expect(portfolio.ranked).toHaveLength(4);
    expect(portfolio.spent).toBeLessThanOrEqual(18);
    expect(portfolio.selected.length).toBeGreaterThan(0);
    expect(portfolio.ranked[0].leverage.score).toBeGreaterThanOrEqual(portfolio.ranked.at(-1).leverage.score);
  });
});
