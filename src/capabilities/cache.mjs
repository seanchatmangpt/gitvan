import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { verifyReceipt } from "./verifier.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function verifierCacheIdentity(input = {}) {
  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/verifier-cache-identity/v1",
    capability: String(input.capability || ""),
    verifier: String(input.verifier || ""),
    source: Object.freeze({ ...(input.source || {}) }),
    validator: Object.freeze({ ...(input.validator || {}) }),
    toolchain: Object.freeze({ ...(input.toolchain || {}) }),
    environment: Object.freeze({ ...(input.environment || {}) }),
    configuration: Object.freeze({ ...(input.configuration || {}) }),
    transport: String(input.transport || "process"),
  });
  return Object.freeze({ ...body, hash: digest(body) });
}

export function normalizeVerifierCacheIdentity(input = {}) {
  const recomputed = verifierCacheIdentity(input);
  if (input.hash && input.hash !== recomputed.hash) {
    throw new Error(`Verifier cache identity hash mismatch: ${input.hash} != ${recomputed.hash}`);
  }
  return recomputed;
}

export class VerifierReceiptCache {
  constructor(options = {}) {
    this.root = options.root || join(options.cwd || process.cwd(), ".gitvan", "cache", "capability-receipts");
  }

  pathFor(identityInput) {
    const identity = normalizeVerifierCacheIdentity(identityInput);
    return join(this.root, `${identity.hash}.json`);
  }

  async put(identityInput, receipt) {
    const identity = normalizeVerifierCacheIdentity(identityInput);
    verifyReceipt(receipt);
    if (identity.capability !== receipt.capability) {
      throw new Error(`Cache identity capability mismatch: ${identity.capability} != ${receipt.capability}`);
    }
    if (receipt.standing !== "ALIVE") throw new Error(`Only ALIVE receipts are reusable: ${receipt.standing}`);
    const recordBody = Object.freeze({
      schema: "https://gitvan.dev/schemas/verifier-cache-record/v1",
      identity,
      receipt,
    });
    const record = Object.freeze({ ...recordBody, hash: digest(recordBody) });
    const path = this.pathFor(identity);
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await rename(temporary, path);
    return Object.freeze({ path, identityHash: identity.hash, receiptHash: receipt.hash });
  }

  async get(identityInput) {
    const identity = normalizeVerifierCacheIdentity(identityInput);
    let record;
    try {
      record = JSON.parse(await readFile(this.pathFor(identity), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    const storedIdentity = normalizeVerifierCacheIdentity(record.identity || {});
    if (storedIdentity.hash !== identity.hash) throw new Error("Verifier cache identity mismatch");
    const { hash: recordHash, ...recordBody } = record;
    if (digest(recordBody) !== recordHash) throw new Error("Verifier cache record hash mismatch");
    verifyReceipt(record.receipt);
    if (record.receipt.standing !== "ALIVE") throw new Error("Verifier cache contains non-ALIVE receipt");
    return Object.freeze({ ...record, identity: storedIdentity });
  }

  async reusable(identityInput) {
    try {
      return Boolean(await this.get(identityInput));
    } catch {
      return false;
    }
  }
}

export function createVerifierReceiptCache(options = {}) {
  return new VerifierReceiptCache(options);
}
