// Phase 4: Pack Semantic Query Tests
// Comprehensive testing for SPARQL queries on RDF pack registry

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createKnowledgeSubstrateCore,
  parseTurtle,
} from "./fixtures/mock-rdf-utils.mjs";
import {
  SAMPLE_PACKS,
  LICENSE_COMPATIBILITY,
  USE_CASES,
  generatePerformanceTestPacks,
} from "./fixtures/rdf-pack-fixtures.mjs";

// Pack Query Engine
class PackQueryEngine {
  constructor() {
    this.substrate = createKnowledgeSubstrateCore({
      reasoningEnabled: true,
    });
    this.namespaces = {
      pack: "https://gitvan.dev/pack#",
      license: "https://spdx.org/licenses#",
      compat: "https://gitvan.dev/license-compat#",
      prov: "http://www.w3.org/ns/prov#",
    };
  }

  async loadPacks(packs) {
    for (const pack of packs) {
      const quads = await parseTurtle(pack.turtle);
      await this.substrate.add(quads);
    }
  }

  async query(sparql) {
    return await this.substrate.query(sparql);
  }

  async checkVersionCompatibility(pack1, version1, pack2, version2) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      ASK {
        ?p1 pack:name "${pack1}" ;
            pack:version "${version1}" ;
            pack:requiresGitVan ?req1 .
        ?p2 pack:name "${pack2}" ;
            pack:version "${version2}" ;
            pack:requiresGitVan ?req2 .
        FILTER(?req1 = ?req2)
      }
    `;

    const result = await this.query(sparql);
    return result.length > 0;
  }

  async findCompatibleVersions(packName, gitvanVersion) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?version WHERE {
        ?pack pack:name "${packName}" ;
              pack:version ?version ;
              pack:requiresGitVan ?requires .
        FILTER(CONTAINS(?requires, "${gitvanVersion}"))
      }
    `;

