import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export class CapabilityEvidenceLedger {
  #entries = [];
  #now;

  constructor(options = {}) {
    this.#now = options.now || (() => new Date().toISOString());
    for (const entry of options.entries || []) this.#entries.push(Object.freeze({ ...entry }));
    this.verify();
  }

  append(type, payload = {}) {
    const previousHash = this.#entries.at(-1)?.hash || null;
    const body = Object.freeze({
      sequence: this.#entries.length + 1,
      type: String(type),
      recordedAt: this.#now(),
      previousHash,
      payload: Object.freeze({ ...payload }),
    });
    const entry = Object.freeze({ body, hash: digest(body) });
    this.#entries.push(entry);
    return entry;
  }

  list(filter = {}) {
    return this.#entries.filter(entry => {
      if (filter.type && entry.body.type !== filter.type) return false;
      if (filter.capability && entry.body.payload.capability !== filter.capability) return false;
      return true;
    });
  }

  latest(capability = null) {
    const entries = capability ? this.list({ capability }) : this.#entries;
    return entries.at(-1) || null;
  }

  verify() {
    let previousHash = null;
    for (let index = 0; index < this.#entries.length; index += 1) {
      const entry = this.#entries[index];
      if (entry.body.sequence !== index + 1) throw new Error(`Ledger sequence mismatch at ${index + 1}`);
      if (entry.body.previousHash !== previousHash) throw new Error(`Ledger chain mismatch at ${index + 1}`);
      if (digest(entry.body) !== entry.hash) throw new Error(`Ledger hash mismatch at ${index + 1}`);
      previousHash = entry.hash;
    }
    return Object.freeze({ valid: true, entries: this.#entries.length, head: previousHash });
  }

  summary() {
    const byType = {};
    const byCapability = {};
    for (const entry of this.#entries) {
      byType[entry.body.type] = (byType[entry.body.type] || 0) + 1;
      const capability = entry.body.payload.capability;
      if (capability) byCapability[capability] = (byCapability[capability] || 0) + 1;
    }
    return Object.freeze({ entries: this.#entries.length, head: this.#entries.at(-1)?.hash || null, byType, byCapability });
  }

  toJSON() {
    return this.#entries.map(entry => ({ body: entry.body, hash: entry.hash }));
  }

  toNDJSON() {
    return this.#entries.map(entry => JSON.stringify(entry)).join("\n") + (this.#entries.length ? "\n" : "");
  }
}

export function createCapabilityEvidenceLedger(options) {
  return new CapabilityEvidenceLedger(options);
}
