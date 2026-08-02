export const CAPABILITY_STATES = Object.freeze([
  "UNKNOWN",
  "PARTIAL_ALIVE",
  "ALIVE",
  "BLOCKED",
  "BUILD_BROKEN",
  "UNSUPPORTED",
]);

export const REFUSAL_TYPES = Object.freeze([
  "INVALID_CAPABILITY_REFUSED",
  "UNADMITTED_EXECUTION_REFUSED",
  "UNRECEIPTED_ACTUATION_REFUSED",
  "CAPABILITY_DEPENDENCY_REFUSED",
]);

export class CapabilityRefusal extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = "CapabilityRefusal";
    this.type = type;
    this.details = Object.freeze({ ...details });
  }

  toJSON() {
    return { name: this.name, type: this.type, message: this.message, details: this.details };
  }
}

export function assertCapabilityState(state) {
  if (!CAPABILITY_STATES.includes(state)) {
    throw new CapabilityRefusal("INVALID_CAPABILITY_REFUSED", `Unknown capability state: ${state}`, {
      state,
      allowed: CAPABILITY_STATES,
    });
  }
  return state;
}

export function normalizeCapability(input) {
  if (!input || typeof input !== "object") {
    throw new CapabilityRefusal("INVALID_CAPABILITY_REFUSED", "Capability must be an object", { input });
  }
  const id = String(input.id || "").trim();
  if (!id) {
    throw new CapabilityRefusal("INVALID_CAPABILITY_REFUSED", "Capability id is required");
  }
  return Object.freeze({
    id,
    title: String(input.title || id),
    description: String(input.description || ""),
    state: assertCapabilityState(input.state || "UNKNOWN"),
    dependsOn: Object.freeze([...new Set((input.dependsOn || []).map(String))].sort()),
    verifier: input.verifier ? String(input.verifier) : null,
    evidence: Object.freeze([...(input.evidence || [])].map(String).sort()),
    generatedBy: input.generatedBy ? String(input.generatedBy) : null,
  });
}
