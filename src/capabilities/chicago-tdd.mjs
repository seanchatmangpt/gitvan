import { createHash } from "node:crypto";
import { CapabilityClaimLedger } from "./claims.mjs";
import { diagnoseCapabilities, repairPlan } from "./doctor.mjs";
import { verifyCapability } from "./verifier.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function pairs(parameters) {
  const result = new Set();
  const names = Object.keys(parameters);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const left of parameters[names[i]]) {
        for (const right of parameters[names[j]]) result.add(`${names[i]}=${JSON.stringify(left)}|${names[j]}=${JSON.stringify(right)}`);
      }
    }
  }
  return result;
}

function scenarioPairs(scenario, names) {
  const result = new Set();
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) result.add(`${names[i]}=${JSON.stringify(scenario[names[i]])}|${names[j]}=${JSON.stringify(scenario[names[j]])}`);
  }
  return result;
}

export function generatePairwiseScenarios(parametersInput = {}) {
  const parameters = Object.fromEntries(Object.entries(parametersInput).map(([name, values]) => [name, [...values]]));
  const names = Object.keys(parameters).sort();
  if (names.some(name => parameters[name].length === 0)) throw new Error("Pairwise parameters must be non-empty");
  if (names.length === 0) return Object.freeze([]);

  const candidates = [];
  const enumerate = (index, current) => {
    if (index === names.length) return candidates.push(Object.freeze({ ...current }));
    const name = names[index];
    for (const value of parameters[name]) enumerate(index + 1, { ...current, [name]: value });
  };
  enumerate(0, {});

  const uncovered = pairs(parameters);
  const selected = [];
  while (uncovered.size) {
    let best = null;
    let bestCoverage = -1;
    for (const candidate of candidates) {
      const coverage = [...scenarioPairs(candidate, names)].filter(pair => uncovered.has(pair)).length;
      if (coverage > bestCoverage || (coverage === bestCoverage && (!best || canonical(candidate) < canonical(best)))) {
        best = candidate;
        bestCoverage = coverage;
      }
    }
    if (!best || bestCoverage <= 0) break;
    selected.push(best);
    for (const pair of scenarioPairs(best, names)) uncovered.delete(pair);
    candidates.splice(candidates.indexOf(best), 1);
  }

  return Object.freeze(selected.map((scenario, index) => Object.freeze({ id: `scenario-${index + 1}`, ...scenario })));
}

function defaultOutcome(scenario) {
  if (scenario.failure === "timeout") return { ok: false, standing: "BLOCKED", classification: "VERIFIER_TIMEOUT" };
  if (scenario.failure === "build") return { ok: false, standing: "BUILD_BROKEN", classification: "VERIFIER_FAILED" };
  return { ok: true, standing: "ALIVE", classification: "VERIFIER_ALIVE" };
}

function isBaseline(scenario) {
  return scenario.failure === "none" && scenario.subject === "exact" && scenario.dependencyMode === "closure";
}

export class ChicagoCapabilityValidator {
  constructor(options = {}) {
    this.registry = options.registry;
    this.subject = Object.freeze({ ...(options.subject || {}) });
    this.executeScenario = options.executeScenario || (async (_capability, scenario) => defaultOutcome(scenario));
    this.now = options.now || (() => "2030-01-01T00:00:00.000Z");
    if (!this.registry) throw new Error("ChicagoCapabilityValidator requires a registry");
  }

  scenarios(options = {}) {
    const generated = generatePairwiseScenarios({
      transport: options.transports || ["process", "probe"],
      failure: options.failures || ["none", "timeout", "build"],
      subject: options.subjects || ["exact", "mismatch"],
      dependencyMode: options.dependencyModes || ["closure", "target"],
    });
    const baseline = Object.freeze({ id: "baseline", transport: "process", failure: "none", subject: "exact", dependencyMode: "closure" });
    return Object.freeze([baseline, ...generated.filter(item => !isBaseline(item))]);
  }

