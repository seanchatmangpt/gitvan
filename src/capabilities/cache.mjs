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

export class VerifierReceiptCache {
  constructor(options = {}) {
    this.root = options.root || join(options.cwd || process.cwd(), ".gitvan", "cache", "capability-receipts");
  }

  pathFor(identity) {
    const normalized = identity.hash ? identity : verifierCacheIdentity(identity);
    return join(this.root, `${normalized.hash}.json`);
  }

  async put(identityInput, receipt) {
    const identity = identityInput.hash ? identityInput : verifierCacheIdentity(identityInput);
    verifyReceipt(receipt);
    if (identity.capability !== receipt.capability) {
      throw new Error(`Cache identity capability mismatch: ${identity.capability} != ${receipt.capability}`);
    }
    if (receipt.standing !== "ALIVE") throw new Error(`Only ALIVE receipts are reusable: ${receipt.standing}`);
    const record = Object.freeze({
      schema: "https://gitvan.dev/schemas/verifier-cache-record/v1",
      identity,
      receipt,
      hash: digest({ identity, receipt }),
    });
    const path = this.pathFor(identity);
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await rename(temporary, path);
    return Object.freeze({ path, identityHash: identity.hash, receiptHash: receipt.hash });
  }

  async get(identityInput) {
    const identity = identityInput.hash ? identityInput : verifierCacheIdentity(identityInput);
    let record;
    try {
      record = JSON.parse(await readFile(this.pathFor(identity), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    if (record.identity?.hash !== identity.hash) throw new Error("Verifier cache identity mismatch");
    if (digest({ identity: record.identity, receipt: record.receipt }) !== record.hash) throw new Error("Verifier cache record hash mismatch");
    verifyReceipt(record.receipt);
    if (record.receipt.standing !== "ALIVE") throw new Error("Verifier cache contains non-ALIVE receipt");
    return Object.freeze(record);
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
