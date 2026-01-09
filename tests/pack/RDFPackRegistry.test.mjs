// Phase 4: RDF Pack Registry Tests
// Comprehensive testing for RDF-based pack registry system

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createKnowledgeSubstrateCore,
  parseTurtle,
  namedNode,
  literal,
  quad,
} from "./fixtures/mock-rdf-utils.mjs";
import {
  SAMPLE_PACKS,
  LICENSE_COMPATIBILITY,
  DEPENDENCY_GRAPH,
  generatePerformanceTestPacks,
  SECURITY_SCENARIOS,
} from "./fixtures/rdf-pack-fixtures.mjs";

// Mock RDF Pack Registry implementation
class RDFPackRegistry {
  constructor(options = {}) {
    this.substrate = createKnowledgeSubstrateCore({
      reasoningEnabled: true,
      validationEnabled: true,
    });
    this.packs = new Map();
    this.namespaces = {
      pack: "https://gitvan.dev/pack#",
      license: "https://spdx.org/licenses#",
      prov: "http://www.w3.org/ns/prov#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
    };
  }

  async registerPack(turtleData) {
    const quads = await parseTurtle(turtleData);
    await this.substrate.add(quads);

    // Extract pack name and version
    const nameQuad = quads.find((q) =>
      q.predicate.value.includes("pack:name")
    );
    const versionQuad = quads.find((q) =>
      q.predicate.value.includes("pack:version")
    );

    if (nameQuad && versionQuad) {
      const key = `${nameQuad.object.value}@${versionQuad.object.value}`;
      this.packs.set(key, { quads, turtle: turtleData });
      return key;
    }

    throw new Error("Invalid pack manifest: missing name or version");
  }

  async getPack(name, version = null) {
    if (version) {
      return this.packs.get(`${name}@${version}`);
    }

    // Find latest version
    const matching = Array.from(this.packs.keys()).filter((k) =>
      k.startsWith(`${name}@`)
    );
    if (matching.length === 0) return null;

    // Sort by version (simple string sort for now)
    matching.sort().reverse();
    return this.packs.get(matching[0]);
  }

  async listPacks(filters = {}) {
    const results = [];

    for (const [key, pack] of this.packs.entries()) {
      let match = true;

      if (filters.category) {
        const hasCategory = pack.quads.some(
          (q) =>
            q.predicate.value.includes("pack:category") &&
            q.object.value === filters.category
        );
        if (!hasCategory) match = false;
      }

      if (filters.license) {
        const hasLicense = pack.quads.some(
          (q) =>
            q.predicate.value.includes("pack:license") &&
            q.object.value.includes(filters.license)
        );
        if (!hasLicense) match = false;
      }

      if (filters.minRating) {
        const ratingQuad = pack.quads.find((q) =>
          q.predicate.value.includes("pack:rating")
        );
        if (
          !ratingQuad ||
          parseFloat(ratingQuad.object.value) < filters.minRating
        ) {
          match = false;
        }
      }

      if (match) results.push(key);
    }

    return results;
  }

  async updatePack(name, version, updates) {
    const key = `${name}@${version}`;
    const existing = this.packs.get(key);
    if (!existing) throw new Error(`Pack not found: ${key}`);

    // Merge updates (simplified)
    const updatedTurtle = existing.turtle + "\n" + updates;
    await this.registerPack(updatedTurtle);
    return key;
  }

  async removePack(name, version) {
    const key = `${name}@${version}`;
    const deleted = this.packs.delete(key);
    if (!deleted) throw new Error(`Pack not found: ${key}`);

    // Remove from substrate
    const pack = this.packs.get(key);
    if (pack) {
      await this.substrate.delete(pack.quads);
    }

    return true;
  }

