import { describe, expect, it } from "vitest";
import {
  ChicagoCapabilityValidator,
  autonomicChicagoValidation,
  createGitVanCapabilityRegistry,
  generatePairwiseScenarios,
} from "../../src/capabilities/index.mjs";

function allPairs(parameters) {
  const names = Object.keys(parameters).sort();
  const result = new Set();
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const left of parameters[names[i]]) {
        for (const right of parameters[names[j]]) result.add(`${names[i]}=${JSON.stringify(left)}|${names[j]}=${JSON.stringify(right)}`);
      }
    }
  }
  return result;
}

function coveredPairs(scenarios) {
  const names = Object.keys(scenarios[0]).filter(name => name !== "id").sort();
  const result = new Set();
  for (const scenario of scenarios) {
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) result.add(`${names[i]}=${JSON.stringify(scenario[names[i]])}|${names[j]}=${JSON.stringify(scenario[names[j]])}`);
    }
  }
  return result;
}

function outcome(scenario, healthy = true) {
  if (scenario.failure === "timeout") return { ok: false, standing: "BLOCKED", classification: "VERIFIER_TIMEOUT" };
  if (scenario.failure === "build") return { ok: false, standing: "BUILD_BROKEN", classification: "VERIFIER_FAILED" };
  return healthy
    ? { ok: true, standing: "ALIVE", classification: "VERIFIER_ALIVE" }
    : { ok: false, standing: "BUILD_BROKEN", classification: "VERIFIER_FAILED" };
}

describe("Chicago combinatorial coverage", () => {
  it("covers every pair without enumerating the full Cartesian product", () => {
    const parameters = {
      transport: ["process", "probe", "remote"],
      failure: ["none", "timeout", "build"],
      subject: ["exact", "mismatch"],
      dependencyMode: ["closure", "target"],
    };
    const scenarios = generatePairwiseScenarios(parameters);
    const expected = allPairs(parameters);
    const actual = coveredPairs(scenarios);
    for (const pair of expected) expect(actual.has(pair), pair).toBe(true);
    expect(scenarios.length).toBeLessThan(3 * 3 * 2 * 2);
  });
});

describe("Chicago state-based validation", () => {
  it("validates every admitted capability through real registry, receipt, claims, and Doctor collaborators", async () => {
    const registry = createGitVanCapabilityRegistry();
    const validator = new ChicagoCapabilityValidator({
      registry,
      subject: { repository: "seanchatmangpt/gitvan", sha: "exact-head" },
    });
    const report = await validator.validateAll();

    expect(report.style).toBe("CHICAGO_STATE_BASED");
    expect(report.coveredCapabilities).toBe(registry.list().length);
    expect(report.complete).toBe(true);
    expect(report.executions).toBe(report.capabilities * report.scenariosPerCapability);
    expect(report.failedAssertions).toEqual([]);
    expect(report.claims.byStanding.ALIVE).toBe(registry.list().length);
    expect(report.diagnosis.healthy).toBe(true);
    expect(report.repairs.actions).toEqual([]);
    expect(report.standing).toBe("ALIVE");
    expect(report.actuates).toBe(false);
  });

  it("treats timeout and build scenarios as passing negative controls rather than health evidence", async () => {
    const registry = createGitVanCapabilityRegistry();
    const report = await new ChicagoCapabilityValidator({
      registry,
      subject: { repository: "seanchatmangpt/gitvan", sha: "exact-head" },
    }).validateAll();
    expect(report.pairwiseScenarios.some(item => item.failure === "timeout")).toBe(true);
    expect(report.pairwiseScenarios.some(item => item.failure === "build")).toBe(true);
    expect(report.baselineReceiptHashes).toHaveLength(registry.list().length);
    expect(report.standing).toBe("ALIVE");
  });

  it("runs a bounded autonomic repair pass and converges only after state becomes healthy", async () => {
    const registry = createGitVanCapabilityRegistry();
    let healthy = false;
    let repairs = 0;
    const validator = new ChicagoCapabilityValidator({
      registry,
      subject: { repository: "seanchatmangpt/gitvan", sha: "exact-head" },
      executeScenario: async (_capability, scenario) => outcome(scenario, healthy),
    });
    const result = await autonomicChicagoValidation({
      validator,
      maximumPasses: 3,
      repair: async plan => {
        expect(plan.actions.length).toBeGreaterThan(0);
        expect(plan.actions.every(action => action.actuates === false)).toBe(true);
        repairs += 1;
        healthy = true;
      },
    });
    expect(repairs).toBe(1);
    expect(result.passes).toHaveLength(2);
    expect(result.converged).toBe(true);
    expect(result.standing).toBe("ALIVE");
    expect(result.actuates).toBe(false);
  });
});
