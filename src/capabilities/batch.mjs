import { createHash } from "node:crypto";
import { createVerificationPlan } from "./planner.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

async function mapLimit(values, limit, worker) {
  const results = new Array(values.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function normalizeResult(capability, result, startedAt, finishedAt) {
  const standing = result?.standing || (result?.ok === true ? "ALIVE" : "PARTIAL_ALIVE");
  return Object.freeze({
    capability: capability.id,
    verifier: capability.verifier,
    ok: result?.ok === true,
    standing,
    startedAt,
    finishedAt,
    output: result?.output ?? null,
    error: result?.error ?? null,
  });
}

export class CapabilityBatchRunner {
  constructor(options = {}) {
    if (!options.registry) throw new TypeError("CapabilityBatchRunner requires registry");
    if (typeof options.execute !== "function") throw new TypeError("CapabilityBatchRunner requires execute");
    this.registry = options.registry;
    this.execute = options.execute;
    this.concurrency = Math.max(1, Number(options.concurrency || 4));
    this.now = options.now || (() => new Date().toISOString());
    this.subject = Object.freeze({ ...(options.subject || {}) });
  }

  async run(targets = [], options = {}) {
    const plan = createVerificationPlan(this.registry, targets, options);
    const observations = [];
    const failed = new Set();
    let stopped = false;

    for (let stageIndex = 0; stageIndex < plan.stages.length && !stopped; stageIndex += 1) {
      const stage = plan.stages[stageIndex];
      const runnable = stage.filter(id => {
        const capability = this.registry.require(id);
        return capability.dependsOn.every(dependency => !failed.has(dependency));
      });
      const skipped = stage.filter(id => !runnable.includes(id));
      for (const id of skipped) {
        failed.add(id);
        observations.push(Object.freeze({
          capability: id,
          verifier: this.registry.require(id).verifier,
          ok: false,
          standing: "BLOCKED",
          startedAt: null,
          finishedAt: null,
          output: null,
          error: "Dependency did not achieve executable standing",
        }));
      }

      const stageResults = await mapLimit(runnable, this.concurrency, async id => {
        const capability = this.registry.require(id);
        const startedAt = this.now();
        let result;
        try {
          result = await this.execute(capability);
        } catch (error) {
          result = { ok: false, standing: "BUILD_BROKEN", error: error.message };
        }
        const finishedAt = this.now();
        return normalizeResult(capability, result, startedAt, finishedAt);
      });

      for (const observation of stageResults) {
        observations.push(observation);
        if (!observation.ok || ["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(observation.standing)) {
          failed.add(observation.capability);
          if (options.failFast === true) stopped = true;
        }
      }
    }

    const byStanding = {};
    for (const observation of observations) byStanding[observation.standing] = (byStanding[observation.standing] || 0) + 1;
    const complete = observations.length === plan.closure.length;
    const standing = complete && observations.every(item => item.ok && item.standing === "ALIVE")
      ? "ALIVE"
      : observations.some(item => item.standing === "BUILD_BROKEN")
      ? "BUILD_BROKEN"
      : observations.some(item => item.standing === "BLOCKED")
      ? "BLOCKED"
      : "PARTIAL_ALIVE";

    const body = Object.freeze({
      schema: "https://gitvan.dev/schemas/capability-batch-receipt/v1",
      subject: this.subject,
      planHash: plan.hash,
      targets: plan.targets,
      closure: plan.closure,
      stages: plan.stages,
      observations: Object.freeze(observations),
      byStanding: Object.freeze(byStanding),
      standing,
      complete,
    });
    return Object.freeze({ ...body, hash: digest(body) });
  }
}

export function createCapabilityBatchRunner(options = {}) {
  return new CapabilityBatchRunner(options);
}

export function verifyBatchReceipt(receipt) {
  if (!receipt?.hash) return false;
  const { hash, ...body } = receipt;
  return digest(body) === hash;
}