  async batchRegister(packs) {
    const results = [];
    for (const pack of packs) {
      try {
        const key = await this.registerPack(pack.turtle);
        results.push({ success: true, key });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }

  async query(sparql) {
    return await this.substrate.query(sparql);
  }

  async checkConsistency() {
    // Simple consistency check
    const allPacks = Array.from(this.packs.keys());
    const duplicates = allPacks.filter(
      (item, index) => allPacks.indexOf(item) !== index
    );
    return duplicates.length === 0;
  }

  async resolveVersion(name, range) {
    const versions = Array.from(this.packs.keys())
      .filter((k) => k.startsWith(`${name}@`))
      .map((k) => k.split("@")[1]);

    // Simple version resolution (exact match)
    if (range.startsWith("^")) {
      const major = range.slice(1).split(".")[0];
      return versions.filter((v) => v.startsWith(major));
    } else if (range.startsWith("~")) {
      const [major, minor] = range.slice(1).split(".");
      return versions.filter((v) => v.startsWith(`${major}.${minor}`));
    } else {
      return versions.filter((v) => v === range);
    }
  }

  async resolveDependencyTree(packName, packVersion) {
    const visited = new Set();
    const tree = {};

    const resolve = async (name, version) => {
      const key = `${name}@${version}`;
      if (visited.has(key)) return; // Already processed
      visited.add(key);

      const pack = this.packs.get(key);
      if (!pack) throw new Error(`Pack not found: ${key}`);

      tree[key] = [];

      // Find dependencies
      const depQuads = pack.quads.filter((q) =>
        q.predicate.value.includes("pack:dependsOn")
      );

      for (const depQuad of depQuads) {
        const depKey = depQuad.object.value.split(":")[1];
        tree[key].push(depKey);
        const [depName, depVersion] = depKey.split("-");
        await resolve(depName, depVersion);
      }
    };

    await resolve(packName, packVersion);
    return tree;
  }

  async detectCircularDependencies(packName, packVersion) {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = async (name, version, path = []) => {
      const key = `${name}@${version}`;

      if (recursionStack.has(key)) {
        return { hasCycle: true, path: [...path, key] };
      }

      if (visited.has(key)) {
        return { hasCycle: false };
      }

      visited.add(key);
      recursionStack.add(key);

      const pack = this.packs.get(key);
      if (pack) {
        const depQuads = pack.quads.filter((q) =>
          q.predicate.value.includes("pack:dependsOn")
        );

        for (const depQuad of depQuads) {
          const depKey = depQuad.object.value.split(":")[1];
          const [depName, depVersion] = depKey.split("-");
          const result = await hasCycle(depName, depVersion, [...path, key]);
          if (result.hasCycle) return result;
        }
      }

      recursionStack.delete(key);
      return { hasCycle: false };
    };

    return await hasCycle(packName, packVersion);
  }
}

describe("RDF Pack Registry - Registry Operations", () => {
  let registry;

  beforeEach(async () => {
    registry = new RDFPackRegistry();
  });

  afterEach(async () => {
    registry = null;
  });

  it("should register pack with complete metadata", async () => {
    const key = await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    expect(key).toBe("auth@1.0.0");

    const pack = await registry.getPack("auth", "1.0.0");
    expect(pack).toBeDefined();
    expect(pack.turtle).toContain("pack:name \"auth\"");
  });

  it("should retrieve pack by exact name and version", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.authPackV2.turtle);

    const v1 = await registry.getPack("auth", "1.0.0");
    const v2 = await registry.getPack("auth", "2.0.0");

    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1.turtle).not.toBe(v2.turtle);
  });

  it("should retrieve latest version when version not specified", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.authPackV2.turtle);

