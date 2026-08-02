import { CapabilityRefusal, normalizeCapability } from "./model.mjs";

export class CapabilityRegistry {
  #capabilities = new Map();

  constructor(capabilities = []) {
    for (const capability of capabilities) this.register(capability);
    this.assertClosed();
  }

  register(input) {
    const capability = normalizeCapability(input);
    if (this.#capabilities.has(capability.id)) {
      throw new CapabilityRefusal("INVALID_CAPABILITY_REFUSED", `Duplicate capability: ${capability.id}`, {
        id: capability.id,
      });
    }
    this.#capabilities.set(capability.id, capability);
    return capability;
  }

  get(id) {
    return this.#capabilities.get(String(id)) || null;
  }

  require(id) {
    const capability = this.get(id);
    if (!capability) {
      throw new CapabilityRefusal("INVALID_CAPABILITY_REFUSED", `Unknown capability: ${id}`, { id });
    }
    return capability;
  }

  list() {
    return [...this.#capabilities.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  assertClosed() {
    for (const capability of this.#capabilities.values()) {
      for (const dependency of capability.dependsOn) {
        if (!this.#capabilities.has(dependency)) {
          throw new CapabilityRefusal(
            "CAPABILITY_DEPENDENCY_REFUSED",
            `${capability.id} depends on missing capability ${dependency}`,
            { capability: capability.id, dependency },
          );
        }
      }
    }
    this.#assertAcyclic();
    return this;
  }

  #assertAcyclic() {
    const visiting = new Set();
    const visited = new Set();
    const visit = (id, path) => {
      if (visiting.has(id)) {
        throw new CapabilityRefusal("CAPABILITY_DEPENDENCY_REFUSED", `Capability cycle: ${[...path, id].join(" -> ")}`, {
          path: [...path, id],
        });
      }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const dependency of this.require(id).dependsOn) visit(dependency, [...path, id]);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.#capabilities.keys()) visit(id, []);
  }

  dependencyOrder(id) {
    const ordered = [];
    const seen = new Set();
    const visit = current => {
      if (seen.has(current)) return;
      seen.add(current);
      for (const dependency of this.require(current).dependsOn) visit(dependency);
      ordered.push(this.require(current));
    };
    visit(String(id));
    return ordered;
  }
}
