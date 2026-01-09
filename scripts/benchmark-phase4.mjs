#!/usr/bin/env node
/**
 * Phase 4 RDF Performance Benchmarks - Pack System
 *
 * Benchmarks for:
 * - Pack registry operations (query, add, update, remove)
 * - Version resolution and compatibility
 * - Dependency resolution (DAG)
 * - Federated pack discovery
 * - Semantic search across packs
 * - License compatibility checking
 * - Pack composition and validation
 *
 * Targets:
 * - Registry operations: < 100ms
 * - Dependency resolution: < 500ms
 * - Semantic search: < 200ms
 * - Federated queries: < 300ms
 * - License checking: < 100ms
 */

import { performance } from 'node:perf_hooks';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Benchmark configuration
const BENCHMARKS_DIR = '.benchmarks';
const ITERATIONS = 100;
const WARMUP_ITERATIONS = 10;

// Performance targets (in milliseconds)
const TARGETS = {
  // Registry operations
  pack_query: 100,
  pack_add: 100,
  pack_update: 100,
  pack_remove: 100,
  pack_list: 100,

  // Version operations
  version_resolution: 200,
  version_compatibility_check: 150,
  version_latest_query: 100,

  // Dependency operations
  dependency_resolution: 500,
  dependency_graph_build: 400,
  dependency_conflict_detection: 300,
  circular_dependency_check: 200,

  // Federated operations
  federated_pack_discovery: 300,
  federated_version_query: 300,
  federated_rating_query: 250,

  // Search operations
  semantic_search: 200,
  category_search: 150,
  tag_search: 150,
  fuzzy_search: 200,

  // License operations
  license_compatibility: 100,
  license_compliance_check: 150,
  license_conflict_detection: 150,

  // Composition operations
  pack_composition: 400,
  compatibility_matrix: 300,
  auto_suggestion: 350,

  // N3 rules
  n3_dependency_cycle_detection: 150,
  n3_version_constraint_validation: 150,
  n3_license_conflict_rule: 150,
};

class BenchmarkRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  /**
   * Run a benchmark
   */
  async benchmark(name, fn, iterations = ITERATIONS) {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await fn();
    }

    // Measure
    const timings = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate statistics
    const sorted = timings.sort((a, b) => a - b);
    const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    this.results[name] = {
      mean,
      median,
      p95,
      p99,
      min,
      max,
      iterations,
      target: TARGETS[name],
      pass: p95 <= (TARGETS[name] || Infinity),
    };

    return this.results[name];
  }

  /**
   * Print results
   */
  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('Phase 4 RDF Performance Benchmarks - Pack System');
    console.log('='.repeat(80) + '\n');

    const maxNameLength = Math.max(...Object.keys(this.results).map(k => k.length));

    console.log(
      'Operation'.padEnd(maxNameLength + 2) +
      'Mean'.padStart(10) +
      'Median'.padStart(10) +
      'P95'.padStart(10) +
      'P99'.padStart(10) +
      'Target'.padStart(10) +
      '  Status'
    );
    console.log('-'.repeat(80));

    let totalPass = 0;
    let totalFail = 0;

    for (const [name, stats] of Object.entries(this.results)) {
      const status = stats.pass ? '✓ PASS' : '✗ FAIL';
      const statusColor = stats.pass ? '' : '⚠️ ';

      console.log(
        name.padEnd(maxNameLength + 2) +
        `${stats.mean.toFixed(2)}ms`.padStart(10) +
        `${stats.median.toFixed(2)}ms`.padStart(10) +
        `${stats.p95.toFixed(2)}ms`.padStart(10) +
        `${stats.p99.toFixed(2)}ms`.padStart(10) +
        `${stats.target}ms`.padStart(10) +
        `  ${statusColor}${status}`
      );

      if (stats.pass) totalPass++;
      else totalFail++;
    }

    console.log('-'.repeat(80));
    console.log(`\nTotal: ${totalPass} passed, ${totalFail} failed`);

    if (totalFail > 0) {
      console.log('\n⚠️  Some benchmarks exceeded performance targets!\n');
    } else {
      console.log('\n✅ All benchmarks passed performance targets!\n');
    }

    // Show total runtime
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`Benchmarks completed in ${totalTime}s\n`);

    return totalFail === 0;
  }

  /**
   * Save results to file
   */
  async saveResults() {
    if (!existsSync(BENCHMARKS_DIR)) {
      await mkdir(BENCHMARKS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const filename = join(BENCHMARKS_DIR, `benchmark-phase4-${Date.now()}.json`);

    const data = {
      phase: 4,
      name: 'Pack System',
      timestamp,
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF || 'local',
      results: this.results,
    };

    await writeFile(filename, JSON.stringify(data, null, 2));

    // Update latest for phase 4
    await writeFile(
      join(BENCHMARKS_DIR, 'latest-phase4.json'),
      JSON.stringify(data, null, 2)
    );

    console.log(`Results saved to ${filename}`);
  }
}

// Mock implementations for benchmarking

class MockPackRegistry {
  constructor() {
    this.packs = new Map();
    this.licenses = new Map();
    this.categories = new Map();

    this.initializeData();
  }

  initializeData() {
    // Create license compatibility matrix
    this.licenses.set('MIT', { compatibleWith: ['Apache-2.0', 'BSD-3-Clause', 'ISC'] });
    this.licenses.set('Apache-2.0', { compatibleWith: ['MIT', 'BSD-3-Clause'] });
    this.licenses.set('GPL-3.0', { compatibleWith: ['GPL-3.0', 'AGPL-3.0'] });
    this.licenses.set('BSD-3-Clause', { compatibleWith: ['MIT', 'Apache-2.0', 'ISC'] });

    // Create pack categories
    const categories = ['authentication', 'ui-components', 'api-gateway', 'database', 'monitoring'];
    categories.forEach(cat => this.categories.set(cat, []));

    // Create sample packs
    const packs = [
      { name: 'auth-pack', version: '1.0.0', category: 'authentication', license: 'MIT', dependencies: [], tags: ['auth', 'security'] },
      { name: 'auth-pack', version: '1.1.0', category: 'authentication', license: 'MIT', dependencies: [], tags: ['auth', 'security'] },
      { name: 'auth-pack', version: '2.0.0', category: 'authentication', license: 'MIT', dependencies: ['crypto-pack@^1.0.0'], tags: ['auth', 'security'] },

      { name: 'ui-pack', version: '1.0.0', category: 'ui-components', license: 'MIT', dependencies: [], tags: ['ui', 'components'] },
      { name: 'ui-pack', version: '2.0.0', category: 'ui-components', license: 'MIT', dependencies: ['theme-pack@^1.0.0'], tags: ['ui', 'components'] },

      { name: 'api-gateway', version: '1.0.0', category: 'api-gateway', license: 'Apache-2.0', dependencies: ['auth-pack@^1.0.0'], tags: ['api', 'gateway'] },
      { name: 'api-gateway', version: '1.5.0', category: 'api-gateway', license: 'Apache-2.0', dependencies: ['auth-pack@^2.0.0', 'logging-pack@^1.0.0'], tags: ['api', 'gateway'] },

      { name: 'dashboard', version: '1.0.0', category: 'ui-components', license: 'MIT', dependencies: ['ui-pack@^1.0.0', 'api-gateway@^1.0.0'], tags: ['dashboard', 'ui'] },
      { name: 'dashboard', version: '1.2.0', category: 'ui-components', license: 'MIT', dependencies: ['ui-pack@^2.0.0', 'api-gateway@^1.5.0'], tags: ['dashboard', 'ui'] },

      { name: 'monitoring', version: '1.0.0', category: 'monitoring', license: 'BSD-3-Clause', dependencies: [], tags: ['monitoring', 'metrics'] },

      { name: 'crypto-pack', version: '1.0.0', category: 'security', license: 'GPL-3.0', dependencies: [], tags: ['crypto', 'security'] },
      { name: 'theme-pack', version: '1.0.0', category: 'ui-components', license: 'MIT', dependencies: [], tags: ['theme', 'ui'] },
      { name: 'logging-pack', version: '1.0.0', category: 'utilities', license: 'Apache-2.0', dependencies: [], tags: ['logging', 'utilities'] },
    ];

    packs.forEach(pack => {
      const key = `${pack.name}@${pack.version}`;
      this.packs.set(key, {
        ...pack,
        rating: 3 + Math.random() * 2,
        downloads: Math.floor(Math.random() * 10000),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      });

      const catPacks = this.categories.get(pack.category) || [];
      catPacks.push(key);
      this.categories.set(pack.category, catPacks);
    });
  }

  async queryPack(name, version) {
    const key = version ? `${name}@${version}` : null;

    if (key) {
      return this.packs.get(key);
    }

    // Return all versions
    const versions = [];
    for (const [k, pack] of this.packs) {
      if (pack.name === name) {
        versions.push(pack);
      }
    }
    return versions;
  }

  async addPack(pack) {
    const key = `${pack.name}@${pack.version}`;
    this.packs.set(key, {
      ...pack,
      rating: 0,
      downloads: 0,
      createdAt: new Date(),
    });
  }

  async updatePack(name, version, updates) {
    const key = `${name}@${version}`;
    const pack = this.packs.get(key);
    if (!pack) return null;

    Object.assign(pack, updates);
    return pack;
  }

  async removePack(name, version) {
    const key = `${name}@${version}`;
    return this.packs.delete(key);
  }

  async listPacks(category = null) {
    if (category) {
      const packKeys = this.categories.get(category) || [];
      return packKeys.map(key => this.packs.get(key));
    }

    return Array.from(this.packs.values());
  }

  async resolveVersion(name, versionConstraint) {
    // Simulate semver version resolution
    const versions = await this.queryPack(name);
    if (!versions || versions.length === 0) return null;

    // Simple version matching (in reality would use semver)
    const constraint = versionConstraint.replace(/[\^~>=<]/g, '');
    const matching = versions.filter(v => v.version >= constraint);

    return matching.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  async checkVersionCompatibility(name, version1, version2) {
    const pack1 = await this.queryPack(name, version1);
    const pack2 = await this.queryPack(name, version2);

    if (!pack1 || !pack2) return false;

    // Simple compatibility check
    const major1 = parseInt(version1.split('.')[0]);
    const major2 = parseInt(version2.split('.')[0]);

    return major1 === major2;
  }

  async getLatestVersion(name) {
    const versions = await this.queryPack(name);
    if (!versions || versions.length === 0) return null;

    return versions.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  async resolveDependencies(packName, packVersion) {
    const pack = await this.queryPack(packName, packVersion);
    if (!pack) return [];

    const resolved = [];
    const queue = [...pack.dependencies];
    const visited = new Set();

    while (queue.length > 0) {
      const dep = queue.shift();
      if (visited.has(dep)) continue;
      visited.add(dep);

      const [name, versionConstraint] = dep.split('@');
      const resolvedPack = await this.resolveVersion(name, versionConstraint);

      if (resolvedPack) {
        resolved.push(resolvedPack);
        queue.push(...resolvedPack.dependencies);
      }
    }

    return resolved;
  }

  async buildDependencyGraph(packName, packVersion) {
    const dependencies = await this.resolveDependencies(packName, packVersion);

    const graph = {
      nodes: [{ name: packName, version: packVersion }],
      edges: [],
    };

    for (const dep of dependencies) {
      graph.nodes.push({ name: dep.name, version: dep.version });
      graph.edges.push({
        from: packName,
        to: dep.name,
      });
    }

    return graph;
  }

  async detectDependencyConflicts(packs) {
    const conflicts = [];
    const versions = new Map();

    for (const pack of packs) {
      const existing = versions.get(pack.name);
      if (existing && existing !== pack.version) {
        const compatible = await this.checkVersionCompatibility(pack.name, existing, pack.version);
        if (!compatible) {
          conflicts.push({
            package: pack.name,
            version1: existing,
            version2: pack.version,
          });
        }
      } else {
        versions.set(pack.name, pack.version);
      }
    }

    return conflicts;
  }

  async checkCircularDependencies(packName, packVersion) {
    const visited = new Set();
    const stack = new Set();

    const dfs = async (name, version) => {
      const key = `${name}@${version}`;

      if (stack.has(key)) return true; // Circular dependency found
      if (visited.has(key)) return false;

      visited.add(key);
      stack.add(key);

      const pack = await this.queryPack(name, version);
      if (pack && pack.dependencies) {
        for (const dep of pack.dependencies) {
          const [depName, depVersion] = dep.split('@');
          const resolved = await this.resolveVersion(depName, depVersion);
          if (resolved && await dfs(resolved.name, resolved.version)) {
            return true;
          }
        }
      }

      stack.delete(key);
      return false;
    };

    return await dfs(packName, packVersion);
  }

  async federatedDiscovery(category, minRating = 0) {
    // Simulate federated query across multiple registries
    const localResults = await this.listPacks(category);

    // Simulate remote registry results
    const remoteResults = localResults.slice(0, 3).map(pack => ({
      ...pack,
      registry: 'remote',
      rating: pack.rating + 0.5,
    }));

    return [...localResults, ...remoteResults].filter(p => p.rating >= minRating);
  }

  async federatedVersionQuery(name) {
    // Simulate querying versions across registries
    const localVersions = await this.queryPack(name);
    return localVersions || [];
  }

  async federatedRatingQuery(minRating) {
    // Simulate rating query across registries
    return Array.from(this.packs.values()).filter(p => p.rating >= minRating);
  }

  async semanticSearch(query) {
    // Simulate semantic search using tags and descriptions
    const terms = query.toLowerCase().split(' ');
    const results = [];

    for (const pack of this.packs.values()) {
      let score = 0;

      for (const term of terms) {
        if (pack.name.toLowerCase().includes(term)) score += 3;
        if (pack.tags.some(tag => tag.toLowerCase().includes(term))) score += 2;
        if (pack.category.toLowerCase().includes(term)) score += 1;
      }

      if (score > 0) {
        results.push({ pack, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).map(r => r.pack);
  }

  async searchByCategory(category) {
    return await this.listPacks(category);
  }

  async searchByTag(tag) {
    const results = [];
    for (const pack of this.packs.values()) {
      if (pack.tags.includes(tag)) {
        results.push(pack);
      }
    }
    return results;
  }

  async fuzzySearch(query) {
    // Simulate fuzzy search
    const results = [];
    const queryLower = query.toLowerCase();

    for (const pack of this.packs.values()) {
      const nameLower = pack.name.toLowerCase();
      const distance = this.levenshteinDistance(queryLower, nameLower);

      if (distance <= 3) { // Allow up to 3 character difference
        results.push({ pack, distance });
      }
    }

    return results.sort((a, b) => a.distance - b.distance).map(r => r.pack);
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async checkLicenseCompatibility(license1, license2) {
    const lic1 = this.licenses.get(license1);
    const lic2 = this.licenses.get(license2);

    if (!lic1 || !lic2) return false;

    return lic1.compatibleWith.includes(license2);
  }

  async checkLicenseCompliance(packName, packVersion, projectLicense) {
    const pack = await this.queryPack(packName, packVersion);
    if (!pack) return false;

    return await this.checkLicenseCompatibility(pack.license, projectLicense);
  }

  async detectLicenseConflicts(packs, projectLicense) {
    const conflicts = [];

    for (const pack of packs) {
      const compatible = await this.checkLicenseCompatibility(pack.license, projectLicense);
      if (!compatible) {
        conflicts.push({
          pack: pack.name,
          version: pack.version,
          license: pack.license,
          projectLicense,
        });
      }
    }

    return conflicts;
  }

  async composePacks(packNames) {
    const composition = [];
    const allDependencies = new Set();

    for (const packName of packNames) {
      const latest = await this.getLatestVersion(packName);
      if (latest) {
        composition.push(latest);
        const deps = await this.resolveDependencies(latest.name, latest.version);
        deps.forEach(dep => allDependencies.add(`${dep.name}@${dep.version}`));
      }
    }

    // Check conflicts
    const conflicts = await this.detectDependencyConflicts([...composition, ...Array.from(allDependencies).map(key => {
      const [name, version] = key.split('@');
      return { name, version };
    })]);

    return {
      packs: composition,
      dependencies: Array.from(allDependencies),
      conflicts,
    };
  }

  async buildCompatibilityMatrix(packNames) {
    const matrix = {};

    for (const pack1 of packNames) {
      matrix[pack1] = {};
      for (const pack2 of packNames) {
        if (pack1 === pack2) {
          matrix[pack1][pack2] = true;
          continue;
        }

        // Check if packs can coexist
        const p1 = await this.getLatestVersion(pack1);
        const p2 = await this.getLatestVersion(pack2);

        if (p1 && p2) {
          const licenseCompat = await this.checkLicenseCompatibility(p1.license, p2.license);
          const noConflict = (await this.detectDependencyConflicts([p1, p2])).length === 0;
          matrix[pack1][pack2] = licenseCompat && noConflict;
        } else {
          matrix[pack1][pack2] = false;
        }
      }
    }

    return matrix;
  }

  async suggestPacks(category, constraints = {}) {
    const candidates = await this.listPacks(category);

    return candidates
      .filter(pack => {
        if (constraints.minRating && pack.rating < constraints.minRating) return false;
        if (constraints.license) {
          return this.checkLicenseCompatibility(pack.license, constraints.license);
        }
        return true;
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }
}

// Run benchmarks
async function main() {
  const runner = new BenchmarkRunner();
  const registry = new MockPackRegistry();

  console.log('Starting Phase 4 RDF Performance Benchmarks...\n');

  // Registry Operations
  await runner.benchmark('pack_query', async () => {
    await registry.queryPack('auth-pack', '1.0.0');
  });

  await runner.benchmark('pack_add', async () => {
    await registry.addPack({
      name: 'test-pack',
      version: '1.0.0',
      category: 'testing',
      license: 'MIT',
      dependencies: [],
      tags: ['test'],
    });
  });

  await runner.benchmark('pack_update', async () => {
    await registry.updatePack('auth-pack', '1.0.0', { rating: 4.5 });
  });

  await runner.benchmark('pack_remove', async () => {
    await registry.removePack('test-pack', '1.0.0');
  });

  await runner.benchmark('pack_list', async () => {
    await registry.listPacks('authentication');
  });

  // Version Operations
  await runner.benchmark('version_resolution', async () => {
    await registry.resolveVersion('auth-pack', '^1.0.0');
  });

  await runner.benchmark('version_compatibility_check', async () => {
    await registry.checkVersionCompatibility('auth-pack', '1.0.0', '1.1.0');
  });

  await runner.benchmark('version_latest_query', async () => {
    await registry.getLatestVersion('ui-pack');
  });

  // Dependency Operations
  await runner.benchmark('dependency_resolution', async () => {
    await registry.resolveDependencies('dashboard', '1.2.0');
  });

  await runner.benchmark('dependency_graph_build', async () => {
    await registry.buildDependencyGraph('api-gateway', '1.5.0');
  });

  await runner.benchmark('dependency_conflict_detection', async () => {
    const packs = [
      { name: 'auth-pack', version: '1.0.0' },
      { name: 'auth-pack', version: '2.0.0' },
    ];
    await registry.detectDependencyConflicts(packs);
  });

  await runner.benchmark('circular_dependency_check', async () => {
    await registry.checkCircularDependencies('dashboard', '1.0.0');
  });

  // Federated Operations
  await runner.benchmark('federated_pack_discovery', async () => {
    await registry.federatedDiscovery('ui-components', 4.0);
  });

  await runner.benchmark('federated_version_query', async () => {
    await registry.federatedVersionQuery('auth-pack');
  });

  await runner.benchmark('federated_rating_query', async () => {
    await registry.federatedRatingQuery(4.5);
  });

  // Search Operations
  await runner.benchmark('semantic_search', async () => {
    await registry.semanticSearch('authentication security');
  });

  await runner.benchmark('category_search', async () => {
    await registry.searchByCategory('ui-components');
  });

  await runner.benchmark('tag_search', async () => {
    await registry.searchByTag('security');
  });

  await runner.benchmark('fuzzy_search', async () => {
    await registry.fuzzySearch('auth-pak'); // Intentional typo
  });

  // License Operations
  await runner.benchmark('license_compatibility', async () => {
    await registry.checkLicenseCompatibility('MIT', 'Apache-2.0');
  });

  await runner.benchmark('license_compliance_check', async () => {
    await registry.checkLicenseCompliance('auth-pack', '1.0.0', 'MIT');
  });

  await runner.benchmark('license_conflict_detection', async () => {
    const packs = [
      { name: 'auth-pack', version: '2.0.0', license: 'MIT' },
      { name: 'crypto-pack', version: '1.0.0', license: 'GPL-3.0' },
    ];
    await registry.detectLicenseConflicts(packs, 'MIT');
  });

  // Composition Operations
  await runner.benchmark('pack_composition', async () => {
    await registry.composePacks(['auth-pack', 'ui-pack', 'api-gateway']);
  });

  await runner.benchmark('compatibility_matrix', async () => {
    await registry.buildCompatibilityMatrix(['auth-pack', 'ui-pack', 'monitoring']);
  });

  await runner.benchmark('auto_suggestion', async () => {
    await registry.suggestPacks('authentication', { minRating: 4.0, license: 'MIT' });
  });

  // N3 Rules (simulated)
  await runner.benchmark('n3_dependency_cycle_detection', async () => {
    // Simulate N3 rule for cycle detection
    for (const pack of registry.packs.values()) {
      await registry.checkCircularDependencies(pack.name, pack.version);
    }
  });

  await runner.benchmark('n3_version_constraint_validation', async () => {
    // Simulate N3 rule for version constraint validation
    for (const pack of registry.packs.values()) {
      for (const dep of pack.dependencies) {
        const [name, constraint] = dep.split('@');
        await registry.resolveVersion(name, constraint);
      }
    }
  });

  await runner.benchmark('n3_license_conflict_rule', async () => {
    // Simulate N3 rule for license conflict detection
    const allPacks = Array.from(registry.packs.values());
    await registry.detectLicenseConflicts(allPacks, 'MIT');
  });

  // Print and save results
  const success = runner.printResults();
  await runner.saveResults();

  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
