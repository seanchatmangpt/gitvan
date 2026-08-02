import { createHash } from "node:crypto";

const STANDING_SCORE = Object.freeze({ UNKNOWN: 0, UNSUPPORTED: 0, BLOCKED: 0.1, BUILD_BROKEN: 0.1, PARTIAL_ALIVE: 0.55, ALIVE: 1 });

export const VISION_2030_DOMAINS = Object.freeze([
  Object.freeze({ id: "dx", title: "Zero-friction developer experience", outcome: "Intent reaches a verified result without repository archaeology.", weight: 1.2, capabilities: Object.freeze(["gitvan.job.discovery", "gitvan.template", "gitvan.registry"]), objectives: Object.freeze(["one-command orientation", "deterministic next actions", "explainable failures", "replayable local proof"]) }),
  Object.freeze({ id: "qol", title: "Autonomous quality of life", outcome: "Routine maintenance is diagnosed, planned, and safely automated before interruption.", weight: 1, capabilities: Object.freeze(["gitvan.scheduler", "gitvan.workflow.dag", "gitvan.receipt"]), objectives: Object.freeze(["bounded automation", "interrupt minimization", "progressive disclosure", "safe defaults"]) }),
  Object.freeze({ id: "doctor", title: "Evidence-native doctor", outcome: "Failed transitions are localized and reversible repairs are manufactured with falsifiers.", weight: 1.4, capabilities: Object.freeze(["gitvan.receipt", "gitvan.lock", "gitvan.registry"]), objectives: Object.freeze(["root-cause localization", "typed remediation", "negative controls", "repair receipts"]) }),
  Object.freeze({ id: "wizard", title: "Lawful capability wizard", outcome: "Human intent expands into maximal reversible construction plans before authority-bearing selection.", weight: 1.45, capabilities: Object.freeze(["gitvan.workflow.dag", "gitvan.template", "gitvan.registry", "gitvan.receipt"]), objectives: Object.freeze(["intent compilation", "reversible construction", "explicit authority", "receipt-bound actuation"]) }),
  Object.freeze({ id: "telco", title: "Resilient coordination fabric", outcome: "Capability execution survives node, route, and regional failures with replayable quorum evidence.", weight: 1.35, capabilities: Object.freeze(["gitvan.scheduler", "gitvan.lock", "gitvan.receipt", "gitvan.workflow.dag"]), objectives: Object.freeze(["regional quorum", "route scoring", "failure simulation", "partition transparency"]) }),
  Object.freeze({ id: "combinatorial", title: "Combinatorial maximalism", outcome: "The system preserves the lawful Pareto frontier of reversible capability combinations before selection.", weight: 1.6, capabilities: Object.freeze(["gitvan.pack", "gitvan.template", "gitvan.registry", "gitvan.workflow.dag"]), objectives: Object.freeze(["capability-space exploration", "Pareto frontier", "conflict refusal", "bounded selection"]) }),
  Object.freeze({ id: "autonomy", title: "Receipted autonomous operation", outcome: "Agents construct freely while all actuation remains admitted and replayable.", weight: 1.5, capabilities: Object.freeze(["gitvan.workflow.dag", "gitvan.job.execution", "gitvan.receipt"]), objectives: Object.freeze(["zero unreceipted actuation", "policy admission", "subject identity", "bounded concurrency"]) }),
  Object.freeze({ id: "ecosystem", title: "Composable capability economy", outcome: "Packs, templates, jobs, and proofs compose as portable verified products.", weight: 1.1, capabilities: Object.freeze(["gitvan.pack", "gitvan.template", "gitvan.registry"]), objectives: Object.freeze(["portable packs", "semantic discovery", "verified compatibility", "marketplace-ready metadata"]) }),
  Object.freeze({ id: "intelligence", title: "Continuous capability intelligence", outcome: "Standing, leverage, regressions, and opportunity cost are live operational data.", weight: 1.3, capabilities: Object.freeze(["gitvan.receipt", "gitvan.registry", "gitvan.workflow.dag"]), objectives: Object.freeze(["standing telemetry", "regression prediction", "leverage ranking", "portfolio simulation"]) }),
]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function scoreCapability(capability, claims) {
  const claim = claims.get(capability.id);
  const standing = claim?.standing || capability.state || "UNKNOWN";
  return Object.freeze({ id: capability.id, standing, score: STANDING_SCORE[standing] ?? 0, receiptHash: claim?.receiptHash || null });
}

export function evaluateVision2030(capabilities, claimsInput = null, options = {}) {
  const capabilityMap = new Map(capabilities.map(item => [item.id, item]));
  const claims = new Map((claimsInput?.claims || claimsInput || []).map(item => [item.capability || item.id, item]));
  const domainEvidence = options.domainEvidence || {};
  const domains = VISION_2030_DOMAINS.map(domain => {
    const evidence = domain.capabilities.map(id => scoreCapability(capabilityMap.get(id) || { id, state: "UNKNOWN" }, claims));
    const runtimeScore = evidence.reduce((sum, item) => sum + item.score, 0) / evidence.length;
    const supplemental = domainEvidence[domain.id];
    const supplementalScore = supplemental?.standing ? (STANDING_SCORE[supplemental.standing] ?? 0) : null;
    const score = supplementalScore === null ? runtimeScore : Math.min(runtimeScore, supplementalScore);
    const gaps = evidence.filter(item => item.standing !== "ALIVE").map(item => item.id);
    if (supplementalScore !== null && supplementalScore < 1) gaps.push(`domain:${domain.id}`);
    return Object.freeze({ ...domain, score, percent: Math.round(score * 100), gaps: Object.freeze(gaps), evidence: Object.freeze(evidence), supplementalEvidence: supplemental || null });
  });
  const totalWeight = domains.reduce((sum, domain) => sum + domain.weight, 0);
  const score = domains.reduce((sum, domain) => sum + domain.score * domain.weight, 0) / totalWeight;
  const horizon = score >= 0.95 && domains.every(domain => domain.score === 1) ? "VISION_2030" : score >= 0.8 ? "PLATFORM" : score >= 0.6 ? "SYSTEM" : score >= 0.35 ? "SUBSYSTEM" : "FOUNDATION";
  const body = Object.freeze({ schema: "https://gitvan.dev/schemas/vision-2030-assessment/v2", subject: Object.freeze({ ...(options.subject || {}) }), score, percent: Math.round(score * 100), horizon, domains: Object.freeze(domains), achieved: horizon === "VISION_2030" });
  return Object.freeze({ ...body, hash: createHash("sha256").update(canonical(body)).digest("hex") });
}

export function vision2030Roadmap(assessment) {
  const work = assessment.domains.filter(domain => domain.gaps.length)
    .sort((a, b) => (b.weight * (1 - b.score)) - (a.weight * (1 - a.score)))
    .map((domain, index) => Object.freeze({ priority: index + 1, domain: domain.id, title: domain.title, currentPercent: domain.percent, targetPercent: 100, capabilities: domain.gaps, objectives: domain.objectives, acceptance: Object.freeze(domain.gaps.map(id => id.startsWith("domain:") ? `${id} has domain-specific ALIVE evidence` : `${id} has an exact-subject replay-verified ALIVE receipt`)) }));
  return Object.freeze({ schema: "https://gitvan.dev/schemas/vision-2030-roadmap/v2", assessmentHash: assessment.hash, remainingDomains: work.length, work: Object.freeze(work) });
}