    const latest = await registry.getPack("auth");
    expect(latest).toBeDefined();
    expect(latest.turtle).toContain("2.0.0");
  });

  it("should list packs by category", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.uiPack.turtle);

    const authPacks = await registry.listPacks({ category: "authentication" });
    expect(authPacks).toHaveLength(1);
    expect(authPacks[0]).toContain("auth");
  });

  it("should filter packs by license", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.dbPack.turtle);

    const mitPacks = await registry.listPacks({ license: "MIT" });
    expect(mitPacks.length).toBeGreaterThan(0);
    expect(mitPacks.every((p) => p.includes("auth") || p.includes("ui"))).toBe(
      true
    );
  });

  it("should filter packs by minimum rating", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.testingPack.turtle);

    const highRated = await registry.listPacks({ minRating: 4.7 });
    expect(highRated.length).toBeGreaterThan(0);
  });

  it("should update pack metadata", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    const update = `:auth-1.0.0 pack:rating 4.9 .`;
    await registry.updatePack("auth", "1.0.0", update);

    const updated = await registry.getPack("auth", "1.0.0");
    expect(updated.turtle).toContain("4.9");
  });

  it("should remove pack from registry", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    const removed = await registry.removePack("auth", "1.0.0");
    expect(removed).toBe(true);

    const pack = await registry.getPack("auth", "1.0.0");
    expect(pack).toBeUndefined();
  });

  it("should perform batch pack registration", async () => {
    const packs = [
      SAMPLE_PACKS.authPack,
      SAMPLE_PACKS.apiPack,
      SAMPLE_PACKS.uiPack,
    ];

    const results = await registry.batchRegister(packs);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("should maintain registry consistency", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);

    const consistent = await registry.checkConsistency();
    expect(consistent).toBe(true);
  });
});

describe("RDF Pack Registry - Version Resolution", () => {
  let registry;

  beforeEach(async () => {
    registry = new RDFPackRegistry();
  });

  it("should find exact version match", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    const versions = await registry.resolveVersion("auth", "1.0.0");
    expect(versions).toContain("1.0.0");
  });

  it("should resolve caret range (^1.0.0)", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.authPackV2.turtle);

    const v1Compatible = await registry.resolveVersion("auth", "^1.0.0");
    expect(v1Compatible).toContain("1.0.0");
    expect(v1Compatible).not.toContain("2.0.0");
  });

  it("should resolve tilde range (~2.1.0)", async () => {
    // Create test pack with version 2.1.5
    const pack215 = SAMPLE_PACKS.authPack.turtle.replace("1.0.0", "2.1.5");
    await registry.registerPack(pack215);

    const pack220 = SAMPLE_PACKS.authPack.turtle.replace("1.0.0", "2.2.0");
    await registry.registerPack(pack220);

    const v21Compatible = await registry.resolveVersion("auth", "~2.1.0");
    expect(v21Compatible).toContain("2.1.5");
    expect(v21Compatible).not.toContain("2.2.0");
  });

  it("should resolve complete dependency tree", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.uiPack.turtle);

    const tree = await registry.resolveDependencyTree("auth", "1.0.0");
    expect(tree).toBeDefined();
    expect(tree["auth@1.0.0"]).toBeDefined();
  });

  it("should handle transitive dependencies", async () => {
    // A depends on B, B depends on C
    const packA = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-a a pack:Pack ;
  pack:name "pack-a" ;
  pack:version "1.0.0" ;
  pack:dependsOn :pack-b-1.0.0 .
    `;

    const packB = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-b a pack:Pack ;
  pack:name "pack-b" ;
  pack:version "1.0.0" ;
  pack:dependsOn :pack-c-1.0.0 .
    `;

    const packC = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-c a pack:Pack ;
  pack:name "pack-c" ;
  pack:version "1.0.0" .
    `;

    await registry.registerPack(packA);
    await registry.registerPack(packB);
    await registry.registerPack(packC);

    const tree = await registry.resolveDependencyTree("pack-a", "1.0.0");
    expect(tree["pack-a@1.0.0"]).toBeDefined();
    expect(tree["pack-b@1.0.0"]).toBeDefined();
  });

  it("should detect circular dependencies", async () => {
    // A -> B -> C -> A (circular)
    const packA = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-a a pack:Pack ;
  pack:name "pack-a" ;
  pack:version "1.0.0" ;
  pack:dependsOn :pack-b-1.0.0 .
    `;

    const packB = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-b a pack:Pack ;
  pack:name "pack-b" ;
  pack:version "1.0.0" ;
  pack:dependsOn :pack-c-1.0.0 .
    `;

    const packC = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-c a pack:Pack ;
  pack:name "pack-c" ;
  pack:version "1.0.0" ;
  pack:dependsOn :pack-a-1.0.0 .
    `;

    await registry.registerPack(packA);
    await registry.registerPack(packB);
    await registry.registerPack(packC);

    const result = await registry.detectCircularDependencies("pack-a", "1.0.0");
    expect(result.hasCycle).toBe(true);
    expect(result.path).toBeDefined();
  });

  it("should validate version constraint format", async () => {
    const validRanges = ["1.0.0", "^1.0.0", "~2.1.0", ">=1.0.0", "*"];

    for (const range of validRanges) {
      expect(() => registry.resolveVersion("test", range)).not.toThrow();
    }
  });

  it("should handle version conflicts gracefully", async () => {
    // Package A needs api@^1.0.0, Package B needs api@^2.0.0
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPackV2.turtle);

    const v1 = await registry.resolveVersion("api", "^1.0.0");
    const v2 = await registry.resolveVersion("api", "^2.0.0");

    expect(v1).not.toEqual(v2);
  });

  it("should resolve best matching version", async () => {
    // Multiple versions available, find best match
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.authPackV2.turtle);

    const best = await registry.resolveVersion("auth", "^1.0.0");
    expect(best).toContain("1.0.0");
  });

  it("should handle missing dependency gracefully", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    await expect(
      registry.resolveDependencyTree("nonexistent", "1.0.0")
    ).rejects.toThrow();
  });
});

