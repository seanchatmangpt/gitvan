import { createHash } from "node:crypto";
import { CapabilityRefusal } from "./model.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function receiptHash(receiptBody) {
  return createHash("sha256").update(canonical(receiptBody)).digest("hex");
}

export function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || !receipt.hash) {
    throw new CapabilityRefusal("UNRECEIPTED_ACTUATION_REFUSED", "Capability receipt is missing or malformed", { receipt: receipt || null });
  }
  const { hash, ...body } = receipt;
  if (receiptHash(body) !== hash) {
    throw new CapabilityRefusal("UNRECEIPTED_ACTUATION_REFUSED", "Receipt hash mismatch", {
      capabilityId: receipt.capability || null,
    });
  }
  return true;
}

export async function verifyCapability(registry, id, options = {}) {
  const { execute, now = () => new Date().toISOString(), subject = {} } = options;
  if (typeof execute !== "function") throw new TypeError("verifyCapability requires an execute function");

  const ordered = registry.dependencyOrder(id);
  const observations = [];
  for (const capability of ordered) {
    if (["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(capability.state)) {
      throw new CapabilityRefusal("CAPABILITY_DEPENDENCY_REFUSED", `Capability is not executable: ${capability.id}`, {
        capability: capability.id,
        state: capability.state,
      });
    }
    const startedAt = now();
    const result = await execute(capability);
    const finishedAt = now();
    observations.push(Object.freeze({
      capability: capability.id,
      verifier: capability.verifier,
      startedAt,
      finishedAt,
      ok: result?.ok === true,
      output: result?.output ?? null,
    }));
    if (result?.ok !== true) break;
  }

  const target = registry.require(id);
  const passed = observations.length === ordered.length && observations.every(item => item.ok);
  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-receipt/v1",
    subject: Object.freeze({ ...subject }),
    capability: target.id,
    admittedDependencies: Object.freeze(ordered.map(item => item.id)),
    observations: Object.freeze(observations),
    standing: passed ? "ALIVE" : "PARTIAL_ALIVE",
  });
  return Object.freeze({ ...body, hash: receiptHash(body) });
}

export function assertReceiptedActuation(receipt, capabilityId) {
  if (!receipt || receipt.capability !== capabilityId || receipt.standing !== "ALIVE") {
    throw new CapabilityRefusal(
      "UNRECEIPTED_ACTUATION_REFUSED",
      `Actuation requires an ALIVE receipt for ${capabilityId}`,
      { capabilityId, receipt: receipt || null },
    );
  }
  verifyReceipt(receipt);
  return true;
}

export const assertActuationReceipt = assertReceiptedActuation;
