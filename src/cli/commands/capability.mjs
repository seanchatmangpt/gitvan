import { defineCommand } from "citty";
import { listCapabilityProbes } from "../../capabilities/index.mjs";
import {
  capabilityTransportArgs,
  createCliCapabilityService,
  positionalList,
  printCapabilityValue,
} from "./capability-context.mjs";
import { advancedCapabilityCommands } from "./capability-advanced.mjs";

const listCommand = defineCommand({
  meta: { name: "list", description: "List admitted GitVan capabilities" },
  args: {
    json: { type: "boolean", description: "Emit JSON", default: false },
    state: { type: "string", description: "Filter by standing" },
  },
  run({ args }) {
    let capabilities = createCliCapabilityService().list();
    if (args.state) capabilities = capabilities.filter(item => item.state === args.state);
    if (args.json) return printCapabilityValue(capabilities, true);
    const rows = capabilities.map(item => `${item.id.padEnd(28)} ${item.state.padEnd(14)} ${item.title}`);
    printCapabilityValue(["CAPABILITY                   STANDING       TITLE", ...rows].join("\n"));
  },
});

const probesCommand = defineCommand({
  meta: { name: "probes", description: "List bounded runtime capability probes" },
  args: { json: { type: "boolean", description: "Emit JSON", default: false } },
  run({ args }) {
    const probes = listCapabilityProbes();
    printCapabilityValue(args.json ? probes : probes.join("\n"), args.json);
  },
});

const showCommand = defineCommand({
  meta: { name: "show", description: "Inspect a capability and its dependency closure" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    json: { type: "boolean", description: "Emit JSON", default: false },
    ...capabilityTransportArgs,
  },
  run({ args }) {
    const result = createCliCapabilityService(args).inspect(args.id);
    if (args.json) return printCapabilityValue(result, true);
    printCapabilityValue([
      `${result.capability.id}: ${result.capability.title}`,
      `standing: ${result.capability.state}`,
      `transport: ${result.transport}`,
      `verifier: ${result.capability.verifier || "none"}`,
      `dependency order: ${result.dependencyOrder.join(" -> ")}`,
      `inspection policy: ${result.policy.allowed ? "ADMITTED" : "REFUSED"}`,
    ].join("\n"));
  },
});

const planCommand = defineCommand({
  meta: { name: "plan", description: "Create a deterministic verification plan" },
  args: {
    ids: { type: "positional", description: "Comma-separated capability identifiers", required: false },
    prefix: { type: "string", description: "Select capabilities by identifier prefix" },
    state: { type: "string", description: "Select capabilities by standing" },
    format: { type: "string", description: "json or mermaid", default: "json" },
    ...capabilityTransportArgs,
  },
  run({ args }) {
    const selector = {
      ...(args.prefix ? { prefix: args.prefix } : {}),
      ...(args.state ? { states: [args.state] } : {}),
    };
    const result = createCliCapabilityService(args).plan(positionalList(args.ids), { selector, format: args.format });
    printCapabilityValue(result, args.format === "json");
  },
});

const verifyCommand = defineCommand({
  meta: { name: "verify", description: "Execute a capability verifier and persist its receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    json: { type: "boolean", description: "Emit JSON", default: false },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const receipt = await createCliCapabilityService(args).verify(args.id);
    printCapabilityValue(receipt, true);
    if (receipt.standing !== "ALIVE") process.exitCode = 1;
  },
});

const probeCommand = defineCommand({
  meta: { name: "probe", description: "Execute a bounded in-process capability probe" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    mode: { type: "string", description: "surface or behavior", default: "behavior" },
  },
  async run({ args }) {
    const receipt = await createCliCapabilityService({ ...args, transport: "probe" }).verify(args.id);
    printCapabilityValue(receipt, true);
    if (receipt.standing !== "ALIVE") process.exitCode = 1;
  },
});

const verifyAllCommand = defineCommand({
  meta: { name: "verify-all", description: "Execute every admitted capability verifier" },
  args: {
    continue: { type: "boolean", description: "Continue after a failed verifier", default: false },
    cache: { type: "boolean", description: "Reuse exact-identity ALIVE receipts", default: false },
    json: { type: "boolean", description: "Emit JSON", default: false },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const receipts = await createCliCapabilityService(args).verifyAll({ failFast: !args.continue, cache: args.cache });
    if (args.json) printCapabilityValue(receipts, true);
    else printCapabilityValue(receipts.map(item => `${item.capability}: ${item.standing} ${item.hash}`).join("\n"));
    if (receipts.some(item => item.standing !== "ALIVE")) process.exitCode = 1;
  },
});

const receiptCommand = defineCommand({
  meta: { name: "receipt", description: "Read and replay-verify the latest capability receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    hash: { type: "string", description: "Exact immutable receipt hash" },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    printCapabilityValue(await createCliCapabilityService(args).receipt(args.id, args.hash || null), true);
  },
});

const admitCommand = defineCommand({
  meta: { name: "admit", description: "Admit actuation from an ALIVE replay-verified receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    hash: { type: "string", description: "Exact immutable receipt hash" },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    printCapabilityValue(await createCliCapabilityService(args).admitActuation(args.id, args.hash || null), true);
  },
});

const graphCommand = defineCommand({
  meta: { name: "graph", description: "Project the capability graph" },
  args: { format: { type: "string", description: "json, mermaid, or dot", default: "json" } },
  run({ args }) {
    if (!["json", "mermaid", "dot"].includes(args.format)) throw new Error(`Unsupported graph format: ${args.format}`);
    printCapabilityValue(createCliCapabilityService().graph(args.format));
  },
});

const statusCommand = defineCommand({
  meta: { name: "status", description: "Summarize capability standing and evidence" },
  args: { ...capabilityTransportArgs },
  run({ args }) {
    printCapabilityValue(createCliCapabilityService(args).status(), true);
  },
});

export const capabilityCommand = defineCommand({
  meta: {
    name: "capability",
    description: "Inspect, plan, probe, verify, batch, receipt, report, compare, and admit GitVan capabilities",
    usage: "gitvan capability <subcommand>",
  },
  subCommands: {
    list: listCommand,
    probes: probesCommand,
    show: showCommand,
    plan: planCommand,
    probe: probeCommand,
    verify: verifyCommand,
    "verify-all": verifyAllCommand,
    receipt: receiptCommand,
    admit: admitCommand,
    graph: graphCommand,
    status: statusCommand,
    ...advancedCapabilityCommands,
  },
});

export default capabilityCommand;