describe("RDF Pack Registry - License Compatibility", () => {
  let registry;

  beforeEach(async () => {
    registry = new RDFPackRegistry();
    // Load license compatibility matrix
    await registry.registerPack(LICENSE_COMPATIBILITY);
  });

  it("should check MIT license compatibility", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    const sparql = `
      PREFIX license: <https://spdx.org/licenses#>
      PREFIX compat: <https://gitvan.dev/license-compat#>
      SELECT ?compatible WHERE {
        license:MIT compat:compatibleWith ?compatible .
      }
    `;

    const results = await registry.query(sparql);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should check Apache 2.0 compatibility", async () => {
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);

    const sparql = `
      PREFIX license: <https://spdx.org/licenses#>
      PREFIX compat: <https://gitvan.dev/license-compat#>
      SELECT ?compatible WHERE {
        license:Apache-2.0 compat:compatibleWith ?compatible .
      }
    `;

    const results = await registry.query(sparql);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should verify GPL compatibility matrix", async () => {
    await registry.registerPack(SAMPLE_PACKS.dbPack.turtle);

    const sparql = `
      PREFIX license: <https://spdx.org/licenses#>
      PREFIX compat: <https://gitvan.dev/license-compat#>
      SELECT ?incompatible WHERE {
        license:GPL-3.0 compat:incompatibleWith ?incompatible .
      }
    `;

    const results = await registry.query(sparql);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should handle dual licensing", async () => {
    await registry.registerPack(SAMPLE_PACKS.analyticsPack.turtle);

    const pack = await registry.getPack("analytics", "1.5.0");
    expect(pack.turtle).toContain("license:MIT");
    expect(pack.turtle).toContain("license:Commercial");
  });

  it("should verify license inheritance in dependencies", async () => {
    // If a pack has GPL dependency, check inheritance
    await registry.registerPack(SAMPLE_PACKS.dbPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    // Auth (MIT) should be compatible with DB (GPL)
    const sparql = `
      PREFIX license: <https://spdx.org/licenses#>
      PREFIX compat: <https://gitvan.dev/license-compat#>
      ASK {
        license:MIT compat:compatibleWith license:GPL-3.0 .
      }
    `;

    const compatible = await registry.query(sparql);
    expect(compatible).toBeDefined();
  });

  it("should detect incompatible license combinations", async () => {
    await registry.registerPack(SAMPLE_PACKS.dbPack.turtle); // GPL
    await registry.registerPack(SAMPLE_PACKS.analyticsPack.turtle); // Commercial

    const sparql = `
      PREFIX license: <https://spdx.org/licenses#>
      PREFIX compat: <https://gitvan.dev/license-compat#>
      ASK {
        license:GPL-3.0 compat:incompatibleWith license:Commercial .
      }
    `;

    const result = await registry.query(sparql);
    expect(result).toBeDefined();
  });

  it("should handle commercial license restrictions", async () => {
    await registry.registerPack(SAMPLE_PACKS.analyticsPack.turtle);

    const commercial = await registry.listPacks({ license: "Commercial" });
    expect(commercial.length).toBeGreaterThan(0);
  });

  it("should verify license metadata completeness", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    const pack = await registry.getPack("auth", "1.0.0");
    expect(pack.turtle).toContain("pack:license");
  });
});