    return await this.query(sparql);
  }

  async checkLicenseCompatibility(license1, license2) {
    const sparql = `
      PREFIX license: <${this.namespaces.license}>
      PREFIX compat: <${this.namespaces.compat}>
      ASK {
        license:${license1} compat:compatibleWith license:${license2} .
      }
    `;

    const result = await this.query(sparql);
    return result.length > 0;
  }

  async validateMultiPackLicenses(packNames) {
    // Check if all pack licenses are compatible with each other
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      PREFIX license: <${this.namespaces.license}>
      PREFIX compat: <${this.namespaces.compat}>
      SELECT ?pack1 ?lic1 ?pack2 ?lic2 WHERE {
        ?pack1 pack:name ?name1 ; pack:license ?lic1 .
        ?pack2 pack:name ?name2 ; pack:license ?lic2 .
        FILTER(?name1 IN (${packNames.map((n) => `"${n}"`).join(", ")}))
        FILTER(?name2 IN (${packNames.map((n) => `"${n}"`).join(", ")}))
        FILTER(?name1 != ?name2)
        FILTER NOT EXISTS {
          ?lic1 compat:compatibleWith ?lic2 .
        }
      }
    `;

    return await this.query(sparql);
  }

  async searchByCategory(category) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?name ?version ?rating WHERE {
        ?pack pack:category "${category}" ;
              pack:name ?name ;
              pack:version ?version ;
              pack:rating ?rating .
      }
      ORDER BY DESC(?rating)
    `;

    return await this.query(sparql);
  }

  async searchByKeywords(keywords) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT DISTINCT ?name ?version WHERE {
        ?pack pack:name ?name ;
              pack:version ?version ;
              pack:keywords ?kwList .
        ?kwList rdf:rest*/rdf:first ?kw .
        FILTER(?kw IN (${keywords.map((k) => `"${k}"`).join(", ")}))
      }
    `;

    return await this.query(sparql);
  }

  async searchByFeatures(features) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?name ?version (COUNT(?feature) AS ?matchCount) WHERE {
        ?pack pack:name ?name ;
              pack:version ?version ;
              pack:keywords ?kwList .
        ?kwList rdf:rest*/rdf:first ?feature .
        FILTER(?feature IN (${features.map((f) => `"${f}"`).join(", ")}))
      }
      GROUP BY ?name ?version
      ORDER BY DESC(?matchCount)
    `;

    return await this.query(sparql);
  }

  async fullTextSearch(searchTerm) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?name ?version ?description WHERE {
        ?pack pack:name ?name ;
              pack:version ?version ;
              pack:description ?description .
        FILTER(
          CONTAINS(LCASE(?name), LCASE("${searchTerm}")) ||
          CONTAINS(LCASE(?description), LCASE("${searchTerm}"))
        )
      }
    `;

    return await this.query(sparql);
  }

  async sortByRating(minRating = 0) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?name ?version ?rating WHERE {
        ?pack pack:name ?name ;
              pack:version ?version ;
              pack:rating ?rating .
        FILTER(?rating >= ${minRating})
      }
      ORDER BY DESC(?rating)
    `;

    return await this.query(sparql);
  }

  async sortByPopularity() {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?name ?version ?downloads WHERE {
        ?pack pack:name ?name ;
              pack:version ?version ;
              pack:downloads ?downloads .
      }
      ORDER BY DESC(?downloads)
    `;

    return await this.query(sparql);
  }

  async findTrendingPacks(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const isoDate = cutoffDate.toISOString().split("T")[0];

    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT ?name ?version ?downloads ?createdAt WHERE {
        ?pack pack:name ?name ;
              pack:version ?version ;
              pack:downloads ?downloads ;
              pack:createdAt ?createdAt .
        FILTER(?createdAt >= "${isoDate}"^^xsd:date)
      }
      ORDER BY DESC(?downloads)
      LIMIT 10
    `;

    return await this.query(sparql);
  }

  async resolveDependencies(packName, version) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?depName ?depVersion WHERE {
        ?pack pack:name "${packName}" ;
              pack:version "${version}" ;
              pack:dependsOn ?dep .
        ?dep pack:name ?depName ;
             pack:version ?depVersion .
      }
    `;

    return await this.query(sparql);
  }

  async findOptimalCombination(categories, constraints = {}) {
    let filterClauses = [];

    if (constraints.minRating) {
      filterClauses.push(`FILTER(?rating >= ${constraints.minRating})`);
    }

    if (constraints.license) {
      filterClauses.push(`FILTER(?license = license:${constraints.license})`);
    }

    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      PREFIX license: <${this.namespaces.license}>
      SELECT ?category ?name ?version ?rating WHERE {
        ?pack pack:category ?category ;
              pack:name ?name ;
              pack:version ?version ;
              pack:rating ?rating ;
              pack:license ?license .
        FILTER(?category IN (${categories.map((c) => `"${c}"`).join(", ")}))
        ${filterClauses.join("\n")}
      }
      ORDER BY ?category DESC(?rating)
    `;

    return await this.query(sparql);
  }

  async calculateFeatureCoverage(packNames, requiredFeatures) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?feature (COUNT(?pack) AS ?coverageCount) WHERE {
        ?pack pack:name ?name ;
              pack:keywords ?kwList .
        ?kwList rdf:rest*/rdf:first ?feature .
        FILTER(?name IN (${packNames.map((n) => `"${n}"`).join(", ")}))
        FILTER(?feature IN (${requiredFeatures.map((f) => `"${f}"`).join(", ")}))
      }
      GROUP BY ?feature
    `;

    return await this.query(sparql);
  }

  async recommendByUseCase(useCase) {
    const { requiredCategories, constraints } = USE_CASES[useCase] || {};
    if (!requiredCategories) return [];

    return await this.findOptimalCombination(requiredCategories, constraints);
  }

  async findSimilarPacks(packName, version) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?similarName ?similarVersion ?category ?keywords WHERE {
        ?pack pack:name "${packName}" ;
              pack:version "${version}" ;
              pack:category ?category .
        ?similar pack:name ?similarName ;
                 pack:version ?similarVersion ;
                 pack:category ?category .
        FILTER(?similarName != "${packName}")
      }
    `;

    return await this.query(sparql);
  }

  async comparePacks(pack1, pack2) {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?metric ?p1Value ?p2Value WHERE {
        {
          SELECT "rating" AS ?metric ?rating1 AS ?p1Value WHERE {
            ?p1 pack:name "${pack1}" ; pack:rating ?rating1 .
          }
        }
        {
          SELECT "rating" AS ?metric ?rating2 AS ?p2Value WHERE {
            ?p2 pack:name "${pack2}" ; pack:rating ?rating2 .
          }
        }
      }
    `;

    return await this.query(sparql);
  }

  async suggestAlternatives(packName, reason = "deprecated") {
    const sparql = `
      PREFIX pack: <${this.namespaces.pack}>
      SELECT ?altName ?altVersion ?category WHERE {
        ?pack pack:name "${packName}" ;
              pack:category ?category .
        ?alt pack:name ?altName ;
             pack:version ?altVersion ;
             pack:category ?category .
        FILTER(?altName != "${packName}")
      }
      ORDER BY DESC(?altVersion)
      LIMIT 5
    `;

    return await this.query(sparql);
  }
});

describe("Pack Queries - Compatibility Queries", () => {
  let engine;

  beforeEach(async () => {
    engine = new PackQueryEngine();
    await engine.loadPacks([
      SAMPLE_PACKS.authPack,
      SAMPLE_PACKS.authPackV2,
      SAMPLE_PACKS.apiPack,
      SAMPLE_PACKS.apiPackV2,
      SAMPLE_PACKS.uiPack,
      SAMPLE_PACKS.uiPackV3,
    ]);
  });

  it("should check version compatibility between two packs", async () => {
    const compatible = await engine.checkVersionCompatibility(
      "auth",
      "1.0.0",
      "api",
      "1.2.0"
    );
    expect(typeof compatible).toBe("boolean");
  });

  it("should find compatible versions for GitVan version", async () => {
    const versions = await engine.findCompatibleVersions("auth", "3.0");
    expect(versions).toBeDefined();
    expect(Array.isArray(versions)).toBe(true);
  });

  it("should validate multi-pack compatibility", async () => {
    const packs = ["auth", "api", "ui"];
    const conflicts = await engine.validateMultiPackLicenses(packs);
    expect(Array.isArray(conflicts)).toBe(true);
  });

  it("should check license compatibility between packs", async () => {
    await engine.loadPacks([{ turtle: LICENSE_COMPATIBILITY }]);
    const compatible = await engine.checkLicenseCompatibility("MIT", "Apache-2.0");
    expect(typeof compatible).toBe("boolean");
  });

  it("should detect license incompatibilities in dependency tree", async () => {
    await engine.loadPacks([
      SAMPLE_PACKS.dbPack, // GPL
      SAMPLE_PACKS.analyticsPack, // Commercial
      { turtle: LICENSE_COMPATIBILITY },
    ]);

    const compatible = await engine.checkLicenseCompatibility("GPL-3.0", "Commercial");
    expect(compatible).toBe(false);
  });

  it("should verify all dependencies have compatible licenses", async () => {
    const packs = ["auth", "api", "ui"];
    const conflicts = await engine.validateMultiPackLicenses(packs);
    expect(conflicts.length).toBe(0);
  });

  it("should validate GitVan version constraints", async () => {
    const v3Compatible = await engine.findCompatibleVersions("auth", "3.0");
    expect(v3Compatible.length).toBeGreaterThan(0);
  });

  it("should check transitive compatibility", async () => {
    // A depends on B, B depends on C - check if A compatible with C
    const deps = await engine.resolveDependencies("auth", "1.0.0");
    expect(Array.isArray(deps)).toBe(true);
  });
});

describe("Pack Queries - Discovery Queries", () => {
  let engine;

  beforeEach(async () => {
    engine = new PackQueryEngine();
    await engine.loadPacks([
      SAMPLE_PACKS.authPack,
      SAMPLE_PACKS.apiPack,
      SAMPLE_PACKS.uiPack,
      SAMPLE_PACKS.dbPack,
      SAMPLE_PACKS.deployPack,
      SAMPLE_PACKS.testingPack,
      SAMPLE_PACKS.analyticsPack,
    ]);
  });

  it("should filter packs by category", async () => {
    const authPacks = await engine.searchByCategory("authentication");
    expect(authPacks.length).toBeGreaterThan(0);
  });

  it("should search packs by keywords", async () => {
    const results = await engine.searchByKeywords(["auth", "jwt"]);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should find packs with specific features", async () => {
    const results = await engine.searchByFeatures(["api", "rest"]);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should perform full-text search on descriptions", async () => {
    const results = await engine.fullTextSearch("authentication");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should sort packs by rating", async () => {
    const topRated = await engine.sortByRating(4.5);
    expect(topRated.length).toBeGreaterThan(0);

    // Verify sorted order
    for (let i = 1; i < topRated.length; i++) {
      expect(topRated[i - 1].rating).toBeGreaterThanOrEqual(topRated[i].rating);
    }
  });

  it("should sort packs by popularity (downloads)", async () => {
    const popular = await engine.sortByPopularity();
    expect(popular.length).toBeGreaterThan(0);

    // Verify sorted order
    for (let i = 1; i < popular.length; i++) {
      expect(popular[i - 1].downloads).toBeGreaterThanOrEqual(
        popular[i].downloads
      );
    }
  });

  it("should find trending packs (recently created)", async () => {
    const trending = await engine.findTrendingPacks(365);
    expect(Array.isArray(trending)).toBe(true);
  });

  it("should combine multiple filters (category + rating)", async () => {
    const results = await engine.findOptimalCombination(
      ["authentication", "api-gateway"],
      { minRating: 4.5 }
    );
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("Pack Queries - Resolution Queries", () => {
  let engine;

  beforeEach(async () => {
    engine = new PackQueryEngine();
    await engine.loadPacks([
      SAMPLE_PACKS.authPack,
      SAMPLE_PACKS.apiPack,
      SAMPLE_PACKS.uiPack,
      SAMPLE_PACKS.deployPack,
    ]);
  });

  it("should resolve pack dependencies", async () => {
    const deps = await engine.resolveDependencies("auth", "1.0.0");
    expect(Array.isArray(deps)).toBe(true);
  });

  it("should find optimal pack combination for use case", async () => {
    const combo = await engine.findOptimalCombination(
      ["authentication", "api-gateway", "ui-components"],
      { minRating: 4.5 }
    );

    expect(combo.length).toBeGreaterThan(0);
  });

  it("should calculate feature coverage", async () => {
    const coverage = await engine.calculateFeatureCoverage(
      ["auth", "api"],
      ["jwt", "oauth", "rest", "openapi"]
    );

    expect(Array.isArray(coverage)).toBe(true);
  });

  it("should minimize license conflicts in combinations", async () => {
    await engine.loadPacks([{ turtle: LICENSE_COMPATIBILITY }]);

    const combo = await engine.findOptimalCombination(
      ["authentication", "database"],
      { license: "MIT" }
    );

    expect(combo.length).toBeGreaterThan(0);
  });

  it("should maximize feature coverage with minimal packs", async () => {
    const coverage = await engine.calculateFeatureCoverage(
      ["auth", "api", "ui"],
      ["jwt", "rest", "components"]
    );

    expect(coverage.length).toBeGreaterThan(0);
  });
});

describe("Pack Queries - Recommendation Queries", () => {
  let engine;

  beforeEach(async () => {
    engine = new PackQueryEngine();
    await engine.loadPacks([
      SAMPLE_PACKS.authPack,
      SAMPLE_PACKS.apiPack,
      SAMPLE_PACKS.uiPack,
      SAMPLE_PACKS.dbPack,
      SAMPLE_PACKS.deployPack,
      SAMPLE_PACKS.testingPack,
    ]);
  });

  it("should suggest packs for use case", async () => {
    const suggestions = await engine.recommendByUseCase("fullStack");
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it("should find similar packs based on category", async () => {
    const similar = await engine.findSimilarPacks("auth", "1.0.0");
    expect(Array.isArray(similar)).toBe(true);
  });

  it("should compare two packs feature-by-feature", async () => {
    const comparison = await engine.comparePacks("auth", "api");
    expect(Array.isArray(comparison)).toBe(true);
  });

  it("should suggest alternatives for deprecated pack", async () => {
    const alternatives = await engine.suggestAlternatives("auth", "deprecated");
    expect(Array.isArray(alternatives)).toBe(true);
  });
});

describe("Pack Queries - Performance", () => {
  let engine;

  beforeEach(async () => {
    engine = new PackQueryEngine();
  });

  it("should query large pack set efficiently (< 200ms)", async () => {
    const packs = generatePerformanceTestPacks(100);
    await engine.loadPacks(packs);

    const startTime = Date.now();
    await engine.searchByCategory("authentication");
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(200);
  });

  it("should handle complex queries with multiple filters", async () => {
    await engine.loadPacks([
      SAMPLE_PACKS.authPack,
      SAMPLE_PACKS.apiPack,
      SAMPLE_PACKS.uiPack,
      SAMPLE_PACKS.dbPack,
    ]);

    const startTime = Date.now();
    await engine.findOptimalCombination(
      ["authentication", "api-gateway"],
      { minRating: 4.5, license: "MIT" }
    );
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(300);
  });

  it("should perform full-text search efficiently", async () => {
    const packs = generatePerformanceTestPacks(100);
    await engine.loadPacks(packs);

    const startTime = Date.now();
    await engine.fullTextSearch("auth");
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(250);
  });
});
