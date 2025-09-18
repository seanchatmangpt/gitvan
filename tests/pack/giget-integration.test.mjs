/**
 * GitVan Giget Integration Tests
 * 
 * Tests for remote pack installation and management using giget
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GigetPackManager, EnhancedPackManager } from '../../src/pack/giget-integration.mjs';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';

describe('Giget Pack Manager', () => {
  let packManager;
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `gitvan-giget-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    packManager = new GigetPackManager({
      cacheDir: join(testDir, 'cache'),
      installDir: join(testDir, 'packs'),
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Source Parsing', () => {
    it('should parse GitHub source strings', () => {
      const source = packManager.parseSourceString('github:unjs/template');
      expect(source).toEqual({
        provider: 'github',
        repo: 'unjs/template',
        ref: undefined,
        subdir: undefined,
      });
    });

    it('should parse GitHub source with branch', () => {
      const source = packManager.parseSourceString('github:unjs/template#dev');
      expect(source).toEqual({
        provider: 'github',
        repo: 'unjs/template',
        ref: 'dev',
        subdir: undefined,
      });
    });

    it('should parse GitHub source with subdirectory', () => {
      const source = packManager.parseSourceString('github:unjs/template/packages/core');
      expect(source).toEqual({
        provider: 'github',
        repo: 'unjs/template',
        ref: undefined,
        subdir: 'packages/core',
      });
    });

    it('should parse GitLab source strings', () => {
      const source = packManager.parseSourceString('gitlab:unjs/template');
      expect(source).toEqual({
        provider: 'gitlab',
        repo: 'unjs/template',
        ref: undefined,
        subdir: undefined,
      });
    });

    it('should parse Bitbucket source strings', () => {
      const source = packManager.parseSourceString('bitbucket:unjs/template');
      expect(source).toEqual({
        provider: 'bitbucket',
        repo: 'unjs/template',
        ref: undefined,
        subdir: undefined,
      });
    });

    it('should parse Sourcehut source strings', () => {
      const source = packManager.parseSourceString('sourcehut:pi0/unjs-template');
      expect(source).toEqual({
        provider: 'sourcehut',
        repo: 'pi0/unjs-template',
        ref: undefined,
        subdir: undefined,
      });
    });

    it('should throw error for invalid source format', () => {
      expect(() => {
        packManager.parseSourceString('invalid-format');
      }).toThrow('Invalid source format');
    });
  });

  describe('Pack ID Generation', () => {
    it('should generate pack ID from GitHub source', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: undefined,
        subdir: undefined,
      };
      const packId = packManager.generatePackId(source);
      expect(packId).toBe('unjs-template');
    });

    it('should generate pack ID with branch', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: 'dev',
        subdir: undefined,
      };
      const packId = packManager.generatePackId(source);
      expect(packId).toBe('unjs-template-dev');
    });

    it('should generate pack ID with subdirectory', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: undefined,
        subdir: 'packages/core',
      };
      const packId = packManager.generatePackId(source);
      expect(packId).toBe('unjs-template-packages-core');
    });

    it('should generate pack ID for non-GitHub providers', () => {
      const source = {
        provider: 'gitlab',
        repo: 'unjs/template',
        ref: undefined,
        subdir: undefined,
      };
      const packId = packManager.generatePackId(source);
      expect(packId).toBe('gitlab-unjs-template');
    });
  });

  describe('Giget Source Building', () => {
    it('should build basic giget source', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: undefined,
        subdir: undefined,
      };
      const gigetSource = packManager.buildGigetSource(source);
      expect(gigetSource).toBe('github:unjs/template');
    });

    it('should build giget source with branch', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: 'dev',
        subdir: undefined,
      };
      const gigetSource = packManager.buildGigetSource(source);
      expect(gigetSource).toBe('github:unjs/template#dev');
    });

    it('should build giget source with subdirectory', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: undefined,
        subdir: 'packages/core',
      };
      const gigetSource = packManager.buildGigetSource(source);
      expect(gigetSource).toBe('github:unjs/template/packages/core');
    });

    it('should build giget source with branch and subdirectory', () => {
      const source = {
        provider: 'github',
        repo: 'unjs/template',
        ref: 'dev',
        subdir: 'packages/core',
      };
      const gigetSource = packManager.buildGigetSource(source);
      expect(gigetSource).toBe('github:unjs/template#dev/packages/core');
    });
  });

  describe('Pack Validation', () => {
    it('should validate downloaded pack structure', async () => {
      // Create a mock pack directory
      const packDir = join(testDir, 'test-pack');
      mkdirSync(packDir, { recursive: true });

      // Create a valid pack.json
      const manifest = {
        id: 'test-pack',
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test pack',
        capabilities: ['test'],
      };
      writeFileSync(join(packDir, 'pack.json'), JSON.stringify(manifest, null, 2));

      const result = await packManager.validateDownloadedPack(packDir, 'test-pack');
      
      expect(result.valid).toBe(true);
      expect(result.manifest.id).toBe('test-pack');
      expect(result.manifest.source).toBe('remote');
      expect(result.manifest.remoteSource).toBeDefined();
    });

    it('should throw error for missing manifest', async () => {
      const packDir = join(testDir, 'invalid-pack');
      mkdirSync(packDir, { recursive: true });

      await expect(
        packManager.validateDownloadedPack(packDir, 'invalid-pack')
      ).rejects.toThrow('Pack manifest not found');
    });

    it('should throw error for invalid manifest', async () => {
      const packDir = join(testDir, 'invalid-pack');
      mkdirSync(packDir, { recursive: true });
      writeFileSync(join(packDir, 'pack.json'), 'invalid json');

      await expect(
        packManager.validateDownloadedPack(packDir, 'invalid-pack')
      ).rejects.toThrow('Invalid pack manifest');
    });
  });

  describe('Remote Pack Management', () => {
    it('should list remote packs', async () => {
      // Create mock remote packs
      const pack1Dir = join(packManager.options.installDir, 'pack-1');
      const pack2Dir = join(packManager.options.installDir, 'pack-2');
      
      mkdirSync(pack1Dir, { recursive: true });
      mkdirSync(pack2Dir, { recursive: true });

      const manifest1 = {
        id: 'pack-1',
        name: 'Pack 1',
        version: '1.0.0',
        source: 'remote',
        remoteSource: { provider: 'giget' },
      };
      const manifest2 = {
        id: 'pack-2',
        name: 'Pack 2',
        version: '2.0.0',
        source: 'remote',
        remoteSource: { provider: 'giget' },
      };

      writeFileSync(join(pack1Dir, 'pack.json'), JSON.stringify(manifest1, null, 2));
      writeFileSync(join(pack2Dir, 'pack.json'), JSON.stringify(manifest2, null, 2));

      const packs = await packManager.listRemotePacks();
      
      expect(packs).toHaveLength(2);
      expect(packs[0].id).toBe('pack-1');
      expect(packs[1].id).toBe('pack-2');
    });

    it('should return empty array for non-existent install directory', async () => {
      const nonExistentManager = new GigetPackManager({
        installDir: join(testDir, 'non-existent'),
      });

      const packs = await nonExistentManager.listRemotePacks();
      expect(packs).toEqual([]);
    });
  });

  describe('Source Detection', () => {
    it('should detect remote sources', () => {
      const enhancedManager = new EnhancedPackManager();
      
      expect(enhancedManager.isRemoteSource('github:owner/repo')).toBe(true);
      expect(enhancedManager.isRemoteSource('gitlab:owner/repo')).toBe(true);
      expect(enhancedManager.isRemoteSource('bitbucket:owner/repo')).toBe(true);
      expect(enhancedManager.isRemoteSource('sourcehut:owner/repo')).toBe(true);
      expect(enhancedManager.isRemoteSource('registry:pack-name')).toBe(true);
    });

    it('should detect local sources', () => {
      const enhancedManager = new EnhancedPackManager();
      
      expect(enhancedManager.isRemoteSource('local-pack')).toBe(false);
      expect(enhancedManager.isRemoteSource('builtin/pack')).toBe(false);
    });

    it('should detect remote sources from objects', () => {
      const enhancedManager = new EnhancedPackManager();
      
      expect(enhancedManager.isRemoteSource({ provider: 'github' })).toBe(true);
      expect(enhancedManager.isRemoteSource({ provider: 'local' })).toBe(false);
    });
  });
});

describe('Enhanced Pack Manager Integration', () => {
  let enhancedManager;
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `gitvan-enhanced-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    enhancedManager = new EnhancedPackManager({
      cacheDir: join(testDir, 'cache'),
      installDir: join(testDir, 'packs'),
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should initialize without errors', async () => {
    await expect(enhancedManager.initLocalManager()).resolves.not.toThrow();
  });

  it('should detect source types correctly', () => {
    expect(enhancedManager.isRemoteSource('github:owner/repo')).toBe(true);
    expect(enhancedManager.isRemoteSource('local-pack')).toBe(false);
  });
});