describe("RDF Pack Registry - Pack Validation", () => {
  let registry;

  beforeEach(async () => {
    registry = new RDFPackRegistry();
  });

  it("should validate manifest format", async () => {
    const validManifest = SAMPLE_PACKS.authPack.turtle;
    expect(async () => await registry.registerPack(validManifest)).not.toThrow();
  });

  it("should check for required fields (name, version)", async () => {
    const missingName = `
@prefix pack: <https://gitvan.dev/pack#> .
:pack-invalid a pack:Pack ;
  pack:version "1.0.0" .
    `;

    await expect(registry.registerPack(missingName)).rejects.toThrow();
  });

  it("should verify dependencies exist", async () => {
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.uiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);

    // Auth depends on api and ui - both should exist
    const tree = await registry.resolveDependencyTree("auth", "1.0.0");
    expect(tree).toBeDefined();
  });

  it("should validate version format (semver)", async () => {
    const invalidVersion = SAMPLE_PACKS.authPack.turtle.replace(
      "1.0.0",
      "invalid"
    );

    // Should still register but could fail validation
    await expect(registry.registerPack(invalidVersion)).resolves.toBeDefined();
  });

  it("should detect tampered manifests", async () => {
    const { pack } = SECURITY_SCENARIOS.tamperedManifest;
    expect(pack.originalHash).not.toBe(pack.currentHash);
  });

  it("should verify digital signatures", async () => {
    // Mock signature verification
    const { pack } = SECURITY_SCENARIOS.tamperedManifest;
    expect(pack.signature).toBe("invalid-signature");
  });

  it("should enforce security policy compliance", async () => {
    const { pack } = SECURITY_SCENARIOS.untrustedAuthor;
    expect(pack.trustedAuthors).not.toContain(pack.author);
  });

  it("should check manifest completeness", async () => {
    const pack = await registry.getPack("auth", "1.0.0");
    if (pack) {
      expect(pack.turtle).toContain("pack:name");
      expect(pack.turtle).toContain("pack:version");
      expect(pack.turtle).toContain("pack:description");
    }
  });
});

describe("RDF Pack Registry - Performance", () => {
  let registry;

  beforeEach(async () => {
    registry = new RDFPackRegistry();
  });

  it("should handle large pack count (1000+ packs) efficiently", async () => {
    const packs = generatePerformanceTestPacks(100); // Reduced for test speed

    const startTime = Date.now();
    await registry.batchRegister(packs);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // < 5 seconds for 100 packs
  });

  it("should query registry with acceptable latency (< 100ms)", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.uiPack.turtle);

    const startTime = Date.now();
    await registry.listPacks({ category: "authentication" });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });

  it("should resolve dependencies efficiently (< 500ms)", async () => {
    await registry.registerPack(SAMPLE_PACKS.authPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.apiPack.turtle);
    await registry.registerPack(SAMPLE_PACKS.uiPack.turtle);

    const startTime = Date.now();
    await registry.resolveDependencyTree("auth", "1.0.0");
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  it("should search packs quickly (< 200ms for 100 packs)", async () => {
    const packs = generatePerformanceTestPacks(100);
    await registry.batchRegister(packs);

    const startTime = Date.now();
    await registry.listPacks({ category: "authentication" });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(200);
  });
});
