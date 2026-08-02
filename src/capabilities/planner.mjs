import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function selectCapabilities(registry, selector = {}) {
  return registry.list().filter(capability => {
    if (selector.ids?.length && !selector.ids.includes(capability.id)) return false;
    if (selector.prefix && !capability.id.startsWith(selector.prefix)) return false;
    if (selector.states?.length && !selector.states.includes(capability.state)) return false;
    if (selector.hasVerifier === true && !capability.verifier) return false;
    return true;
  });
}

export function createVerificationPlan(registry, targetIds = [], options = {}) {
  const targets = targetIds.length
    ? [...new Set(targetIds.map(String))].sort()
    : selectCapabilities(registry, options.selector || {}).map(item => item.id);
  for (const target of targets) registry.require(target);

  const closure = new Set();
  for (const target of targets) {
    for (const capability of registry.dependencyOrder(target)) closure.add(capability.id);
  }

  const capabilities = [...closure].sort().map(id => registry.require(id));
  const emitted = new Set();
  const stages = [];
  while (emitted.size < capabilities.length) {
    const stage = capabilities
      .filter(capability => !emitted.has(capability.id))
      .filter(capability => capability.dependsOn.every(dependency => emitted.has(dependency)))
      .map(capability => capability.id)
      .sort();
    if (!stage.length) throw new Error("Capability verification plan contains a cycle");
    stages.push(Object.freeze(stage));
    for (const id of stage) emitted.add(id);
  }

  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-verification-plan/v1",
    targets: Object.freeze(targets),
    closure: Object.freeze(capabilities.map(item => item.id)),
    stages: Object.freeze(stages),
    verifierCount: capabilities.filter(item => item.verifier).length,
    options: Object.freeze({ selector: Object.freeze({ ...(options.selector || {}) }) }),
  });
  return Object.freeze({ ...body, hash: hash(body) });
}

export function verifyPlanHash(plan) {
  const { hash: expected, ...body } = plan || {};
  return typeof expected === "string" && hash(body) === expected;
}

export function planToMermaid(plan) {
  const lines = ["flowchart LR"];
  plan.stages.forEach((stage, stageIndex) => {
    lines.push(`  subgraph stage_${stageIndex}[Stage ${stageIndex + 1}]`);
    for (const capability of stage) {
      const id = `n_${Buffer.from(capability).toString("hex")}`;
      lines.push(`    ${id}[${JSON.stringify(capability)}]`);
    }
    lines.push("  end");
    if (stageIndex > 0) lines.push(`  stage_${stageIndex - 1} --> stage_${stageIndex}`);
  });
  return `${lines.join("\n")}\n`;
}
