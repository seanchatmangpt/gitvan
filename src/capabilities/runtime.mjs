import { createGitVanCapabilityRegistry } from "./factory.mjs";
import { createProcessExecutor } from "./process-executor.mjs";
import { createProbeExecutor } from "./probes.mjs";
import { FileReceiptStore } from "./receipt-store.mjs";
import { verifyCapability, assertReceiptedActuation } from "./verifier.mjs";

function createExecutor(options) {
  if (typeof options.execute === "function") return options.execute;
  if (options.transport === "probe") return createProbeExecutor(options.probe || {});
  if (!options.transport || options.transport === "process") return createProcessExecutor(options.process || {});
  throw new TypeError(`Unknown capability verification transport: ${options.transport}`);
}

export class CapabilityRuntime {
  constructor(options = {}) {
    this.registry = options.registry || createGitVanCapabilityRegistry(options.overrides || []);
    this.transport = options.execute ? "custom" : options.transport || "process";
    this.execute = createExecutor(options);
    this.receipts = options.receipts || new FileReceiptStore(options.receiptStore || {});
    this.subject = Object.freeze({ ...(options.subject || {}) });
    this.now = options.now;
  }

  list() {
    return this.registry.list();
  }

  inspect(id) {
    const capability = this.registry.require(id);
    return Object.freeze({
      capability,
      transport: this.transport,
      dependencyOrder: Object.freeze(this.registry.dependencyOrder(id).map(item => item.id)),
    });
  }

  async verify(id) {
    const receipt = await verifyCapability(this.registry, id, {
      execute: this.execute,
      subject: Object.freeze({ ...this.subject, transport: this.transport }),
      ...(this.now ? { now: this.now } : {}),
    });
    await this.receipts.put(receipt);
    return receipt;
  }

  async admitActuation(id, candidateReceipt = null) {
    const receipt = candidateReceipt || await this.receipts.get(id);
    assertReceiptedActuation(receipt, id);
    return Object.freeze({
      admitted: true,
      capability: id,
      receiptHash: receipt.hash,
      subject: receipt.subject,
    });
  }
}

export function createCapabilityRuntime(options = {}) {
  return new CapabilityRuntime(options);
}
