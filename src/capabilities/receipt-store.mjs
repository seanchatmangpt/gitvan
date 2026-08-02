import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityRefusal } from "./model.mjs";
import { receiptHash, verifyReceipt } from "./verifier.mjs";

function safeName(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class FileReceiptStore {
  constructor(options = {}) {
    this.root = options.root || join(process.cwd(), ".gitvan", "receipts", "capabilities");
  }

  pathFor(capabilityId) {
    return join(this.root, `${safeName(capabilityId)}.json`);
  }

  async put(receipt) {
    if (!receipt?.body || !receipt?.hash || receiptHash(receipt.body) !== receipt.hash) {
      throw new CapabilityRefusal(
        "UNRECEIPTED_ACTUATION_REFUSED",
        "Refusing to persist an invalid capability receipt",
        { capability: receipt?.body?.capability || null },
      );
    }
    const path = this.pathFor(receipt.body.capability);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    return path;
  }

  async get(capabilityId) {
    const path = this.pathFor(capabilityId);
    const receipt = JSON.parse(await readFile(path, "utf8"));
    verifyReceipt(receipt);
    return receipt;
  }

  async hasAlive(capabilityId) {
    try {
      const receipt = await this.get(capabilityId);
      return receipt.body.capability === capabilityId && receipt.body.state === "ALIVE";
    } catch {
      return false;
    }
  }
}
