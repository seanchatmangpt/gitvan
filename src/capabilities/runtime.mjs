import { createGitVanCapabilityRegistry } from "./index.mjs";
import { createProcessExecutor } from "./process-executor.mjs";
import { FileReceiptStore } from "./receipt-store.mjs";
import { verifyCapability, assertActuationReceipt } from "./verifier.mjs";

export class CapabilityRuntime {
  constructor(options = {}) {
    this.registry = options.registry || createGitVanCapabilityRegistry(options.overrides || []);
    this.execute = options.execute || createProcessExecutor(options.process || {});
    this.receipts = options.receipts || new FileReceiptStore(options.receiptStore || {});
    this.subject = Object.freeze({ ...(options.subject || {}) });
    this.now = options.now;
  }

  list() {
    return this.registry.list();
  }

  inspect(id) {
    const capability = this.registry.require(id);
    return {
      capability,
      dependencyOrder: this.registry.dependencyOrder(id).map(item => item.id),
    };
  }

  async verify(id) {
    const receipt = await verifyCapability(this.registry, id, {
      execute: this.execute,
      subject: this.subject,
      ...(this.now ? { now: this.now } : {}),
    });
    await this.receipts.put(receipt);
    return receipt;
  }

  async admitActuation(id, candidateReceipt = null) {
    const receipt = candidateReceipt || await this.receipts.get(id);
    assertActuationReceipt(receipt, id);
    return Object.freeze({
      admitted: true,
      capability: id,
      receiptHash: receipt.hash,
      subject: receipt.body.subject,
    });
  }
}

export function createCapabilityRuntime(options = {}) {
  return new CapabilityRuntime(options);
}
