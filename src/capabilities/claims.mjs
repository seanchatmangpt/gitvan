import { createHash } from "node:crypto";
import { verifyReceipt } from "./verifier.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function subjectMatches(actual = {}, expected = {}) {
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

export class CapabilityClaimLedger {
  #claims = new Map();
  #receipts = new Map();

  constructor(capabilities = [], options = {}) {
    this.expectedSubject = Object.freeze({ ...(options.expectedSubject || {}) });
    for (const capability of capabilities) {
      this.#claims.set(capability.id, Object.freeze({
        id: capability.id,
        title: capability.title,
        declaredStanding: capability.state,
        standing: "UNKNOWN",
        receiptHash: null,
        subject: Object.freeze({}),
        reason: "No admitted execution receipt",
      }));
    }
  }

  ingest(receipt) {
    verifyReceipt(receipt);
    const existing = this.#claims.get(receipt.capability);
    if (!existing) throw new Error(`Unknown capability claim: ${receipt.capability}`);
    const subjectAdmitted = subjectMatches(receipt.subject, this.expectedSubject);
    const standing = subjectAdmitted ? receipt.standing : "UNKNOWN";
    const claim = Object.freeze({
      ...existing,
      standing,
      receiptHash: receipt.hash,
      subject: Object.freeze({ ...receipt.subject }),
      reason: subjectAdmitted ? "Receipt replay verified" : "Receipt subject does not match admitted subject",
    });
    this.#claims.set(receipt.capability, claim);
    this.#receipts.set(receipt.hash, receipt);
    return claim;
  }

  get(id) {
    return this.#claims.get(String(id)) || null;
  }

  require(id) {
    const claim = this.get(id);
    if (!claim) throw new Error(`Unknown capability claim: ${id}`);
    return claim;
  }

  list() {
    return [...this.#claims.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  summary() {
    const byStanding = {};
    for (const claim of this.#claims.values()) byStanding[claim.standing] = (byStanding[claim.standing] || 0) + 1;
    const body = Object.freeze({
      schema: "https://gitvan.dev/schemas/capability-claims/v1",
      expectedSubject: this.expectedSubject,
      claims: Object.freeze(this.list()),
      byStanding: Object.freeze(byStanding),
    });
    return Object.freeze({ ...body, hash: digest(body) });
  }

  assertAlive(id) {
    const claim = this.require(id);
    if (claim.standing !== "ALIVE") {
      const error = new Error(`Capability claim is not ALIVE: ${id} (${claim.standing})`);
      error.claim = claim;
      throw error;
    }
    return claim;
  }

  receipt(hash) {
    return this.#receipts.get(String(hash)) || null;
  }
}

export function claimsToTOML(summary) {
  const lines = [
    `schema = ${JSON.stringify(summary.schema)}`,
    `hash = ${JSON.stringify(summary.hash)}`,
    "",
    "[expected_subject]",
  ];
  for (const [key, value] of Object.entries(summary.expectedSubject).sort()) lines.push(`${key} = ${JSON.stringify(value)}`);
  for (const claim of summary.claims) {
    lines.push(
      "",
      `[[claims]]`,
      `id = ${JSON.stringify(claim.id)}`,
      `title = ${JSON.stringify(claim.title)}`,
      `declared_standing = ${JSON.stringify(claim.declaredStanding)}`,
      `standing = ${JSON.stringify(claim.standing)}`,
      `receipt_hash = ${claim.receiptHash ? JSON.stringify(claim.receiptHash) : '""'}`,
      `reason = ${JSON.stringify(claim.reason)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function createCapabilityClaimLedger(capabilities, options = {}) {
  return new CapabilityClaimLedger(capabilities, options);
}
