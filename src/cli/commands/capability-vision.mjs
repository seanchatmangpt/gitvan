import { defineCommand } from "citty";
import {
  defaultVision2030Candidates,
  diagnoseCapabilities,
  evaluateVision2030,
  rankLeveragePortfolio,
  repairPlan,
  vision2030Roadmap,
} from "../../capabilities/index.mjs";
import {
  capabilityTransportArgs,
  createCliCapabilityService,
  printCapabilityValue,
} from "./capability-context.mjs";

async function latestReceipts(service) {
  const receipts = [];
  const missing = [];
  for (const capability of service.list()) {
    try {
      receipts.push(await service.receipt(capability.id));
    } catch (error) {
      missing.push({ capability: capability.id, error: error.message });
    }
  }
  return { receipts, missing };
}

const visionCommand = defineCommand({
  meta: { name: "vision", description: "Assess receipt-backed progress toward GitVan Vision 2030" },
  args: { ...capabilityTransportArgs },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await latestReceipts(service);
    const claims = service.claims(receipts);
    const assessment = evaluateVision2030(service.list(), claims, { subject: service.runtime.subject });
    printCapabilityValue({ assessment, missing }, true);
    if (!assessment.achieved) process.exitCode = 2;
  },
});

const roadmapCommand = defineCommand({
  meta: { name: "roadmap-2030", description: "Rank remaining Vision 2030 capability gaps" },
  args: { ...capabilityTransportArgs },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await latestReceipts(service);
    const assessment = evaluateVision2030(service.list(), service.claims(receipts), { subject: service.runtime.subject });
    printCapabilityValue({ assessment, roadmap: vision2030Roadmap(assessment), missing }, true);
  },
});

const doctorCommand = defineCommand({
  meta: { name: "doctor", description: "Diagnose failed capability transitions and construct reversible repair intents" },
  args: {
    maximum: { type: "string", description: "Maximum repair actions", default: "20" },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await latestReceipts(service);
    const report = diagnoseCapabilities({
      capabilities: service.list(),
      receipts,
      expectedSubject: service.expectedSubject || service.runtime.subject,
    });
    const plan = repairPlan(report, { maximum: Number(args.maximum || 20) });
    printCapabilityValue({ report, plan, missing }, true);
    if (!report.healthy) process.exitCode = 2;
  },
});

const leverageCommand = defineCommand({
  meta: { name: "leverage", description: "Rank blue-ocean candidates by multiplicative 1000x leverage" },
  args: {
    budget: { type: "string", description: "Bounded implementation budget", default: "36" },
  },
  run({ args }) {
    printCapabilityValue(rankLeveragePortfolio(defaultVision2030Candidates(), { budget: Number(args.budget || 36) }), true);
  },
});

export const visionCapabilityCommands = Object.freeze({
  vision: visionCommand,
  "roadmap-2030": roadmapCommand,
  doctor: doctorCommand,
  leverage: leverageCommand,
});
