/**
 * GitVan v2 Version Management Tests
 * Comprehensive test suite for semver-based version management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  satisfiesConstraint,
  compareVersions,
  isGreaterThan,
  getLatestVersion,
  parseConstraint,
  areConstraintsCompatible,
  isValidVersion,
  cleanVersion,
  getVersionsMatching,
  isUpdateAvailable,
  getSuggestedUpdate
} from '../src/utils/version.mjs';

import { RegistryClient } from '../src/utils/registry.mjs';
import { PackManager } from '../src/pack/manager.mjs';
import { DependencyResolver } from '../src/pack/dependency/resolver.mjs';

describe('Version Utilities', () => {
  describe('satisfiesConstraint', () => {
    it('should handle caret constraints', () => {
      expect(satisfiesConstraint('1.2.3', '^1.0.0')).toBe(true);
      expect(satisfiesConstraint('1.9.9', '^1.0.0')).toBe(true);
      expect(satisfiesConstraint('2.0.0', '^1.0.0')).toBe(false);
      expect(satisfiesConstraint('0.9.9', '^1.0.0')).toBe(false);
    });

    it('should handle tilde constraints', () => {
      expect(satisfiesConstraint('1.2.3', '~1.2.0')).toBe(true);
      expect(satisfiesConstraint('1.2.9', '~1.2.0')).toBe(true);
      expect(satisfiesConstraint('1.3.0', '~1.2.0')).toBe(false);
      expect(satisfiesConstraint('2.0.0', '~1.2.0')).toBe(false);
    });

    it('should handle exact constraints', () => {
      expect(satisfiesConstraint('1.2.3', '1.2.3')).toBe(true);
      expect(satisfiesConstraint('1.2.4', '1.2.3')).toBe(false);
    });

    it('should handle range constraints', () => {
      expect(satisfiesConstraint('2.0.0', '>=1.0.0')).toBe(true);
      expect(satisfiesConstraint('0.9.0', '>=1.0.0')).toBe(false);
      expect(satisfiesConstraint('1.0.0', '>1.0.0')).toBe(false);
      expect(satisfiesConstraint('1.0.1', '>1.0.0')).toBe(true);
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should handle pre-release versions', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBe(1);
    });
  });

  describe('isGreaterThan', () => {
    it('should detect greater versions', () => {
      expect(isGreaterThan('2.0.0', '1.0.0')).toBe(true);
      expect(isGreaterThan('1.0.0', '2.0.0')).toBe(false);
      expect(isGreaterThan('1.0.0', '1.0.0')).toBe(false);
    });
  });

  describe('getLatestVersion', () => {
    it('should find the latest version', () => {
      const versions = ['1.0.0', '2.1.0', '2.0.0', '1.5.0'];
      expect(getLatestVersion(versions)).toBe('2.1.0');
    });

    it('should handle empty arrays', () => {
      expect(getLatestVersion([])).toBe(null);
    });
  });

  describe('parseConstraint', () => {
    it('should parse caret constraints', () => {
      const parsed = parseConstraint('^1.2.3');
      expect(parsed.operator).toBe('^');
      expect(parsed.version).toBe('1.2.3');
      expect(parsed.isCaret).toBe(true);
    });

    it('should parse tilde constraints', () => {
      const parsed = parseConstraint('~1.2.3');
      expect(parsed.operator).toBe('~');
      expect(parsed.version).toBe('1.2.3');
      expect(parsed.isTilde).toBe(true);
    });

    it('should parse exact constraints', () => {
      const parsed = parseConstraint('1.2.3');
      expect(parsed.operator).toBe('=');
      expect(parsed.version).toBe('1.2.3');
      expect(parsed.isExact).toBe(true);
    });
  });

  describe('areConstraintsCompatible', () => {
    it('should detect compatible constraints', () => {
      expect(areConstraintsCompatible('^1.0.0', '^1.2.0')).toBe(true);
      expect(areConstraintsCompatible('~1.2.0', '^1.0.0')).toBe(true);
    });

    it('should detect incompatible constraints', () => {
      expect(areConstraintsCompatible('^1.0.0', '^2.0.0')).toBe(false);
      expect(areConstraintsCompatible('~1.2.0', '~2.0.0')).toBe(false);
    });
  });

  describe('getVersionsMatching', () => {
    it('should filter versions by constraint', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
      const matching = getVersionsMatching(versions, '^1.0.0');
      expect(matching).toEqual(['1.2.0', '1.1.0', '1.0.0']);
    });
  });

  describe('isUpdateAvailable', () => {
    it('should detect available updates', () => {
      expect(isUpdateAvailable('1.0.0', '1.1.0')).toBe(true);
      expect(isUpdateAvailable('1.1.0', '1.0.0')).toBe(false);
      expect(isUpdateAvailable('1.0.0', '1.0.0')).toBe(false);
    });
  });
});

describe('RegistryClient', () => {
  let registry;

  beforeEach(() => {
    registry = new RegistryClient({ useMockData: true });
  });

  describe('fetchPackageInfo', () => {
    it('should return package info for known packages', async () => {
      const info = await registry.fetchPackageInfo('@gitvan/templates-web');
      expect(info).toBeTruthy();
      expect(info.id).toBe('@gitvan/templates-web');
      expect(info.latest).toBe('2.0.0');
      expect(Array.isArray(info.versions)).toBe(true);
    });

    it('should return null for unknown packages', async () => {
      const info = await registry.fetchPackageInfo('@unknown/package');
      expect(info).toBe(null);
    });
  });

  describe('getLatestVersion', () => {
    it('should return latest version for known packages', async () => {
      const version = await registry.getLatestVersion('@gitvan/templates-web');
      expect(version).toBe('2.0.0');
    });

    it('should return null for unknown packages', async () => {
      const version = await registry.getLatestVersion('@unknown/package');
      expect(version).toBe(null);
    });
  });

  describe('searchPackages', () => {
    it('should find packages by name', async () => {
      const results = await registry.searchPackages('templates');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id.includes('templates'))).toBe(true);
    });

    it('should find packages by description', async () => {
      const results = await registry.searchPackages('web development');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

describe('PackManager Version Checking', () => {
  let manager;

  beforeEach(() => {
    manager = new PackManager({
      registry: { useMockData: true }
    });
  });

  describe('getUpdateType', () => {
    it('should detect major updates', () => {
      expect(manager.getUpdateType('1.0.0', '2.0.0')).toBe('major');
    });

    it('should detect minor updates', () => {
      expect(manager.getUpdateType('1.0.0', '1.1.0')).toBe('minor');
    });

    it('should detect patch updates', () => {
      expect(manager.getUpdateType('1.0.0', '1.0.1')).toBe('patch');
    });

    it('should return none for no update', () => {
      expect(manager.getUpdateType('1.0.0', '1.0.0')).toBe('none');
    });
  });
});

describe('DependencyResolver Version Handling', () => {
  let resolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('checkVersionConstraint', () => {
    it('should use semver for constraint checking', () => {
      expect(resolver.checkVersionConstraint('1.2.3', '^1.0.0')).toBe(true);
      expect(resolver.checkVersionConstraint('2.0.0', '^1.0.0')).toBe(false);
      expect(resolver.checkVersionConstraint('1.2.3', '~1.2.0')).toBe(true);
      expect(resolver.checkVersionConstraint('1.3.0', '~1.2.0')).toBe(false);
    });
  });

  describe('findBestVersion', () => {
    it('should find the best matching version', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
      expect(resolver.findBestVersion(versions, '^1.0.0')).toBe('1.2.0');
      expect(resolver.findBestVersion(versions, '~1.1.0')).toBe('1.1.0');
      expect(resolver.findBestVersion(versions, '^2.0.0')).toBe('2.0.0');
    });

    it('should return null if no version matches', () => {
      const versions = ['1.0.0', '1.1.0'];
      expect(resolver.findBestVersion(versions, '^2.0.0')).toBe(null);
    });
  });

  describe('areConstraintsCompatible', () => {
    it('should check constraint compatibility', () => {
      expect(resolver.areConstraintsCompatible('^1.0.0', '^1.2.0')).toBe(true);
      expect(resolver.areConstraintsCompatible('^1.0.0', '^2.0.0')).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complex version resolution scenarios', async () => {
    const registry = new RegistryClient({ useMockData: true });

    // Add test packages with dependencies
    registry.addMockPackage('@test/package-a', {
      versions: ['1.0.0', '1.1.0', '2.0.0'],
      latest: '2.0.0',
      info: {
        description: 'Test package A',
        author: 'Test Author'
      }
    });

    registry.addMockPackage('@test/package-b', {
      versions: ['0.9.0', '1.0.0', '1.1.0'],
      latest: '1.1.0',
      info: {
        description: 'Test package B',
        author: 'Test Author'
      }
    });

    const latestA = await registry.getLatestVersion('@test/package-a');
    const latestB = await registry.getLatestVersion('@test/package-b');

    expect(latestA).toBe('2.0.0');
    expect(latestB).toBe('1.1.0');

    // Test version comparisons
    expect(isUpdateAvailable('1.0.0', latestA)).toBe(true);
    expect(satisfiesConstraint(latestB, '^1.0.0')).toBe(true);
  });
});