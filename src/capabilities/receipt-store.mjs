import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityRefusal } from "./model.mjs";
import { verifyReceipt } from "./verifier.mjs";

function safeName(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class FileReceiptStore {
  constructor(options = {}) {
    this.root = options.root || join(options.cwd || process.cwd(), ".gitvan", "receipts", "capabilities");
  }

  pathFor(capabilityId) {
    return join(this.root, `${safeName(capabilityId)}.json`);
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
    const path = this.pathFor(receipt.capability);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    return path;
  }

  async get(capabilityId) {
    const path = this.pathFor(capabilityId);
    const receipt = JSON.parse(await readFile(path, "utf8"));
    verifyReceipt(receipt);
    if (receipt.capability !== capabilityId) {
      throw new CapabilityRefusal("UNRECEIPTED_ACTUATION_REFUSED", "Receipt subject mismatch", {
        expected: capabilityId,
        actual: receipt.capability,
      });
    }
    return receipt;
  }

  async hasAlive(capabilityId) {
    try {
      const receipt = await this.get(capabilityId);
      return receipt.capability === capabilityId && receipt.standing === "ALIVE";
    } catch {
      return false;
    }
  }
}
