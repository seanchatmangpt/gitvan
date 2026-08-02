import { defineCommand } from "citty";
import { createCapabilityService, listCapabilityProbes } from "../../capabilities/index.mjs";

function normalizeTransport(args = {}) {
  const transport = args.transport || "process";
  if (!["process", "probe"].includes(transport)) throw new Error(`Unsupported verification transport: ${transport}`);
  const mode = args.mode || "behavior";
  if (!["surface", "behavior"].includes(mode)) throw new Error(`Unsupported probe mode: ${mode}`);
  return { transport, mode };
}

function service(args = {}) {
  const { transport, mode } = normalizeTransport(args);
  return createCapabilityService({
    runtimeOptions: {
      transport,
      subject: {
        cwd: process.cwd(),
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ...(process.env.GITVAN_REPOSITORY ? { repository: process.env.GITVAN_REPOSITORY } : {}),
        ...(process.env.GITVAN_SHA ? { sha: process.env.GITVAN_SHA } : {}),
      },
      process: { cwd: process.cwd() },
      probe: { cwd: process.cwd(), mode },
      receiptStore: { cwd: process.cwd() },
    },
    expectedSubject: process.env.GITVAN_SHA ? { sha: process.env.GITVAN_SHA } : null,
  });
}

function print(value, json = false) {
  if (typeof value === "string" && !json) process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
  else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const transportArgs = {
  transport: { type: "string", description: "Verification transport: process or probe", default: "process" },
  mode: { type: "string", description: "Probe mode: surface or behavior", default: "behavior" },
};

const listCommand = defineCommand({
  meta: { name: "list", description: "List admitted GitVan capabilities" },
  args: {
    json: { type: "boolean", description: "Emit JSON", default: false },
    state: { type: "string", description: "Filter by standing" },
  },
  run({ args }) {
    let capabilities = service().list();
    if (args.state) capabilities = capabilities.filter(item => item.state === args.state);
    if (args.json) return print(capabilities, true);
    const rows = capabilities.map(item => `${item.id.padEnd(28)} ${item.state.padEnd(14)} ${item.title}`);
    print(["CAPABILITY                   STANDING       TITLE", ...rows].join("\n"));
  },
});

const probesCommand = defineCommand({
  meta: { name: "probes", description: "List bounded runtime capability probes" },
  args: { json: { type: "boolean", description: "Emit JSON", default: false } },
  run({ args }) {
    const probes = listCapabilityProbes();
    print(args.json ? probes : probes.join("\n"), args.json);
  },
});

const showCommand = defineCommand({
  meta: { name: "show", description: "Inspect a capability and its dependency closure" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    json: { type: "boolean", description: "Emit JSON", default: false },
    ...transportArgs,
  },
  run({ args }) {
    const result = service(args).inspect(args.id);
    if (args.json) return print(result, true);
    print([
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
    ids: { type: "positional", description: "Capability identifiers", required: false },
    prefix: { type: "string", description: "Select capabilities by identifier prefix" },
    state: { type: "string", description: "Select capabilities by standing" },
    format: { type: "string", description: "json or mermaid", default: "json" },
    ...transportArgs,
  },
  run({ args }) {
    const ids = Array.isArray(args.ids) ? args.ids : args.ids ? String(args.ids).split(",").filter(Boolean) : [];
    const selector = {
      ...(args.prefix ? { prefix: args.prefix } : {}),
      ...(args.state ? { states: [args.state] } : {}),
    };
    const result = service(args).plan(ids, { selector, format: args.format });
    print(result, args.format === "json");
  },
});

const verifyCommand = defineCommand({
  meta: { name: "verify", description: "Execute a capability verifier and persist its receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    json: { type: "boolean", description: "Emit JSON", default: false },
    ...transportArgs,
  },
  async run({ args }) {
    const receipt = await service(args).verify(args.id);
    print(receipt, true);
    if (receipt.standing !== "ALIVE") process.exitCode = 1;
  },
});

const probeCommand = defineCommand({
  meta: { name: "probe", description: "Execute a bounded in-process capability probe" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    mode: { type: "string", description: "surface or behavior", default: "behavior" },
    json: { type: "boolean", description: "Emit JSON", default: true },
  },
  async run({ args }) {
    const receipt = await service({ ...args, transport: "probe" }).verify(args.id);
    print(receipt, true);
    if (receipt.standing !== "ALIVE") process.exitCode = 1;
  },
});

const verifyAllCommand = defineCommand({
  meta: { name: "verify-all", description: "Execute every admitted capability verifier" },
  args: {
    continue: { type: "boolean", description: "Continue after a failed verifier", default: false },
    json: { type: "boolean", description: "Emit JSON", default: false },
    ...transportArgs,
  },
  async run({ args }) {
    const receipts = await service(args).verifyAll({ failFast: !args.continue });
    if (args.json) print(receipts, true);
    else print(receipts.map(item => `${item.capability}: ${item.standing} ${item.hash}`).join("\n"));
    if (receipts.some(item => item.standing !== "ALIVE")) process.exitCode = 1;
  },
});

const receiptCommand = defineCommand({
  meta: { name: "receipt", description: "Read and replay-verify the latest capability receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    ...transportArgs,
  },
  async run({ args }) {
    print(await service(args).receipt(args.id), true);
  },
});

const admitCommand = defineCommand({
  meta: { name: "admit", description: "Admit actuation from an ALIVE replay-verified receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    ...transportArgs,
  },
  async run({ args }) {
    print(await service(args).admitActuation(args.id), true);
  },
});

const graphCommand = defineCommand({
  meta: { name: "graph", description: "Project the capability graph" },
  args: {
    format: { type: "string", description: "json, mermaid, or dot", default: "json" },
  },
  run({ args }) {
    if (!["json", "mermaid", "dot"].includes(args.format)) throw new Error(`Unsupported graph format: ${args.format}`);
    print(service().graph(args.format));
  },
});

const statusCommand = defineCommand({
  meta: { name: "status", description: "Summarize capability standing and evidence" },
  args: { ...transportArgs },
  run({ args }) {
    print(service(args).status(), true);
  },
});

export const capabilityCommand = defineCommand({
  meta: {
    name: "capability",
    description: "Inspect, plan, probe, verify, receipt, replay, and admit GitVan capabilities",
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
  },
});

export default capabilityCommand;
