import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PackRegistry } from '../src/pack/registry.mjs';
import { join } from 'pathe';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('PackRegistry Search & List', () => {
  let registry;
  let testDir;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create test packs
    await createTestPacks(testDir);

    // Initialize registry with test directory
    registry = new PackRegistry({
      cacheDir: join(testDir, 'cache'),
      localPacksDir: join(testDir, 'packs'),
      timeout: 5000
    });

    // Wait for initialization
    await registry.refreshIndex();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Search Functionality', () => {
    it('should search by pack name', async () => {
      const results = await registry.searchPacks('react');

      expect(results.total).toBeGreaterThan(0);
      expect(results.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('React')
          })
        ])
      );
    });

    it('should search by description', async () => {
      const results = await registry.searchPacks('web application');

      expect(results.total).toBeGreaterThan(0);
      expect(results.results.some(pack =>
        pack.description?.toLowerCase().includes('web application')
      )).toBe(true);
    });

    it('should search by tags', async () => {
      const results = await registry.searchPacks('frontend');

      expect(results.total).toBeGreaterThan(0);
      expect(results.results.some(pack =>
        pack.tags?.includes('frontend')
      )).toBe(true);
    });

    it('should search by capabilities', async () => {
      const results = await registry.searchPacks('scaffold');

      expect(results.total).toBeGreaterThan(0);
      expect(results.results.some(pack =>
        pack.capabilities?.includes('scaffold')
      )).toBe(true);
    });

    it('should handle fuzzy search', async () => {
      const results = await registry.searchPacks('reakt'); // Typo in "react"

      expect(results.total).toBeGreaterThan(0);
      expect(results.results.some(pack =>
        pack.name?.toLowerCase().includes('react')
      )).toBe(true);
    });

    it('should return empty results for non-existent terms', async () => {
      const results = await registry.searchPacks('nonexistentpackname123');

      expect(results.total).toBe(0);
      expect(results.results).toHaveLength(0);
    });

    it('should apply filters correctly', async () => {
      const results = await registry.searchPacks('', {
        tag: 'react',
        capability: 'scaffold'
      });

      expect(results.results.every(pack =>
        pack.tags?.includes('react') && pack.capabilities?.includes('scaffold')
      )).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await registry.searchPacks('', { limit: 2, offset: 0 });
      const page2 = await registry.searchPacks('', { limit: 2, offset: 2 });

      expect(page1.results).toHaveLength(2);
      expect(page2.results).toHaveLength(2);
      expect(page1.results[0].id).not.toBe(page2.results[0].id);
    });

    it('should include relevance scores', async () => {
      const results = await registry.searchPacks('react');

      expect(results.results.every(pack =>
        typeof pack.score === 'number' && pack.score >= 0 && pack.score <= 1
      )).toBe(true);
    });

    it('should generate search facets', async () => {
      const results = await registry.searchPacks('react');

      expect(results.facets).toBeDefined();
      expect(results.facets.sources).toBeDefined();
      expect(results.facets.tags).toBeDefined();
      expect(results.facets.capabilities).toBeDefined();
    });
  });

  describe('List Functionality', () => {
    it('should list all packs', async () => {
      const results = await registry.list();

      expect(results.total).toBeGreaterThan(0);
      expect(results.packs).toBeInstanceOf(Array);
      expect(results.packs.length).toBe(results.total);
    });

    it('should sort by name (default)', async () => {
      const results = await registry.list({ sortBy: 'name' });

      const names = results.packs.map(pack => pack.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort by lastModified', async () => {
      const results = await registry.list({
        sortBy: 'lastModified',
        sortOrder: 'desc'
      });

      // Check that we have results
      expect(results.packs.length).toBeGreaterThan(1);

      // Check that the sorting is applied (timestamps should be non-increasing)
      // Since packs can be created at the same millisecond, we check >= instead of >
      let isProperlyOrdered = true;
      for (let i = 0; i < results.packs.length - 1; i++) {
        const current = results.packs[i].lastModified || 0;
        const next = results.packs[i + 1].lastModified || 0;
        if (current < next) {
          isProperlyOrdered = false;
          break;
        }
      }
      expect(isProperlyOrdered).toBe(true);
    });

    it('should apply pagination', async () => {
      const page1 = await registry.list({ limit: 3, offset: 0 });
      const page2 = await registry.list({ limit: 3, offset: 3 });

      expect(page1.packs).toHaveLength(3);
      expect(page1.offset).toBe(0);
      expect(page2.offset).toBe(3);
    });

    it('should filter by source', async () => {
      const results = await registry.list({ source: 'local' });

      expect(results.packs.every(pack => pack.source === 'local')).toBe(true);
    });

    it('should provide sort options', async () => {
      const results = await registry.list();

      expect(results.sortOptions).toBeDefined();
      expect(results.sortOptions).toBeInstanceOf(Array);
      expect(results.sortOptions.some(opt => opt.value === 'name')).toBe(true);
    });

    it('should generate list facets', async () => {
      const results = await registry.list();

      expect(results.facets).toBeDefined();
      expect(results.facets.sources).toBeDefined();
      expect(typeof results.facets.sources).toBe('object');
    });
  });

  describe('Advanced Search Features', () => {
    it('should provide search suggestions', async () => {
      const suggestions = await registry.getSearchSuggestions('rea');

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.some(s => s.toLowerCase().includes('rea'))).toBe(true);
    });

    it('should parse advanced query filters', async () => {
      const results = await registry.advancedSearch('tag:react author:gitvan modern');

      expect(results.results.every(pack =>
        pack.tags?.includes('react') && pack.author === 'gitvan'
      )).toBe(true);
    });

    it('should provide search analytics', async () => {
      const analytics = registry.getSearchAnalytics();

      expect(analytics.indexSize).toBeGreaterThan(0);
      expect(analytics.fuseConfigured).toBe(true);
      expect(typeof analytics.indexAge).toBe('number');
    });

    it('should rebuild search index', async () => {
      const oldIndexSize = registry.getSearchAnalytics().indexSize;

      await registry.rebuildSearchIndex();

      const newAnalytics = registry.getSearchAnalytics();
      expect(newAnalytics.indexSize).toBe(oldIndexSize);
      expect(newAnalytics.fuseConfigured).toBe(true);
    });
  });

  describe('Legacy API Compatibility', () => {
    it('should support legacy search method', async () => {
      const results = await registry.search('react');

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      // Check that all required fields are present
      for (const pack of results) {
        expect(pack.id).toBeDefined();
        expect(pack.name).toBeDefined();
        expect(pack.version).toBeDefined();
      }
    });

    it('should include relevance scores in legacy format', async () => {
      const results = await registry.search('react');

      const hasRelevance = results.some(pack =>
        typeof pack.relevance === 'number'
      );
      expect(hasRelevance).toBe(true);
    });
  });
});

