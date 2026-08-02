import { createCapabilityRuntime } from "./runtime.mjs";
import { createCapabilityPolicySet } from "./policy.mjs";
import { createCapabilityEvidenceLedger } from "./evidence-ledger.mjs";
import { capabilityGraph, capabilityLayers, toDot, toGraphJSON, toMermaid } from "./graph.mjs";
import { createVerificationPlan, planToMermaid } from "./planner.mjs";
import { CapabilityBatchRunner } from "./batch.mjs";
import { capabilityReport, renderCapabilityReport } from "./report.mjs";
import { CapabilityClaimLedger, claimsToTOML } from "./claims.mjs";
import { assertNoCapabilityRegression, compareCapabilityStanding, regressionToMarkdown } from "./regression.mjs";
import { createVerifierReceiptCache, verifierCacheIdentity } from "./cache.mjs";
import { verifyReceipt } from "./verifier.mjs";

export class CapabilityService {
  constructor(options = {}) {
    this.runtime = options.runtime || createCapabilityRuntime(options.runtimeOptions || {});
    this.policies = options.policies || createCapabilityPolicySet(options.rules);
    this.ledger = options.ledger || createCapabilityEvidenceLedger(options.ledgerOptions);
    this.cache = options.cache || createVerifierReceiptCache(options.cacheOptions || {});
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
    this.ledger.append("verification.started", { capability: id, transport: this.runtime.transport, policy });
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

  async verifyCached(id, identityInput = {}) {
    const capability = this.runtime.registry.require(id);
    const identity = verifierCacheIdentity({
      capability: id,
      verifier: capability.verifier,
      source: { ...this.runtime.subject },
      validator: { path: capability.verifier },
      toolchain: { node: process.version },
      environment: { platform: process.platform, arch: process.arch },
      configuration: {},
      transport: this.runtime.transport,
      ...identityInput,
    });
    const cached = await this.cache.get(identity);
    if (cached) {
      await this.runtime.receipts.put(cached.receipt);
      this.ledger.append("verification.cache_hit", {
        capability: id,
        identityHash: identity.hash,
        receiptHash: cached.receipt.hash,
      });
      return Object.freeze({ receipt: cached.receipt, cached: true, identity });
    }
    const receipt = await this.verify(id);
    if (receipt.standing === "ALIVE") await this.cache.put(identity, receipt);
    this.ledger.append("verification.cache_miss", {
      capability: id,
      identityHash: identity.hash,
      receiptHash: receipt.hash,
      cached: receipt.standing === "ALIVE",
    });
    return Object.freeze({ receipt, cached: false, identity });
  }

  async verifyAll(options = {}) {
    const selected = options.ids?.length ? options.ids : this.runtime.list().map(item => item.id);
    const receipts = [];
    for (const id of selected) {
      const receipt = options.cache ? (await this.verifyCached(id, options.identity)).receipt : await this.verify(id);
      receipts.push(receipt);
      if (options.failFast !== false && receipt.standing !== "ALIVE") break;
    }
    return Object.freeze(receipts);
  }

  async batch(ids = [], options = {}) {
    const runner = new CapabilityBatchRunner({
      registry: this.runtime.registry,
      execute: this.runtime.execute,
      concurrency: options.concurrency,
      now: this.runtime.now,
      subject: { ...this.runtime.subject, transport: this.runtime.transport },
    });
    const plan = createVerificationPlan(this.runtime.registry, ids, options);
    this.ledger.append("batch.started", { targets: plan.targets, planHash: plan.hash, concurrency: runner.concurrency });
    const receipt = await runner.run(ids, options);
    this.ledger.append("batch.finished", {
      targets: receipt.targets,
      standing: receipt.standing,
      receiptHash: receipt.hash,
      complete: receipt.complete,
    });
    return receipt;
  }

  async receipt(id, hash = null) {
    const receipt = hash
      ? await this.runtime.receipts.getByHash(id, hash)
      : await this.runtime.receipts.get(id);
    const replayVerified = verifyReceipt(receipt);
    this.ledger.append("receipt.read", { capability: id, receiptHash: receipt.hash, replayVerified });
    return receipt;
  }

  async receiptHistory(id) {
    const receipts = await this.runtime.receipts.list(id);
    this.ledger.append("receipt.history_read", { capability: id, receipts: receipts.length });
    return receipts;
  }

  async admitActuation(id, hash = null) {
    const capability = this.runtime.registry.require(id);
    const receipt = await this.receipt(id, hash);
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

  report(receipts, options = {}) {
    const report = capabilityReport(receipts, options);
    this.ledger.append("report.rendered", { standing: report.standing, receipts: report.receipts, format: options.format || "object" });
    return options.format ? renderCapabilityReport(report, options.format) : report;
  }

  claims(receipts = [], options = {}) {
    const ledger = new CapabilityClaimLedger(this.runtime.list(), {
      expectedSubject: options.expectedSubject || this.expectedSubject || {},
    });
    for (const receipt of receipts) ledger.ingest(receipt);
    const summary = ledger.summary();
    this.ledger.append("claims.composed", { hash: summary.hash, byStanding: summary.byStanding });
    return options.format === "toml" ? claimsToTOML(summary) : summary;
  }

  regression(baseline, candidate, options = {}) {
    const report = compareCapabilityStanding(baseline, candidate);
    this.ledger.append("regression.compared", {
      ok: report.ok,
      regressed: report.regressed.length,
      removed: report.removed.length,
    });
    if (options.assert === true) assertNoCapabilityRegression(report);
    return options.format === "markdown" ? regressionToMarkdown(report) : report;
  }

  status() {
    const capabilities = this.runtime.list();
    const byState = {};
    for (const capability of capabilities) byState[capability.state] = (byState[capability.state] || 0) + 1;
    return Object.freeze({
      capabilities: capabilities.length,
      transport: this.runtime.transport,
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
