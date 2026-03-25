/**
 * @fileoverview Tests for KGN Configuration Module
 *
 * Test suite for the KGN engine configuration, factory, and caching utilities.
 *
 * @test {src/utils/kgn-config.mjs}
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createKgnEngine,
  getCachedKgnEngine,
  clearKgnEngineCache,
  getKgnCacheStats,
  validateKgnConfig,
  createTestKgnEnvironment,
  ensureKgnEngine,
  listAvailableFilters,
  getFilterCount,
  getFilterMap,
  getEngineStats,
  resetAllKgnConfigs,
  envKey
} from '../../src/utils/kgn-config.mjs';

describe('KGN Configuration Module', () => {
  afterEach(() => {
    clearKgnEngineCache();
  });

  describe('envKey', () => {
    it('generates consistent key for same config', () => {
      const config = { paths: ['/templates'], autoescape: true, enableCache: false };
      const key1 = envKey(config);
      const key2 = envKey(config);

      expect(key1).toBe(key2);
    });

    it('generates different keys for different configs', () => {
      const config1 = { paths: ['/templates'] };
      const config2 = { paths: ['/other'] };

      const key1 = envKey(config1);
      const key2 = envKey(config2);

      expect(key1).not.toBe(key2);
    });

    it('includes all configuration options', () => {
      const config = {
        paths: ['/test'],
        autoescape: true,
        enableCache: false,
        deterministicMode: true
      };

      const key = envKey(config);
      expect(key).toContain('/test');
      expect(key).toContain('true');
      expect(key).toContain('false');
    });
  });

  describe('createKgnEngine', () => {
    it('creates engine with default config', () => {
      const engine = createKgnEngine();

      expect(engine).toBeDefined();
      expect(engine.options.autoescape).toBe(false);
      expect(engine.options.enableCache).toBe(false);
      expect(engine.options.deterministicMode).toBe(false);
    });

    it('creates engine with custom config', () => {
      const config = {
        paths: ['/templates'],
        autoescape: true,
        enableCache: true,
        deterministicMode: true
      };

      const engine = createKgnEngine(config);

      expect(engine.options.paths).toEqual(['/templates']);
      expect(engine.options.autoescape).toBe(true);
      expect(engine.options.enableCache).toBe(true);
      expect(engine.options.deterministicMode).toBe(true);
    });

    it('created engine has filters', () => {
      const engine = createKgnEngine();
      const filters = engine.listFilters();

      expect(filters.length).toBeGreaterThan(20);
    });
  });

  describe('getCachedKgnEngine', () => {
    it('returns same instance for same config', () => {
      const config = { paths: ['/templates'] };

      const engine1 = getCachedKgnEngine(config);
      const engine2 = getCachedKgnEngine(config);

      expect(engine1).toBe(engine2);
    });

    it('returns different instances for different configs', () => {
      const config1 = { paths: ['/templates'] };
      const config2 = { paths: ['/other'] };

      const engine1 = getCachedKgnEngine(config1);
      const engine2 = getCachedKgnEngine(config2);

      expect(engine1).not.toBe(engine2);
    });

    it('caches engines correctly', () => {
      const config = { paths: ['/test'] };

      getCachedKgnEngine(config);
      const stats = getKgnCacheStats();

      expect(stats.cacheSize).toBeGreaterThan(0);
    });
  });

  describe('clearKgnEngineCache', () => {
    it('clears entire cache', () => {
      getCachedKgnEngine({ paths: ['/test1'] });
      getCachedKgnEngine({ paths: ['/test2'] });

      let stats = getKgnCacheStats();
      expect(stats.cacheSize).toBeGreaterThan(0);

      clearKgnEngineCache();

      stats = getKgnCacheStats();
      expect(stats.cacheSize).toBe(0);
    });

    it('clears specific cache key', () => {
      const config1 = { paths: ['/test1'] };
      const config2 = { paths: ['/test2'] };

      getCachedKgnEngine(config1);
      getCachedKgnEngine(config2);

      const key1 = envKey(config1);
      clearKgnEngineCache(key1);

      const stats = getKgnCacheStats();
      expect(stats.cacheSize).toBe(1);
    });
  });

  describe('getKgnCacheStats', () => {
    it('returns empty stats when cache is empty', () => {
      const stats = getKgnCacheStats();

      expect(stats.cacheSize).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    it('returns populated stats after caching', () => {
      const config = { paths: ['/templates'], enableCache: true };
      getCachedKgnEngine(config);

      const stats = getKgnCacheStats();

      expect(stats.cacheSize).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0]).toHaveProperty('config');
      expect(stats.entries[0]).toHaveProperty('engineStats');
    });

    it('cache stats include config details', () => {
      const config = { paths: ['/test'], autoescape: true };
      getCachedKgnEngine(config);

      const stats = getKgnCacheStats();
      const entry = stats.entries[0];

      expect(entry.config.paths).toEqual(['/test']);
      expect(entry.config.autoescape).toBe(true);
    });
  });

  describe('validateKgnConfig', () => {
    it('validates empty config', () => {
      const result = validateKgnConfig({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('validates correct config', () => {
      const config = {
        paths: ['/templates'],
        autoescape: true,
        enableCache: false,
        deterministicMode: true
      };

      const result = validateKgnConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects invalid paths type', () => {
      const config = { paths: 'not-an-array' };

      const result = validateKgnConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('paths must be an array');
    });

    it('rejects invalid boolean options', () => {
      const config = { autoescape: 'yes', enableCache: 123 };

      const result = validateKgnConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('must be a boolean');
    });

    it('collects multiple errors', () => {
      const config = {
        paths: 'invalid',
        autoescape: 'invalid',
        enableCache: 'invalid'
      };

      const result = validateKgnConfig(config);

      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createTestKgnEnvironment', () => {
    it('creates test environment with defaults', () => {
      const engine = createTestKgnEnvironment();

      expect(engine).toBeDefined();
      expect(engine.options.autoescape).toBe(false);
      expect(engine.options.enableCache).toBe(true);
      expect(engine.options.deterministicMode).toBe(true);
    });

    it('creates test environment with custom paths', () => {
      const paths = ['/test/templates'];
      const engine = createTestKgnEnvironment(paths);

      expect(engine.options.paths).toEqual(paths);
    });

    it('creates test environment with additional options', () => {
      const engine = createTestKgnEnvironment([], { autoescape: true });

      expect(engine.options.autoescape).toBe(true);
    });

    it('test environment has all filters', () => {
      const engine = createTestKgnEnvironment();
      const filters = engine.listFilters();

      expect(filters.length).toBeGreaterThan(20);
    });
  });

  describe('ensureKgnEngine', () => {
    it('creates engine with default directory', () => {
      const engine = ensureKgnEngine();

      expect(engine).toBeDefined();
      expect(engine.options.paths).toEqual([process.cwd()]);
    });

    it('creates engine with custom directory', () => {
      const engine = ensureKgnEngine('/custom/templates');

      expect(engine.options.paths).toEqual(['/custom/templates']);
    });

    it('creates cached engine', () => {
      const engine1 = ensureKgnEngine('/test');
      const engine2 = ensureKgnEngine('/test');

      expect(engine1).toBe(engine2);
    });

    it('accepts additional options', () => {
      const engine = ensureKgnEngine('/test', { autoescape: true });

      expect(engine.options.autoescape).toBe(true);
    });
  });

  describe('listAvailableFilters', () => {
    it('returns filter categories', () => {
      const filters = listAvailableFilters();

      expect(filters).toHaveProperty('caseConversion');
      expect(filters).toHaveProperty('string');
      expect(filters).toHaveProperty('array');
      expect(filters).toHaveProperty('type');
      expect(filters).toHaveProperty('utility');
      expect(filters).toHaveProperty('safety');
      expect(filters).toHaveProperty('inflection');
      expect(filters).toHaveProperty('gitvan');
    });

    it('each category contains filters', () => {
      const filters = listAvailableFilters();

      expect(Array.isArray(filters.caseConversion)).toBe(true);
      expect(filters.caseConversion.length).toBeGreaterThan(0);

      expect(Array.isArray(filters.string)).toBe(true);
      expect(filters.string.length).toBeGreaterThan(0);

      expect(Array.isArray(filters.inflection)).toBe(true);
      expect(filters.inflection.length).toBeGreaterThan(10);
    });

    it('contains expected filters', () => {
      const filters = listAvailableFilters();

      expect(filters.caseConversion).toContain('camelCase');
      expect(filters.caseConversion).toContain('pascalCase');
      expect(filters.string).toContain('upper');
      expect(filters.string).toContain('lower');
      expect(filters.safety).toContain('now');
      expect(filters.safety).toContain('random');
    });
  });

  describe('getFilterCount', () => {
    it('returns total filter count', () => {
      const count = getFilterCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(30);
    });

    it('count matches available filters', () => {
      const count = getFilterCount();
      const filters = listAvailableFilters();

      let total = 0;
      for (const category of Object.values(filters)) {
        total += category.length;
      }

      expect(count).toBe(total);
    });
  });

  describe('getFilterMap', () => {
    it('returns filter map object', () => {
      const filterMap = getFilterMap();

      expect(typeof filterMap).toBe('object');
      expect(filterMap).not.toBeNull();
    });

    it('filter map contains filters', () => {
      const filterMap = getFilterMap();

      expect(typeof filterMap.camelCase).toBe('function');
      expect(typeof filterMap.upper).toBe('function');
      expect(typeof filterMap.pluralize).toBe('function');
    });

    it('filter map has expected count', () => {
      const filterMap = getFilterMap();
      const keys = Object.keys(filterMap);

      expect(keys.length).toBeGreaterThan(30);
    });
  });

  describe('getEngineStats', () => {
    it('returns stats with no engines', () => {
      const stats = getEngineStats();

      expect(stats).toHaveProperty('totalEngines');
      expect(stats).toHaveProperty('totalFilters');
      expect(stats).toHaveProperty('engines');
      expect(stats.totalEngines).toBe(0);
      expect(Array.isArray(stats.engines)).toBe(true);
    });

    it('returns stats with cached engines', () => {
      getCachedKgnEngine({ paths: ['/test1'] });
      getCachedKgnEngine({ paths: ['/test2'] });

      const stats = getEngineStats();

      expect(stats.totalEngines).toBe(2);
      expect(stats.totalFilters).toBeGreaterThan(30);
      expect(stats.engines.length).toBe(2);
    });

    it('engine stats include config', () => {
      getCachedKgnEngine({ paths: ['/test'] });

      const stats = getEngineStats();

      expect(stats.engines[0]).toHaveProperty('config');
      expect(stats.engines[0]).toHaveProperty('cache');
      expect(stats.engines[0].config.paths).toEqual(['/test']);
    });
  });

  describe('resetAllKgnConfigs', () => {
    it('clears all engines', () => {
      getCachedKgnEngine({ paths: ['/test1'] });
      getCachedKgnEngine({ paths: ['/test2'] });

      resetAllKgnConfigs();

      const stats = getEngineStats();
      expect(stats.totalEngines).toBe(0);
    });

    it('subsequent calls create new engines', () => {
      const engine1 = getCachedKgnEngine({ paths: ['/test'] });

      resetAllKgnConfigs();

      const engine2 = getCachedKgnEngine({ paths: ['/test'] });

      expect(engine1).not.toBe(engine2);
    });
  });

  describe('Integration Tests', () => {
    it('workflow: create -> cache -> stats -> clear', () => {
      // Create engine
      const engine1 = createKgnEngine({ paths: ['/templates'] });
      expect(engine1).toBeDefined();

      // Get cached instance
      const engine2 = getCachedKgnEngine({ paths: ['/templates'] });
      expect(engine1).not.toBe(engine2); // Different reference because of config defaults

      // Get stats
      const stats = getEngineStats();
      expect(stats.totalEngines).toBeGreaterThan(0);

      // Clear cache
      clearKgnEngineCache();
      const emptyStats = getEngineStats();
      expect(emptyStats.totalEngines).toBe(0);
    });

    it('create test environment and use', () => {
      const engine = createTestKgnEnvironment(['/fixtures']);
      const filters = engine.listFilters();

      expect(filters.length).toBeGreaterThan(0);
      expect(engine.options.paths).toContain('/fixtures');
    });

    it('validate and create workflow', () => {
      const config = { paths: ['/templates'], autoescape: true };

      // Validate config
      const validation = validateKgnConfig(config);
      expect(validation.isValid).toBe(true);

      // Create engine
      const engine = getCachedKgnEngine(config);
      expect(engine).toBeDefined();
      expect(engine.options.paths).toEqual(['/templates']);
    });
  });

  describe('Configuration Defaults', () => {
    it('default paths is empty array', () => {
      const engine = createKgnEngine();
      expect(engine.options.paths).toEqual([]);
    });

    it('default autoescape is false', () => {
      const engine = createKgnEngine();
      expect(engine.options.autoescape).toBe(false);
    });

    it('default enableCache is false (per createKgnEngine)', () => {
      const engine = createKgnEngine();
      expect(engine.options.enableCache).toBe(false);
    });

    it('default deterministicMode is false (per createKgnEngine)', () => {
      const engine = createKgnEngine();
      expect(engine.options.deterministicMode).toBe(false);
    });
  });

  describe('Filter Organization', () => {
    it('all filters are properly categorized', () => {
      const filters = listAvailableFilters();

      for (const category of Object.values(filters)) {
        expect(Array.isArray(category)).toBe(true);
        expect(category.length).toBeGreaterThan(0);

        for (const filter of category) {
          expect(typeof filter).toBe('string');
          expect(filter.length).toBeGreaterThan(0);
        }
      }
    });

    it('no duplicate filters across categories', () => {
      const filters = listAvailableFilters();
      const allFilters = [];

      for (const category of Object.values(filters)) {
        allFilters.push(...category);
      }

      const unique = new Set(allFilters);
      expect(unique.size).toBe(allFilters.length);
    });
  });
});