async function createTestPacks(testDir) {
  const packsDir = join(testDir, 'packs');
  mkdirSync(packsDir, { recursive: true });

  // Create React Starter Pack
  const reactPackDir = join(packsDir, 'react-starter');
  mkdirSync(reactPackDir, { recursive: true });
  writeFileSync(join(reactPackDir, 'pack.json'), JSON.stringify({
    id: 'react-starter',
    name: 'React Starter',
    version: '1.0.0',
    description: 'A modern React web application starter pack',
    tags: ['react', 'frontend', 'javascript'],
    capabilities: ['scaffold', 'development', 'build'],
    author: 'gitvan',
    license: 'MIT'
  }, null, 2));

  // Create Vue Pack
  const vuePackDir = join(packsDir, 'vue-minimal');
  mkdirSync(vuePackDir, { recursive: true });
  writeFileSync(join(vuePackDir, 'pack.json'), JSON.stringify({
    id: 'vue-minimal',
    name: 'Vue Minimal',
    version: '2.1.0',
    description: 'Minimal Vue.js application for quick prototyping',
    tags: ['vue', 'frontend', 'minimal'],
    capabilities: ['scaffold', 'development'],
    author: 'community',
    license: 'MIT'
  }, null, 2));

  // Create Node.js API Pack
  const nodePackDir = join(packsDir, 'node-api');
  mkdirSync(nodePackDir, { recursive: true });
  writeFileSync(join(nodePackDir, 'pack.json'), JSON.stringify({
    id: 'node-api',
    name: 'Node.js API',
    version: '1.5.0',
    description: 'RESTful API starter with Express.js and TypeScript',
    tags: ['nodejs', 'backend', 'api', 'typescript'],
    capabilities: ['scaffold', 'api', 'database'],
    author: 'gitvan',
    license: 'Apache-2.0'
  }, null, 2));

  // Create Documentation Pack
  const docsPackDir = join(packsDir, 'docs-site');
  mkdirSync(docsPackDir, { recursive: true });
  writeFileSync(join(docsPackDir, 'pack.json'), JSON.stringify({
    id: 'docs-site',
    name: 'Documentation Site',
    version: '1.0.0',
    description: 'Static documentation site generator with VitePress',
    tags: ['documentation', 'static', 'vitepress'],
    capabilities: ['scaffold', 'documentation', 'build'],
    author: 'community',
    license: 'MIT'
  }, null, 2));

  // Create Fullstack Pack
  const fullstackPackDir = join(packsDir, 'fullstack-app');
  mkdirSync(fullstackPackDir, { recursive: true });
  writeFileSync(join(fullstackPackDir, 'pack.json'), JSON.stringify({
    id: 'fullstack-app',
    name: 'Fullstack Application',
    version: '2.0.0',
    description: 'Complete fullstack web application with React and Node.js',
    tags: ['react', 'nodejs', 'fullstack', 'database'],
    capabilities: ['scaffold', 'development', 'api', 'frontend', 'backend'],
    author: 'gitvan',
    license: 'MIT'
  }, null, 2));
}