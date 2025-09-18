import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'pathe';
import { existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createIdempotencySystem, IdempotencyTracker, RollbackManager, StateManager } from '../../src/pack/idempotency/index.mjs';

describe('IdempotencyTracker', () => {
  let tracker;
  let testDir;

  beforeEach(() => {
    testDir = join(process.cwd(), '.test-state');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    tracker = new IdempotencyTracker({ stateDir: testDir });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should generate consistent fingerprints', () => {
    const operation1 = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    const operation2 = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    const fingerprint1 = tracker.generateFingerprint(operation1);
    const fingerprint2 = tracker.generateFingerprint(operation2);

    expect(fingerprint1).toBe(fingerprint2);
    expect(fingerprint1).toHaveLength(16);
  });

  it('should track new operations', async () => {
    const operation = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    const result = await tracker.track(operation);

    expect(result.skip).toBe(false);
    expect(result.fingerprint).toBeDefined();
  });

  it('should skip duplicate operations', async () => {
    const operation = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    // First time
    const result1 = await tracker.track(operation);
    expect(result1.skip).toBe(false);

    // Second time
    const result2 = await tracker.track(operation);
    expect(result2.skip).toBe(true);
    expect(result2.existing).toBeDefined();
  });

  it('should update operation status', async () => {
    const operation = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    const result = await tracker.track(operation);
    await tracker.updateStatus(result.fingerprint, 'completed', { success: true });

    const record = await tracker.getOperation(result.fingerprint);
    expect(record.status).toBe('completed');
    expect(record.result.success).toBe(true);
  });
});

describe('RollbackManager', () => {
  let rollback;
  let testDir;
  let testFile;

  beforeEach(() => {
    testDir = join(process.cwd(), '.test-backups');
    testFile = join(process.cwd(), 'test-file.txt');

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }

    // Create test file
    writeFileSync(testFile, 'original content');

    rollback = new RollbackManager({ backupDir: testDir });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });

  it('should create snapshots', async () => {
    const snapshot = await rollback.createSnapshot(testFile);

    expect(snapshot).toBeDefined();
    expect(snapshot.snapshotId).toHaveLength(8);
    expect(snapshot.original).toBe(testFile);
    expect(existsSync(snapshot.path)).toBe(true);
  });

  it('should rollback files', async () => {
    // Create snapshot
    const snapshot = await rollback.createSnapshot(testFile);

    // Modify file
    writeFileSync(testFile, 'modified content');
    expect(readFileSync(testFile, 'utf8')).toBe('modified content');

    // Rollback
    const result = await rollback.rollback(snapshot.snapshotId);

    expect(result.restored).toBe(testFile);
    expect(readFileSync(testFile, 'utf8')).toBe('original content');
  });

  it('should reverse JSON merge transforms', async () => {
    const jsonFile = join(process.cwd(), 'test.json');
    writeFileSync(jsonFile, JSON.stringify({ a: 1, b: 2 }, null, 2));

    const transform = {
      kind: 'json-merge',
      spec: { c: 3, d: 4 }
    };

    // Apply transform manually
    const current = JSON.parse(readFileSync(jsonFile, 'utf8'));
    Object.assign(current, transform.spec);
    writeFileSync(jsonFile, JSON.stringify(current, null, 2));

    // Reverse transform
    const result = await rollback.reverseTransform(transform, jsonFile);
    expect(result).toBe(true);

    const final = JSON.parse(readFileSync(jsonFile, 'utf8'));
    expect(final).toEqual({ a: 1, b: 2 });

    rmSync(jsonFile);
  });

  it('should create rollback plans', async () => {
    const receipt = {
      id: 'test-pack',
      version: '1.0.0',
      artifacts: [
        {
          type: 'file',
          path: testFile,
          hash: 'abc123'
        }
      ]
    };

    const plan = await rollback.createRollbackPlan(receipt);

    expect(plan.packId).toBe('test-pack');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('delete');
    expect(plan.steps[0].path).toBe(testFile);
  });
});

describe('StateManager', () => {
  let state;
  let testDir;

  beforeEach(() => {
    testDir = join(process.cwd(), '.test-state');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    state = new StateManager({ stateDir: testDir });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should record pack installations', () => {
    state.recordPackInstallation('test-pack', '1.0.0', 'fingerprint123', []);

    const packState = state.getPackState('test-pack');
    expect(packState).toBeDefined();
    expect(packState.version).toBe('1.0.0');
    expect(packState.fingerprint).toBe('fingerprint123');
  });

  it('should check if pack is installed', () => {
    state.recordPackInstallation('test-pack', '1.0.0', 'fingerprint123', []);

    expect(state.isPackInstalled('test-pack')).toBe(true);
    expect(state.isPackInstalled('test-pack', 'fingerprint123')).toBe(true);
    expect(state.isPackInstalled('test-pack', 'wrong-fingerprint')).toBe(false);
    expect(state.isPackInstalled('non-existent')).toBe(false);
  });

  it('should record operations', () => {
    const operation = { type: 'install', target: 'test-pack' };
    state.recordOperation(operation);

    expect(state.state.operations).toHaveLength(1);
    expect(state.state.operations[0].type).toBe('install');
    expect(state.state.operations[0].timestamp).toBeDefined();
  });

  it('should persist state to disk', () => {
    state.recordPackInstallation('test-pack', '1.0.0', 'fingerprint123', []);

    // Create new instance to test persistence
    const newState = new StateManager({ stateDir: testDir });
    expect(newState.isPackInstalled('test-pack')).toBe(true);
  });

  it('should export and import state', () => {
    state.recordPackInstallation('test-pack', '1.0.0', 'fingerprint123', []);

    const exported = state.export();
    expect(exported.packs['test-pack']).toBeDefined();

    const newState = new StateManager({ stateDir: testDir + '-new' });
    newState.import(exported);

    expect(newState.isPackInstalled('test-pack')).toBe(true);
  });
});

describe('createIdempotencySystem', () => {
  let system;
  let testDir;

  beforeEach(() => {
    testDir = join(process.cwd(), '.test-system');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    system = createIdempotencySystem({
      stateDir: testDir,
      backupDir: join(testDir, 'backups')
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should provide unified interface', async () => {
    const operation = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    const result = await system.trackOperation(operation);
    expect(result.skip).toBe(false);

    await system.recordInstallation('test-pack', '1.0.0', result.fingerprint, []);
    expect(await system.isInstalled('test-pack')).toBe(true);
  });

  it('should handle cleanup', async () => {
    const operation = {
      type: 'install',
      target: 'test-pack',
      source: 'local',
      inputs: { version: '1.0.0' },
      version: '1.0.0'
    };

    await system.trackOperation(operation);

    // Should not throw
    await expect(system.cleanup(30)).resolves.toBeUndefined();
  });
});