import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityRefusal } from "./model.mjs";
import { verifyReceipt } from "./verifier.mjs";

function safeName(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function assertHash(hash) {
  const value = String(hash || "");
  if (!/^[a-f0-9]{64}$/.test(value)) throw new TypeError(`Invalid receipt hash: ${value}`);
  return value;
}

async function atomicWrite(path, content) {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, content, "utf8");
  await rename(temporary, path);
}

export class FileReceiptStore {
  constructor(options = {}) {
    this.root = options.root || join(options.cwd || process.cwd(), ".gitvan", "receipts", "capabilities");
    this.historyRoot = options.historyRoot || join(this.root, "history");
  }

  pathFor(capabilityId) {
    return join(this.root, `${safeName(capabilityId)}.json`);
  }

  historyDirectoryFor(capabilityId) {
    return join(this.historyRoot, safeName(capabilityId));
  }

  historyPathFor(capabilityId, hash) {
    return join(this.historyDirectoryFor(capabilityId), `${assertHash(hash)}.json`);
  }

  async put(receipt) {
    try {
      verifyReceipt(receipt);
    } catch (error) {
      throw new CapabilityRefusal(
        "UNRECEIPTED_ACTUATION_REFUSED",
        "Refusing to persist an invalid capability receipt",
        { capability: receipt?.capability || null, cause: error.message },
      );
    }

    const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
    const historyPath = this.historyPathFor(receipt.capability, receipt.hash);
    await mkdir(dirname(historyPath), { recursive: true });
    try {
      await writeFile(historyPath, serialized, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = JSON.parse(await readFile(historyPath, "utf8"));
      verifyReceipt(existing);
      if (existing.hash !== receipt.hash || existing.capability !== receipt.capability) {
        throw new CapabilityRefusal("UNRECEIPTED_ACTUATION_REFUSED", "Immutable receipt collision", {
          capability: receipt.capability,
          hash: receipt.hash,
        });
      }
    }

    const latestPath = this.pathFor(receipt.capability);
    await atomicWrite(latestPath, serialized);
    return Object.freeze({ latestPath, historyPath, hash: receipt.hash });
  }

  async get(capabilityId) {
    return this.#readAndVerify(this.pathFor(capabilityId), capabilityId);
  }

  async getByHash(capabilityId, hash) {
    return this.#readAndVerify(this.historyPathFor(capabilityId, hash), capabilityId, hash);
  }

  async list(capabilityId) {
    const directory = this.historyDirectoryFor(capabilityId);
    let names;
    try {
      names = await readdir(directory);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const hashes = names
      .filter(name => /^[a-f0-9]{64}\.json$/.test(name))
      .map(name => name.slice(0, -5))
      .sort();
    const receipts = [];
    for (const hash of hashes) receipts.push(await this.getByHash(capabilityId, hash));
    return receipts;
  }

  async verifyAll(capabilityId) {
    const receipts = await this.list(capabilityId);
    for (const receipt of receipts) verifyReceipt(receipt);
    return Object.freeze({ valid: true, capability: capabilityId, receipts: receipts.length, hashes: receipts.map(item => item.hash) });
  }

  async hasAlive(capabilityId) {
    try {
      const receipt = await this.get(capabilityId);
      return receipt.capability === capabilityId && receipt.standing === "ALIVE";
    } catch {
      return false;
    }
  }

  async #readAndVerify(path, capabilityId, expectedHash = null) {
    const receipt = JSON.parse(await readFile(path, "utf8"));
    verifyReceipt(receipt);
    if (receipt.capability !== capabilityId) {
      throw new CapabilityRefusal("UNRECEIPTED_ACTUATION_REFUSED", "Receipt subject mismatch", {
        expected: capabilityId,
        actual: receipt.capability,
      });
    }
    if (expectedHash && receipt.hash !== expectedHash) {
      throw new CapabilityRefusal("UNRECEIPTED_ACTUATION_REFUSED", "Receipt identity mismatch", {
        expectedHash,
        actualHash: receipt.hash,
      });
    }
    return Object.freeze(receipt);
  }
}
