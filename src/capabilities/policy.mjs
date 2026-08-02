import { CapabilityRefusal } from "./model.mjs";

export const POLICY_ACTIONS = Object.freeze(["inspect", "verify", "actuate"]);

function freezeRule(rule) {
  if (!rule || typeof rule !== "object") throw new TypeError("Policy rule must be an object");
  if (typeof rule.evaluate !== "function") throw new TypeError("Policy rule requires evaluate(capability, context)");
  return Object.freeze({
    id: String(rule.id || "anonymous-policy"),
    description: String(rule.description || ""),
    actions: Object.freeze([...(rule.actions || POLICY_ACTIONS)].map(String)),
    evaluate: rule.evaluate,
  });
}

export class CapabilityPolicySet {
  #rules;

  constructor(rules = defaultCapabilityPolicies()) {
    this.#rules = Object.freeze(rules.map(freezeRule));
  }

  list() {
    return [...this.#rules];
  }

  evaluate(action, capability, context = {}) {
    if (!POLICY_ACTIONS.includes(action)) throw new TypeError(`Unknown policy action: ${action}`);
    const decisions = [];
    for (const rule of this.#rules) {
      if (!rule.actions.includes(action)) continue;
      const result = rule.evaluate(capability, Object.freeze({ action, ...context }));
      const decision = typeof result === "boolean" ? { allowed: result } : { ...(result || {}) };
      decisions.push(Object.freeze({
        policy: rule.id,
        allowed: decision.allowed !== false,
        reason: String(decision.reason || ""),
        details: Object.freeze({ ...(decision.details || {}) }),
      }));
    }
    const denied = decisions.filter(item => !item.allowed);
    return Object.freeze({ action, capability: capability.id, allowed: denied.length === 0, decisions, denied });
  }

  assert(action, capability, context = {}) {
    const result = this.evaluate(action, capability, context);
    if (!result.allowed) {
      throw new CapabilityRefusal(
        action === "actuate" ? "UNRECEIPTED_ACTUATION_REFUSED" : "UNADMITTED_EXECUTION_REFUSED",
        `${action} refused for ${capability.id}`,
        { capability: capability.id, action, denied: result.denied },
      );
    }
    return result;
  }
}

export function defaultCapabilityPolicies() {
  return [
    {
      id: "state-boundary",
      description: "Blocked, broken, and unsupported capabilities cannot verify or actuate.",
      actions: ["verify", "actuate"],
      evaluate(capability) {
        const forbidden = ["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(capability.state);
        return { allowed: !forbidden, reason: forbidden ? `state=${capability.state}` : "state admitted" };
      },
    },
    {
      id: "verifier-required",
      description: "Verification requires an explicit verifier identity.",
      actions: ["verify"],
      evaluate(capability) {
        return { allowed: Boolean(capability.verifier), reason: capability.verifier ? "verifier present" : "missing verifier" };
      },
    },
    {
      id: "receipt-required",
      description: "Actuation requires an ALIVE replay-verified receipt.",
      actions: ["actuate"],
      evaluate(_capability, context) {
        const receipt = context.receipt;
        const allowed = Boolean(receipt && receipt.body?.standing === "ALIVE" && context.replayVerified === true);
        return { allowed, reason: allowed ? "receipt admitted" : "missing ALIVE replay-verified receipt" };
      },
    },
    {
      id: "subject-boundary",
      description: "Optional subject constraints must match exactly.",
      actions: ["verify", "actuate"],
      evaluate(_capability, context) {
        const expected = context.expectedSubject;
        if (!expected) return { allowed: true, reason: "no subject constraint" };
        const actual = context.subject || context.receipt?.body?.subject || {};
        const mismatches = Object.entries(expected).filter(([key, value]) => actual[key] !== value);
        return { allowed: mismatches.length === 0, reason: mismatches.length ? "subject mismatch" : "subject matched", details: { mismatches } };
      },
    },
  ];
}

export function createCapabilityPolicySet(rules) {
  return new CapabilityPolicySet(rules);
}
