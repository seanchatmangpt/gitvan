import { createHash } from "node:crypto";
import { exploreCapabilitySpace, selectCapabilityCombination } from "./combinatorial.mjs";

function intentId(input) {
  const body = JSON.stringify({
    goal: String(input.goal || ""),
    constraints: input.constraints || {},
    desiredCapabilities: [...(input.desiredCapabilities || [])].map(String).sort(),
    authority: input.authority || {},
  });
  return `wizard-${createHash("sha256").update(body).digest("hex").slice(0, 16)}`;
}

export function createWizardIntent(input = {}) {
  const intent = Object.freeze({
    id: String(input.id || intentId(input)),
    goal: String(input.goal || ""),
    constraints: Object.freeze({ ...(input.constraints || {}) }),
    desiredCapabilities: Object.freeze([...(input.desiredCapabilities || [])].map(String).sort()),
    authority: Object.freeze({ ...(input.authority || {}) }),
  });
  if (!intent.goal) throw new Error("Wizard intent requires a goal");
  return intent;
}

export function composeWizardPlan(intentInput, options = [], context = {}) {
  const intent = createWizardIntent(intentInput);
  const enriched = options.map(option => ({
    ...option,
    utility: Number(option.utility ?? 1) + (option.provides || []).filter(item => intent.desiredCapabilities.includes(item)).length * 2,
  }));
  const space = exploreCapabilitySpace(enriched, {
    available: context.available || [],
    maximumCombinationSize: context.maximumCombinationSize || 5,
    maxCost: intent.constraints.maxCost ?? context.maxCost,
    maxAuthorityRisk: intent.constraints.maxAuthorityRisk ?? context.maxAuthorityRisk,
    allowActuation: false,
  });
  const selection = selectCapabilityCombination(space, { objective: intent.constraints.objective || "balanced" });
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/wizard-plan/v1",
    intent,
    spaceHash: space.hash,
    selection,
    steps: Object.freeze((selection.selected?.ids || []).map((id, index) => Object.freeze({ order: index + 1, option: id, action: "CONSTRUCT", authority: "NONE" }))),
    missingDesiredCapabilities: Object.freeze(intent.desiredCapabilities.filter(item => !selection.selected?.provided.includes(item))),
    actuates: false,
  });
}

export function admitWizardActuation(plan, receipts = []) {
  const alive = new Map(receipts.map(receipt => [receipt.capability, receipt]));
  const required = plan.selection.selected?.provided || [];
  const missing = required.filter(capability => alive.get(capability)?.standing !== "ALIVE");
  if (missing.length) {
    const error = new Error(`Wizard actuation refused; missing ALIVE receipts: ${missing.join(", ")}`);
    error.type = "UNRECEIPTED_ACTUATION_REFUSED";
    error.missing = missing;
    throw error;
  }
  return Object.freeze({ admitted: true, plan: plan.spaceHash, capabilities: Object.freeze(required), actuates: false });
}
