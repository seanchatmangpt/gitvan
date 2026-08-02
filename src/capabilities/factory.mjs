import { gitvanCapabilities } from "./generated/manifest.mjs";
import { CapabilityRegistry } from "./registry.mjs";

export function createGitVanCapabilityRegistry(overrides = []) {
  const replacement = new Map(overrides.map(item => [String(item.id), item]));
  const capabilities = gitvanCapabilities.map(item => ({ ...item, ...(replacement.get(item.id) || {}) }));
  const known = new Set(gitvanCapabilities.map(item => item.id));
  for (const item of overrides) {
    if (!known.has(String(item.id))) capabilities.push(item);
  }
  return new CapabilityRegistry(capabilities);
}
