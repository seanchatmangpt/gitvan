import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'pathe';
import { existsSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { PackIdempotencyIntegration, createPackIdempotency } from '../../src/pack/idempotency/integration.mjs';

describe('PackIdempotencyIntegration', () => {
  let integration;
  let testDir;
  let testFile;

  beforeEach(() => {
    testDir = join(process.cwd(), '.test-integration');
    testFile = join(process.cwd(), 'test-pack-file.txt');

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }

    mkdirSync(testDir, { recursive: true });

    integration = new PackIdempotencyIntegration({
      stateDir: join(testDir, 'state'),
      backupDir: join(testDir, 'backups')
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });

  it('should track pack installations', async () => {
    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local',
      transforms: [],
      options: {}
    };

    const result = await integration.trackPackInstallation(packSpec, '/target/path');

    expect(result.shouldSkip).toBe(false);
    expect(result.fingerprint).toBeDefined();
    expect(result.operation.type).toBe('pack-install');
  });

  it('should skip duplicate installations', async () => {
    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local',
      transforms: [],
      options: {}
    };

    // First installation
    const result1 = await integration.trackPackInstallation(packSpec, '/target/path');
    expect(result1.shouldSkip).toBe(false);

    // Second installation (should skip)
    const result2 = await integration.trackPackInstallation(packSpec, '/target/path');
    expect(result2.shouldSkip).toBe(true);
    expect(result2.existing).toBeDefined();
  });

  it('should create pre-install snapshots', async () => {
    // Create test files
    writeFileSync(testFile, 'original content');
    const testFile2 = join(process.cwd(), 'test-pack-file2.txt');
    writeFileSync(testFile2, 'original content 2');

    const snapshots = await integration.createPreInstallSnapshots([testFile, testFile2]);

    expect(snapshots.size).toBe(2);
    expect(snapshots.has(testFile)).toBe(true);
    expect(snapshots.has(testFile2)).toBe(true);

    // Cleanup
    rmSync(testFile2);
  });

  it('should record pack installations with snapshots', async () => {
    writeFileSync(testFile, 'original content');

    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local'
    };

    const snapshots = await integration.createPreInstallSnapshots([testFile]);
    const artifacts = [
      {
        type: 'file',
        path: testFile,
        hash: 'abc123'
      }
    ];

    const receipt = await integration.recordPackInstallation(
      packSpec,
      'fingerprint123',
      artifacts,
      snapshots
    );

    expect(receipt.packId).toBe('test-pack');
    expect(receipt.version).toBe('1.0.0');
    expect(receipt.artifacts[0].snapshot).toBeDefined();
  });

  it('should check if packs are installed', async () => {
    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local'
    };

    expect(await integration.isPackInstalled('test-pack')).toBe(false);

    await integration.recordPackInstallation(packSpec, 'fingerprint123', [], new Map());

    expect(await integration.isPackInstalled('test-pack')).toBe(true);
    expect(await integration.isPackInstalled('test-pack', 'fingerprint123')).toBe(true);
    expect(await integration.isPackInstalled('test-pack', 'wrong-fingerprint')).toBe(false);
  });

  it('should create rollback plans', async () => {
    writeFileSync(testFile, 'original content');

    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local'
    };

    const artifacts = [
      {
        type: 'file',
        path: testFile,
        hash: 'abc123'
      }
    ];

    await integration.recordPackInstallation(packSpec, 'fingerprint123', artifacts, new Map());

    const plan = await integration.createPackRollbackPlan('test-pack');

    expect(plan.packId).toBe('test-pack');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('delete');
    expect(plan.steps[0].path).toBe(testFile);
  });

  it('should rollback pack installations', async () => {
    writeFileSync(testFile, 'original content');

    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local'
    };

    const artifacts = [
      {
        type: 'file',
        path: testFile,
        hash: 'abc123'
      }
    ];

    await integration.recordPackInstallation(packSpec, 'fingerprint123', artifacts, new Map());

    expect(existsSync(testFile)).toBe(true);
    expect(await integration.isPackInstalled('test-pack')).toBe(true);

    const results = await integration.rollbackPack('test-pack');

    expect(results.errors).toHaveLength(0);
    expect(results.success).toHaveLength(1);
    expect(existsSync(testFile)).toBe(false);
    expect(await integration.isPackInstalled('test-pack')).toBe(false);
  });

  it('should list installed packs', async () => {
    const packSpec1 = {
      id: 'test-pack-1',
      version: '1.0.0',
      source: 'local'
    };

    const packSpec2 = {
      id: 'test-pack-2',
      version: '2.0.0',
      source: 'remote'
    };

    await integration.recordPackInstallation(packSpec1, 'fingerprint1', [], new Map());
    await integration.recordPackInstallation(packSpec2, 'fingerprint2', [], new Map());

    const packs = integration.listInstalledPacks();

    expect(packs).toHaveLength(2);
    expect(packs.find(p => p.id === 'test-pack-1')).toBeDefined();
    expect(packs.find(p => p.id === 'test-pack-2')).toBeDefined();
  });

  it('should validate pack integrity', async () => {
    writeFileSync(testFile, 'original content');

    // Get the actual hash of the file
    const actualHash = await integration.system.rollback.hashFile(testFile);

    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local'
    };

    const artifacts = [
      {
        type: 'file',
        path: testFile,
        hash: actualHash
      }
    ];

    await integration.recordPackInstallation(packSpec, 'fingerprint123', artifacts, new Map());

    // Test valid state
    let validation = await integration.validatePackIntegrity('test-pack');
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);

    // Delete file and test invalid state
    rmSync(testFile);
    validation = await integration.validatePackIntegrity('test-pack');
    expect(validation.valid).toBe(false);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0]).toContain('Missing file');
  });

  it('should export and import state', async () => {
    const packSpec = {
      id: 'test-pack',
      version: '1.0.0',
      source: 'local'
    };

    await integration.recordPackInstallation(packSpec, 'fingerprint123', [], new Map());

    const exported = integration.exportState();
    expect(exported.packs['test-pack']).toBeDefined();

    // Create new integration and import state
    const newIntegration = new PackIdempotencyIntegration({
      stateDir: join(testDir, 'state2'),
      backupDir: join(testDir, 'backups2')
    });

    newIntegration.importState(exported);
    expect(await newIntegration.isPackInstalled('test-pack')).toBe(true);
  });
});

describe('createPackIdempotency', () => {
  it('should create PackIdempotencyIntegration instance', () => {
    const integration = createPackIdempotency();
    expect(integration).toBeInstanceOf(PackIdempotencyIntegration);
  });
});