  async validateCapability(capabilityId, scenarios = this.scenarios()) {
    const capability = this.registry.require(capabilityId);
    const executions = [];
    for (const scenario of scenarios) {
      const expectedSubject = scenario.subject === "exact" ? this.subject : { ...this.subject, sha: `${this.subject.sha || "subject"}-mismatch` };
      const receipt = await verifyCapability(this.registry, capabilityId, {
        subject: expectedSubject,
        now: this.now,
        execute: async current => {
          if (scenario.dependencyMode === "target" && current.id !== capabilityId) return { ok: true, standing: "ALIVE", classification: "DEPENDENCY_FIXTURE" };
          return this.executeScenario(current, scenario);
        },
      });
      const targetObservation = receipt.observations.find(item => item.capability === capabilityId);
      const expectsFailure = scenario.failure !== "none";
      const stateAssertions = Object.freeze({
        receiptSubjectPreserved: receipt.subject.sha === expectedSubject.sha,
        closureObserved: receipt.admittedDependencies.includes(capabilityId),
        targetObserved: Boolean(targetObservation),
        expectedFailureClassified: expectsFailure ? receipt.standing !== "ALIVE" : receipt.standing === "ALIVE",
        mismatchIsNotAdmittedAsBaseline: scenario.subject !== "mismatch" || receipt.subject.sha !== this.subject.sha,
        noAmbientActuation: receipt.actuates !== true,
      });
      executions.push(Object.freeze({ capability: capability.id, scenario, receipt, baseline: isBaseline(scenario), stateAssertions }));
    }
    return Object.freeze(executions);
  }

  async validateAll(options = {}) {
    const scenarios = this.scenarios(options);
    const executions = [];
    for (const capability of this.registry.list()) executions.push(...await this.validateCapability(capability.id, scenarios));

    const baselineReceipts = executions.filter(item => item.baseline).map(item => item.receipt);
    const ledger = new CapabilityClaimLedger(this.registry.list(), { expectedSubject: this.subject });
    for (const receipt of baselineReceipts) ledger.ingest(receipt);
    const claims = ledger.summary();
    const diagnosis = diagnoseCapabilities({ capabilities: this.registry.list(), receipts: baselineReceipts, expectedSubject: this.subject });
    const repairs = repairPlan(diagnosis, { maximum: options.maximumRepairs || 100 });
    const failedAssertions = executions.flatMap(execution => Object.entries(execution.stateAssertions)
      .filter(([, passed]) => !passed)
      .map(([assertion]) => ({ capability: execution.capability, scenario: execution.scenario.id, assertion })));
    const coveredCapabilities = new Set(executions.map(item => item.capability));
    const body = Object.freeze({
      schema: "https://gitvan.dev/schemas/chicago-capability-validation/v1",
      style: "CHICAGO_STATE_BASED",
      subject: this.subject,
      capabilities: this.registry.list().length,
      coveredCapabilities: coveredCapabilities.size,
      scenariosPerCapability: scenarios.length,
      executions: executions.length,
      pairwiseScenarios: scenarios,
      baselineReceiptHashes: Object.freeze(baselineReceipts.map(item => item.hash)),
      failedAssertions: Object.freeze(failedAssertions),
      claims,
      diagnosis,
      repairs,
      complete: coveredCapabilities.size === this.registry.list().length && executions.length === this.registry.list().length * scenarios.length,
      standing: failedAssertions.length === 0 && diagnosis.healthy ? "ALIVE" : "PARTIAL_ALIVE",
      actuates: false,
    });
    return Object.freeze({ ...body, hash: hash(body) });
  }
}

export async function autonomicChicagoValidation(options = {}) {
  const validator = options.validator || new ChicagoCapabilityValidator(options);
  const maximumPasses = Math.max(1, Number(options.maximumPasses || 3));
  const passes = [];
  let previousHash = null;
  for (let pass = 1; pass <= maximumPasses; pass += 1) {
    const report = await validator.validateAll(options);
    passes.push(Object.freeze({ pass, report }));
    if (report.standing === "ALIVE") break;
    if (report.hash === previousHash) break;
    previousHash = report.hash;
    if (typeof options.repair !== "function") break;
    await options.repair(report.repairs, { pass, report });
  }
  const final = passes.at(-1).report;
  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/chicago-autonomic-validation/v1",
    passes: Object.freeze(passes),
    converged: final.standing === "ALIVE",
    standing: final.standing,
    finalReportHash: final.hash,
    actuates: false,
  });
  return Object.freeze({ ...body, hash: hash(body) });
}
