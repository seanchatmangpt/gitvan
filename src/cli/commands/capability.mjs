import { defineCommand } from "citty";
import { createCapabilityService } from "../../capabilities/index.mjs";

function service() {
  return createCapabilityService({
    runtimeOptions: {
      subject: { cwd: process.cwd(), node: process.version, platform: process.platform, arch: process.arch },
      process: { cwd: process.cwd() },
      receiptStore: { cwd: process.cwd() },
    },
  });
}

function print(value, json = false) {
  if (typeof value === "string" && !json) process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
  else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

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

const showCommand = defineCommand({
  meta: { name: "show", description: "Inspect a capability and its dependency closure" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    json: { type: "boolean", description: "Emit JSON", default: false },
  },
  run({ args }) {
    const result = service().inspect(args.id);
    if (args.json) return print(result, true);
    print([
      `${result.capability.id}: ${result.capability.title}`,
      `standing: ${result.capability.state}`,
      `verifier: ${result.capability.verifier || "none"}`,
      `dependency order: ${result.dependencyOrder.join(" -> ")}`,
      `inspection policy: ${result.policy.allowed ? "ADMITTED" : "REFUSED"}`,
    ].join("\n"));
  },
});

const verifyCommand = defineCommand({
  meta: { name: "verify", description: "Execute a capability verifier and persist its receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    json: { type: "boolean", description: "Emit JSON", default: false },
  },
  async run({ args }) {
    const receipt = await service().verify(args.id);
    print(receipt, true);
    if (receipt.body.standing !== "ALIVE") process.exitCode = 1;
  },
});

const verifyAllCommand = defineCommand({
  meta: { name: "verify-all", description: "Execute every admitted capability verifier" },
  args: {
    continue: { type: "boolean", description: "Continue after a failed verifier", default: false },
    json: { type: "boolean", description: "Emit JSON", default: false },
  },
  async run({ args }) {
    const receipts = await service().verifyAll({ failFast: !args.continue });
    if (args.json) print(receipts, true);
    else print(receipts.map(item => `${item.body.capability}: ${item.body.standing} ${item.hash}`).join("\n"));
    if (receipts.some(item => item.body.standing !== "ALIVE")) process.exitCode = 1;
  },
});

const receiptCommand = defineCommand({
  meta: { name: "receipt", description: "Read and replay-verify the latest capability receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
  },
  async run({ args }) {
    print(await service().receipt(args.id), true);
  },
});

const admitCommand = defineCommand({
  meta: { name: "admit", description: "Admit actuation from an ALIVE replay-verified receipt" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
  },
  async run({ args }) {
    print(await service().admitActuation(args.id), true);
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
  run() {
    print(service().status(), true);
  },
});

export const capabilityCommand = defineCommand({
  meta: {
    name: "capability",
    description: "Inspect, verify, receipt, replay, and admit GitVan capabilities",
    usage: "gitvan capability <subcommand>",
  },
  subCommands: {
    list: listCommand,
    show: showCommand,
    verify: verifyCommand,
    "verify-all": verifyAllCommand,
    receipt: receiptCommand,
    admit: admitCommand,
    graph: graphCommand,
    status: statusCommand,
  },
});

export default capabilityCommand;
