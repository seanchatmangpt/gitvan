import { gitvanCapabilities } from "./generated/manifest.mjs";
import { CapabilityRegistry } from "./registry.mjs";

export * from "./model.mjs";
export * from "./registry.mjs";
export * from "./verifier.mjs";
export { gitvanCapabilities } from "./generated/manifest.mjs";

export function createGitVanCapabilityRegistry(overrides = []) {
  const replacement = new Map(overrides.map(item => [item.id, item]));
  const capabilities = gitvanCapabilities.map(item => ({ ...item, ...(replacement.get(item.id) || {}) }));
  for (const item of overrides) {
    if (!gitvanCapabilities.some(existing => existing.id === item.id)) capabilities.push(item);
  }
  return new CapabilityRegistry(capabilities);
}
