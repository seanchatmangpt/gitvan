import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function planTelcoMesh(nodesInput = [], linksInput = [], options = {}) {
  const nodes = nodesInput.map(node => Object.freeze({
    id: String(node.id),
    region: String(node.region || "local"),
    capabilities: Object.freeze([...(node.capabilities || [])].map(String).sort()),
    standing: String(node.standing || "UNKNOWN"),
    capacity: Math.max(0, Number(node.capacity ?? 1)),
  })).sort((a, b) => a.id.localeCompare(b.id));
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const links = linksInput.map(link => Object.freeze({
    from: String(link.from),
    to: String(link.to),
    latencyMs: Math.max(0, Number(link.latencyMs ?? 0)),
    reliability: Math.max(0, Math.min(1, Number(link.reliability ?? 1))),
    cost: Math.max(0, Number(link.cost ?? 0)),
  })).filter(link => nodeMap.has(link.from) && nodeMap.has(link.to));
  const required = [...(options.requiredCapabilities || [])].map(String).sort();
  const eligible = nodes.filter(node => node.standing === "ALIVE" && required.every(capability => node.capabilities.includes(capability)));
  const routes = links
    .filter(link => eligible.some(node => node.id === link.from) && eligible.some(node => node.id === link.to))
    .map(link => Object.freeze({ ...link, score: link.reliability / Math.max(1, link.latencyMs + link.cost) }))
    .sort((a, b) => b.score - a.score || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  const regions = new Set(eligible.map(node => node.region));
  const quorum = Math.max(1, Number(options.quorum || Math.floor(eligible.length / 2) + 1));
  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/telco-mesh-plan/v1",
    requiredCapabilities: Object.freeze(required),
    eligibleNodes: Object.freeze(eligible),
    routes: Object.freeze(routes),
    quorum,
    resilient: eligible.length >= quorum && regions.size >= Math.min(2, quorum),
    failureDomains: Object.freeze([...regions].sort()),
    actuates: false,
  });
  return Object.freeze({ ...body, hash: digest(body) });
}

export function simulateTelcoFailure(plan, failedNodeIds = []) {
  const failed = new Set(failedNodeIds.map(String));
  const surviving = plan.eligibleNodes.filter(node => !failed.has(node.id));
  const survivingRegions = new Set(surviving.map(node => node.region));
  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/telco-failure-simulation/v1",
    planHash: plan.hash,
    failed: Object.freeze([...failed].sort()),
    surviving: Object.freeze(surviving.map(node => node.id)),
    quorumPreserved: surviving.length >= plan.quorum,
    regionDiversityPreserved: survivingRegions.size >= Math.min(2, plan.quorum),
    standing: surviving.length >= plan.quorum && survivingRegions.size >= Math.min(2, plan.quorum) ? "ALIVE" : "BLOCKED",
  });
  return Object.freeze({ ...body, hash: digest(body) });
}
