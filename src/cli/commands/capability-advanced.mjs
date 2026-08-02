import { defineCommand } from "citty";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  capabilityTransportArgs,
  createCliCapabilityService,
  positionalList,
  printCapabilityValue,
} from "./capability-context.mjs";

async function writeOutput(path, content) {
  if (!path) {
    printCapabilityValue(content);
    return null;
  }
  const absolute = resolve(process.cwd(), path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`, "utf8");
  printCapabilityValue({ written: absolute });
  return absolute;
}

async function collectReceipts(service, ids, options = {}) {
  const selected = ids.length ? ids : service.list().map(item => item.id);
  const receipts = [];
  const missing = [];
  for (const id of selected) {
    try {
      receipts.push(await service.receipt(id));
    } catch (error) {
      missing.push({ id, error: error.message });
      if (!options.allowMissing) throw error;
    }
  }
  return { receipts, missing };
}

const batchCommand = defineCommand({
  meta: { name: "batch", description: "Execute a dependency-deduplicated capability batch" },
  args: {
    ids: { type: "positional", description: "Comma-separated target capabilities", required: false },
    concurrency: { type: "string", description: "Maximum concurrent verifiers per stage", default: "4" },
    failFast: { type: "boolean", description: "Stop after the first failed stage", default: false },
    output: { type: "string", description: "Write batch receipt to a file" },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const receipt = await service.batch(positionalList(args.ids), {
      concurrency: Math.max(1, Number(args.concurrency || 4)),
      failFast: args.failFast,
    });
    await writeOutput(args.output, receipt);
    if (receipt.standing !== "ALIVE") process.exitCode = 1;
  },
});

const historyCommand = defineCommand({
  meta: { name: "history", description: "List immutable receipt history for a capability" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    hash: { type: "string", description: "Read one exact receipt hash" },
    json: { type: "boolean", description: "Emit JSON", default: true },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const value = args.hash ? await service.receipt(args.id, args.hash) : await service.receiptHistory(args.id);
    printCapabilityValue(value, true);
  },
});

const cacheVerifyCommand = defineCommand({
  meta: { name: "cache-verify", description: "Reuse an exact-identity ALIVE verifier receipt or execute it" },
  args: {
    id: { type: "positional", description: "Capability identifier", required: true },
    sourceSha: { type: "string", description: "Exact source SHA", default: process.env.GITVAN_SHA || "" },
    validatorSha: { type: "string", description: "Exact validator SHA", default: "" },
    configHash: { type: "string", description: "Configuration identity hash", default: "" },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const result = await service.verifyCached(args.id, {
      source: { repository: process.env.GITVAN_REPOSITORY || "", sha: args.sourceSha },
      validator: { path: service.runtime.registry.require(args.id).verifier, sha: args.validatorSha },
      configuration: { hash: args.configHash, mode: args.mode },
    });
    printCapabilityValue(result, true);
    if (result.receipt.standing !== "ALIVE") process.exitCode = 1;
  },
});

const reportCommand = defineCommand({
  meta: { name: "report", description: "Render latest capability receipts as JSON, Markdown, or JUnit" },
  args: {
    ids: { type: "positional", description: "Comma-separated capabilities; defaults to all", required: false },
    format: { type: "string", description: "json, markdown, or junit", default: "json" },
    title: { type: "string", description: "Report title", default: "GitVan capability verification" },
    output: { type: "string", description: "Write report to a file" },
    allowMissing: { type: "boolean", description: "Skip capabilities without receipts", default: false },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await collectReceipts(service, positionalList(args.ids), { allowMissing: args.allowMissing });
    const content = service.report(receipts, {
      title: args.title,
      generatedAt: new Date().toISOString(),
      format: args.format,
    });
    await writeOutput(args.output, content);
    if (missing.length) process.stderr.write(`${JSON.stringify({ missing }, null, 2)}\n`);
    if (receipts.some(item => item.standing !== "ALIVE")) process.exitCode = 1;
  },
});

const claimsCommand = defineCommand({
  meta: { name: "claims", description: "Compose receipt-backed capability standing claims" },
  args: {
    ids: { type: "positional", description: "Comma-separated capabilities; defaults to all", required: false },
    format: { type: "string", description: "json or toml", default: "json" },
    output: { type: "string", description: "Write claims ledger to a file" },
    allowMissing: { type: "boolean", description: "Keep missing claims UNKNOWN", default: true },
    ...capabilityTransportArgs,
  },
  async run({ args }) {
    const service = createCliCapabilityService(args);
    const { receipts, missing } = await collectReceipts(service, positionalList(args.ids), { allowMissing: args.allowMissing });
    const claims = service.claims(receipts, { format: args.format });
    await writeOutput(args.output, claims);
    if (missing.length) process.stderr.write(`${JSON.stringify({ missing }, null, 2)}\n`);
  },
});

const regressionCommand = defineCommand({
  meta: { name: "regression", description: "Compare two capability claim or report files" },
  args: {
    baseline: { type: "positional", description: "Baseline JSON file", required: true },
    candidate: { type: "positional", description: "Candidate JSON file", required: true },
    format: { type: "string", description: "json or markdown", default: "json" },
    assert: { type: "boolean", description: "Fail on removed or regressed standing", default: true },
    output: { type: "string", description: "Write comparison report to a file" },
  },
  async run({ args }) {
    const baseline = JSON.parse(await readFile(resolve(process.cwd(), args.baseline), "utf8"));
    const candidate = JSON.parse(await readFile(resolve(process.cwd(), args.candidate), "utf8"));
    const service = createCliCapabilityService();
    const result = service.regression(baseline, candidate, {
      assert: false,
      format: args.format === "markdown" ? "markdown" : undefined,
    });
    await writeOutput(args.output, result);
    const raw = service.regression(baseline, candidate);
    if (args.assert && !raw.ok) process.exitCode = 1;
  },
});

export const advancedCapabilityCommands = Object.freeze({
  batch: batchCommand,
  history: historyCommand,
  "cache-verify": cacheVerifyCommand,
  report: reportCommand,
  claims: claimsCommand,
  regression: regressionCommand,
});
