import { createCapabilityService } from "../../capabilities/index.mjs";

export const capabilityTransportArgs = Object.freeze({
  transport: { type: "string", description: "Verification transport: process or probe", default: "process" },
  mode: { type: "string", description: "Probe mode: surface or behavior", default: "behavior" },
});

export function normalizeCapabilityTransport(args = {}) {
  const transport = args.transport || "process";
  if (!["process", "probe"].includes(transport)) throw new Error(`Unsupported verification transport: ${transport}`);
  const mode = args.mode || "behavior";
  if (!["surface", "behavior"].includes(mode)) throw new Error(`Unsupported probe mode: ${mode}`);
  return { transport, mode };
}

export function createCliCapabilityService(args = {}) {
  const { transport, mode } = normalizeCapabilityTransport(args);
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
    cacheOptions: { cwd: process.cwd() },
    expectedSubject: process.env.GITVAN_SHA ? { sha: process.env.GITVAN_SHA } : null,
  });
}

export function printCapabilityValue(value, json = false) {
  if (typeof value === "string" && !json) process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
  else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function positionalList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return String(value).split(",").map(item => item.trim()).filter(Boolean);
}
