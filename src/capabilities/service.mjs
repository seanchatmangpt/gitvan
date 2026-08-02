import { createCapabilityRuntime } from "./runtime.mjs";
import { createCapabilityPolicySet } from "./policy.mjs";
import { createCapabilityEvidenceLedger } from "./evidence-ledger.mjs";
import { capabilityGraph, capabilityLayers, toDot, toGraphJSON, toMermaid } from "./graph.mjs";
import { createVerificationPlan, planToMermaid } from "./planner.mjs";
import { verifyReceipt } from "./verifier.mjs";

export class CapabilityService {
  constructor(options = {}) {
    this.runtime = options.runtime || createCapabilityRuntime(options.runtimeOptions || {});
    this.policies = options.policies || createCapabilityPolicySet(options.rules);
    this.ledger = options.ledger || createCapabilityEvidenceLedger(options.ledgerOptions);
    this.expectedSubject = options.expectedSubject || null;
  }

  list() {
    return this.runtime.list().map(capability => ({
      ...capability,
      dependencyOrder: this.runtime.registry.dependencyOrder(capability.id).map(item => item.id),
    }));
  }

  inspect(id) {
    const inspected = this.runtime.inspect(id);
    const policy = this.policies.evaluate("inspect", inspected.capability, { expectedSubject: this.expectedSubject });
    return Object.freeze({ ...inspected, policy });
  }

  plan(ids = [], options = {}) {
    const plan = createVerificationPlan(this.runtime.registry, ids, options);
    this.ledger.append("verification.planned", {
      capability: ids.length === 1 ? ids[0] : null,
      targets: plan.targets,
      closure: plan.closure,
      planHash: plan.hash,
    });
    return options.format === "mermaid" ? planToMermaid(plan) : plan;
  }

  async verify(id) {
    const capability = this.runtime.registry.require(id);
    const policy = this.policies.assert("verify", capability, {
      subject: this.runtime.subject,
      expectedSubject: this.expectedSubject,
    });
    this.ledger.append("verification.started", { capability: id, policy });
    try {
      const receipt = await this.runtime.verify(id);
      this.ledger.append("verification.finished", {
        capability: id,
        standing: receipt.standing,
        receiptHash: receipt.hash,
      });
      return receipt;
    } catch (error) {
      this.ledger.append("verification.failed", {
        capability: id,
        error: error.message,
        type: error.type || error.name,
      });
      throw error;
    }
  }

  async verifyAll(options = {}) {
    const selected = options.ids?.length ? options.ids : this.runtime.list().map(item => item.id);
    const receipts = [];
    for (const id of selected) {
      const receipt = await this.verify(id);
      receipts.push(receipt);
      if (options.failFast !== false && receipt.standing !== "ALIVE") break;
    }
    return Object.freeze(receipts);
  }

  async receipt(id) {
    const receipt = await this.runtime.receipts.get(id);
    const replayVerified = verifyReceipt(receipt);
    this.ledger.append("receipt.read", { capability: id, receiptHash: receipt.hash, replayVerified });
    return receipt;
  }

  async admitActuation(id) {
    const capability = this.runtime.registry.require(id);
    const receipt = await this.receipt(id);
    const replayVerified = verifyReceipt(receipt);
    const policy = this.policies.assert("actuate", capability, {
      receipt,
      replayVerified,
      expectedSubject: this.expectedSubject,
    });
    const admission = await this.runtime.admitActuation(id, receipt);
    this.ledger.append("actuation.admitted", { capability: id, receiptHash: receipt.hash, policy });
    return admission;
  }

  status() {
    const capabilities = this.runtime.list();
    const byState = {};
    for (const capability of capabilities) byState[capability.state] = (byState[capability.state] || 0) + 1;
    return Object.freeze({
      capabilities: capabilities.length,
      byState,
      ledger: this.ledger.summary(),
      layers: capabilityLayers(this.runtime.registry),
    });
  }

  graph(format = "json") {
    if (format === "mermaid") return toMermaid(this.runtime.registry);
    if (format === "dot") return toDot(this.runtime.registry);
    if (format === "object") return capabilityGraph(this.runtime.registry);
    return toGraphJSON(this.runtime.registry);
  }
}

export function createCapabilityService(options = {}) {
  return new CapabilityService(options);
}
