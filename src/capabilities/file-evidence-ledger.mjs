import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityEvidenceLedger } from "./evidence-ledger.mjs";

function parseNDJSON(source) {
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid evidence ledger JSON at line ${index + 1}: ${error.message}`);
      }
    });
}

export class FileEvidenceLedger {
  constructor(options = {}) {
    this.path = options.path || join(options.cwd || process.cwd(), ".gitvan", "evidence", "capabilities.ndjson");
    this.now = options.now;
    this.ledger = new CapabilityEvidenceLedger({ now: this.now });
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this;
    let entries = [];
    try {
      entries = parseNDJSON(await readFile(this.path, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.ledger = new CapabilityEvidenceLedger({ entries, now: this.now });
    this.loaded = true;
    return this;
  }

  async append(type, payload = {}) {
    await this.load();
    const entry = this.ledger.append(type, payload);
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(entry)}\n`, "utf8");
    return entry;
  }

  async list(filter = {}) {
    await this.load();
    return this.ledger.list(filter);
  }

  async latest(capability = null) {
    await this.load();
    return this.ledger.latest(capability);
  }

  async verify() {
    await this.load();
    return this.ledger.verify();
  }

  async summary() {
    await this.load();
    return this.ledger.summary();
  }

  async compact() {
    await this.load();
    const temporary = `${this.path}.${process.pid}.tmp`;
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(temporary, this.ledger.toNDJSON(), "utf8");
    await rename(temporary, this.path);
    return this.ledger.verify();
  }

  toJSON() {
    if (!this.loaded) throw new Error("FileEvidenceLedger must be loaded before synchronous export");
    return this.ledger.toJSON();
  }
}

export function createFileEvidenceLedger(options = {}) {
  return new FileEvidenceLedger(options);
}
