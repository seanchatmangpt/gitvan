import { defineCommand } from "citty";
import {
  composeWizardPlan,
  defaultVision2030Candidates,
  diagnoseCapabilities,
  evaluateVision2030,
  exploreCapabilitySpace,
  planTelcoMesh,
  rankLeveragePortfolio,
  repairPlan,
  selectCapabilityCombination,
  simulateTelcoFailure,
  vision2030Roadmap,
} from "../../capabilities/index.mjs";
import { capabilityTransportArgs, createCliCapabilityService, printCapabilityValue } from "./capability-context.mjs";

async function latestReceipts(service) {
  const receipts = [];
  const missing = [];
  for (const capability of service.list()) {
    try { receipts.push(await service.receipt(capability.id)); }
    catch (error) { missing.push({ capability: capability.id, error: error.message }); }
  }
  return { receipts, missing };
}

const assessCommand = defineCommand({
  meta: { name: "assess", description: "Assess receipt-backed progress toward GitVan Vision 2030" },
  args: { ...capabilityTransportArgs },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await latestReceipts(service);
    const assessment = evaluateVision2030(service.list(), service.claims(receipts), { subject: service.runtime.subject });
    printCapabilityValue({ assessment, missing }, true);
    if (!assessment.achieved) process.exitCode = 2;
  },
});

const roadmapCommand = defineCommand({
  meta: { name: "roadmap", description: "Rank remaining Vision 2030 capability gaps" },
  args: { ...capabilityTransportArgs },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await latestReceipts(service);
    const assessment = evaluateVision2030(service.list(), service.claims(receipts), { subject: service.runtime.subject });
    printCapabilityValue({ assessment, roadmap: vision2030Roadmap(assessment), missing }, true);
  },
});

const doctorCommand = defineCommand({
  meta: { name: "doctor", description: "Diagnose failed transitions and construct reversible repair intents" },
  args: { maximum: { type: "string", description: "Maximum repair actions", default: "20" }, ...capabilityTransportArgs },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await latestReceipts(service);
    const report = diagnoseCapabilities({ capabilities: service.list(), receipts, expectedSubject: service.expectedSubject || service.runtime.subject });
    printCapabilityValue({ report, plan: repairPlan(report, { maximum: Number(args.maximum || 20) }), missing }, true);
    if (!report.healthy) process.exitCode = 2;
  },
});

const leverageCommand = defineCommand({
  meta: { name: "leverage", description: "Rank blue-ocean candidates by multiplicative 1000x leverage" },
  args: { budget: { type: "string", description: "Bounded implementation budget", default: "36" } },
  run({ args }) { printCapabilityValue(rankLeveragePortfolio(defaultVision2030Candidates(), { budget: Number(args.budget || 36) }), true); },
});

const frontierCommand = defineCommand({
  meta: { name: "frontier", description: "Explore the reversible Pareto frontier of Vision 2030 investments" },
  args: { budget: { type: "string", default: "12" }, size: { type: "string", default: "4" } },
  run({ args }) {
    const options = defaultVision2030Candidates().map(item => ({ id: item.id, title: item.title, provides: item.domains, utility: item.frequency * item.reuse * item.autonomy, cost: item.cost, reversibility: item.reversibility, evidence: item.evidence, authorityRisk: item.authorityRisk }));
    const space = exploreCapabilitySpace(options, { maxCost: Number(args.budget || 12), maximumCombinationSize: Number(args.size || 4), allowActuation: false });
    printCapabilityValue({ space, selection: selectCapabilityCombination(space) }, true);
  },
});

const wizardCommand = defineCommand({
  meta: { name: "wizard", description: "Compile an intent into a maximal reversible construction plan" },
  args: { goal: { type: "positional", required: true }, budget: { type: "string", default: "12" } },
  run({ args }) {
    const candidates = defaultVision2030Candidates().map(item => ({ id: item.id, title: item.title, provides: item.domains, utility: item.frequency * item.reuse, cost: item.cost, reversibility: item.reversibility, evidence: item.evidence, authorityRisk: item.authorityRisk }));
    printCapabilityValue(composeWizardPlan({ goal: args.goal, desiredCapabilities: ["dx", "doctor", "wizard", "telco"], constraints: { maxCost: Number(args.budget || 12), maxAuthorityRisk: 0.5 } }, candidates), true);
  },
});

const telcoCommand = defineCommand({
  meta: { name: "telco", description: "Plan and failure-test a resilient capability coordination mesh" },
  args: { fail: { type: "string", description: "Comma-separated node failures", default: "" } },
  run({ args }) {
    const nodes = [
      { id: "local", region: "local", capabilities: ["receipt", "route"], standing: "ALIVE" },
      { id: "edge-west", region: "west", capabilities: ["receipt", "route"], standing: "ALIVE" },
      { id: "edge-east", region: "east", capabilities: ["receipt", "route"], standing: "ALIVE" },
    ];
    const links = [
      { from: "local", to: "edge-west", latencyMs: 20, reliability: 0.999 },
      { from: "local", to: "edge-east", latencyMs: 25, reliability: 0.999 },
      { from: "edge-west", to: "edge-east", latencyMs: 45, reliability: 0.998 },
    ];
    const plan = planTelcoMesh(nodes, links, { requiredCapabilities: ["receipt", "route"], quorum: 2 });
    const failed = String(args.fail || "").split(",").map(item => item.trim()).filter(Boolean);
    printCapabilityValue({ plan, simulation: simulateTelcoFailure(plan, failed) }, true);
  },
});

export const visionCapabilityCommands = Object.freeze({ assess: assessCommand, roadmap: roadmapCommand, doctor: doctorCommand, leverage: leverageCommand, frontier: frontierCommand, wizard: wizardCommand, telco: telcoCommand });

export const vision2030Command = defineCommand({
  meta: { name: "vision-2030", description: "Drive receipt-backed combinatorial-maximalist 2030 capabilities", usage: "gitvan vision-2030 <assess|roadmap|doctor|leverage|frontier|wizard|telco>" },
  subCommands: visionCapabilityCommands,
});

export default vision2030Command;
