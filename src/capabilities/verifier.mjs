import { createHash } from "node:crypto";
import { CapabilityRefusal, CAPABILITY_STATES } from "./model.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function observedStanding(result) {
  const candidate = result?.standing || (result?.ok === true ? "ALIVE" : "PARTIAL_ALIVE");
  return CAPABILITY_STATES.includes(candidate) ? candidate : "UNKNOWN";
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

export function composeReceiptStanding(observations, expectedCount) {
  if (observations.length !== expectedCount) return "PARTIAL_ALIVE";
  if (observations.some(item => ["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(item.standing))) {
    return observations.find(item => ["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(item.standing))?.standing || "PARTIAL_ALIVE";
  }
  if (observations.every(item => item.ok && item.standing === "ALIVE")) return "ALIVE";
  if (observations.every(item => item.ok)) return "PARTIAL_ALIVE";
  return "PARTIAL_ALIVE";
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
    let result;
    try {
      result = await execute(capability);
    } catch (error) {
      result = {
        ok: false,
        standing: "BUILD_BROKEN",
        output: null,
        error: error.message,
        refusal: error.type || error.name,
      };
    }
    const finishedAt = now();
    const standing = observedStanding(result);
    observations.push(Object.freeze({
      capability: capability.id,
      verifier: capability.verifier,
      startedAt,
      finishedAt,
      ok: result?.ok === true,
      standing,
      output: result?.output ?? null,
      error: result?.error ?? null,
      refusal: result?.refusal ?? null,
    }));
    if (result?.ok !== true || ["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(standing)) break;
  }

  const target = registry.require(id);
  const standing = composeReceiptStanding(observations, ordered.length);
  const body = Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-receipt/v1",
    subject: Object.freeze({ ...subject }),
    capability: target.id,
    admittedDependencies: Object.freeze(ordered.map(item => item.id)),
    observations: Object.freeze(observations),
    standing,
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
