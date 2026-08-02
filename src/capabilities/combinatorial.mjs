import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function combinations(values, maximumSize) {
  const result = [];
  function visit(start, selected) {
    if (selected.length) result.push([...selected]);
    if (selected.length >= maximumSize) return;
    for (let index = start; index < values.length; index += 1) {
      selected.push(values[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  }
  visit(0, []);
  return result;
}

function dominates(left, right) {
  const noWorse = left.utility >= right.utility
    && left.reversibility >= right.reversibility
    && left.evidence >= right.evidence
    && left.cost <= right.cost
    && left.authorityRisk <= right.authorityRisk;
  const strictlyBetter = left.utility > right.utility
    || left.reversibility > right.reversibility
    || left.evidence > right.evidence
    || left.cost < right.cost
    || left.authorityRisk < right.authorityRisk;
  return noWorse && strictlyBetter;
}

export function normalizeCapabilityOption(input = {}) {
  const option = Object.freeze({
    id: String(input.id || ""),
    title: String(input.title || input.id || "Untitled option"),
    provides: Object.freeze([...(input.provides || [])].map(String).sort()),
    requires: Object.freeze([...(input.requires || [])].map(String).sort()),
    conflicts: Object.freeze([...(input.conflicts || [])].map(String).sort()),
    utility: Math.max(0, Number(input.utility ?? 1)),
    cost: Math.max(0.0001, Number(input.cost ?? 1)),
    reversibility: Math.max(0, Math.min(1, Number(input.reversibility ?? 1))),
    evidence: Math.max(0, Math.min(1, Number(input.evidence ?? 0))),
    authorityRisk: Math.max(0, Math.min(1, Number(input.authorityRisk ?? 0))),
    actuation: input.actuation === true,
  });
  if (!option.id) throw new Error("Capability option requires an id");
  return option;
}

function evaluateCombination(selected, context) {
  const ids = new Set(selected.map(item => item.id));
  const provided = new Set(context.available || []);
  for (const option of selected) for (const capability of option.provides) provided.add(capability);

  const missing = [];
  const conflicts = [];
  for (const option of selected) {
    for (const requirement of option.requires) if (!provided.has(requirement)) missing.push({ option: option.id, requirement });
    for (const conflict of option.conflicts) if (ids.has(conflict) || provided.has(conflict)) conflicts.push({ option: option.id, conflict });
  }

  const cost = selected.reduce((sum, item) => sum + item.cost, 0);
  const authorityRisk = selected.reduce((maximum, item) => Math.max(maximum, item.authorityRisk), 0);
  const reversibility = selected.reduce((minimum, item) => Math.min(minimum, item.reversibility), 1);
  const evidence = selected.reduce((minimum, item) => Math.min(minimum, item.evidence), 1);
  const utility = selected.reduce((sum, item) => sum + item.utility, 0)
    * (1 + Math.max(0, provided.size - (context.available?.length || 0)) * 0.05);
  const actuates = selected.some(item => item.actuation);
  const admitted = missing.length === 0
    && conflicts.length === 0
    && cost <= context.maxCost
    && authorityRisk <= context.maxAuthorityRisk
    && (!actuates || context.allowActuation === true);

  const body = Object.freeze({
    ids: Object.freeze([...ids].sort()),
    provided: Object.freeze([...provided].sort()),
    utility,
    cost,
    reversibility,
    evidence,
    authorityRisk,
    actuates,
    admitted,
    missing: Object.freeze(missing),
    conflicts: Object.freeze(conflicts),
  });
  return Object.freeze({ ...body, hash: digest(body) });
}

export function exploreCapabilitySpace(optionsInput = [], contextInput = {}) {
  const options = optionsInput.map(normalizeCapabilityOption).sort((a, b) => a.id.localeCompare(b.id));
  const context = Object.freeze({
    available: Object.freeze([...(contextInput.available || [])].map(String).sort()),
    maximumCombinationSize: Math.max(1, Math.min(options.length || 1, Number(contextInput.maximumCombinationSize || 4))),
    maxCost: Number.isFinite(Number(contextInput.maxCost)) ? Number(contextInput.maxCost) : Number.POSITIVE_INFINITY,
    maxAuthorityRisk: Number.isFinite(Number(contextInput.maxAuthorityRisk)) ? Number(contextInput.maxAuthorityRisk) : 1,
    allowActuation: contextInput.allowActuation === true,
  });

  const evaluated = combinations(options, context.maximumCombinationSize)
    .map(selected => evaluateCombination(selected, context));
  const admitted = evaluated.filter(candidate => candidate.admitted);
  const frontier = admitted.filter(candidate => !admitted.some(other => other.hash !== candidate.hash && dominates(other, candidate)))
    .sort((a, b) => b.utility - a.utility || b.reversibility - a.reversibility || a.cost - b.cost);

  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/combinatorial-capability-space/v1",
    context,
    options: Object.freeze(options),
    evaluated: evaluated.length,
    admitted: admitted.length,
    refused: evaluated.length - admitted.length,
    frontier: Object.freeze(frontier),
  });
  return Object.freeze({ ...body, hash: digest(body) });
}

export function selectCapabilityCombination(space, options = {}) {
  const objective = options.objective || "balanced";
  const score = candidate => {
    if (objective === "utility") return candidate.utility;
    if (objective === "reversibility") return candidate.reversibility * 1000 + candidate.utility;
    if (objective === "evidence") return candidate.evidence * 1000 + candidate.utility;
    return candidate.utility * candidate.reversibility * Math.max(candidate.evidence, 0.1)
      / Math.max(candidate.cost * (1 + candidate.authorityRisk), 0.0001);
  };
  const ranked = [...space.frontier].sort((a, b) => score(b) - score(a) || a.hash.localeCompare(b.hash));
  const selected = ranked[0] || null;
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/combinatorial-capability-selection/v1",
    spaceHash: space.hash,
    objective,
    selected,
    alternatives: Object.freeze(ranked.slice(1)),
    actuates: false,
  });
}
