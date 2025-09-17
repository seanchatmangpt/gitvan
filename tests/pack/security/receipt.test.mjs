import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { ReceiptManager } from '../../../src/pack/security/receipt.mjs';

describe('ReceiptManager', () => {
  let testDir;
  let receipts;
  let pack;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'gitvan-receipt-test-'));
    process.chdir(testDir);

    // Initialize git repo
    execSync('git init');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');

    // Create initial commit
    writeFileSync('README.md', '# Test Repository');
    execSync('git add README.md');
    execSync('git commit -m "Initial commit"');

    receipts = new ReceiptManager({
      receiptsRef: 'refs/notes/gitvan/test-receipts',
      gitvanVersion: '2.0.0-test'
    });

    pack = {
      manifest: {
        id: 'test-pack',
        version: '1.0.0',
        description: 'Test pack for receipt management'
      },
      fingerprint: 'abc123def456'
    };
  });

  afterEach(() => {
    process.chdir('/');
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('create', () => {
    it('should create a receipt with all required fields', async () => {
      const receipt = await receipts.create(pack, 'install', 'success', { duration: 1500 });

      expect(receipt.kind).toBe('pack-receipt');
      expect(receipt.id).toBe('test-pack');
      expect(receipt.version).toBe('1.0.0');
      expect(receipt.operation).toBe('install');
      expect(receipt.status).toBe('success');
      expect(receipt.timestamp).toBeTruthy();
      expect(receipt.commit).toBeTruthy();
      expect(receipt.worktree).toBe(testDir);
      expect(receipt.fingerprint).toBe('abc123def456');
      expect(receipt.details).toEqual({ duration: 1500 });
      expect(receipt.environment).toBeTruthy();
      expect(receipt.integrity.manifest).toBeTruthy();
      expect(receipt.integrity.receipt).toBeTruthy();
    });

    it('should capture environment information', async () => {
      const receipt = await receipts.create(pack, 'test', 'success');

      expect(receipt.environment.node).toBe(process.version);
      expect(receipt.environment.platform).toBe(process.platform);
      expect(receipt.environment.arch).toBe(process.arch);
      expect(receipt.environment.gitvan).toBe('2.0.0-test');
      expect(receipt.environment.user).toBeTruthy();
      expect(receipt.environment.ci).toBe(process.env.CI === 'true');
      expect(receipt.environment.timestamp_utc).toBeTruthy();
      expect(receipt.environment.pwd).toBe(testDir);
    });

    it('should create fingerprint if not provided', async () => {
      const packWithoutFingerprint = {
        manifest: pack.manifest
      };

      const receipt = await receipts.create(packWithoutFingerprint, 'test', 'success');

      expect(receipt.fingerprint).toBeTruthy();
      expect(receipt.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('write and read', () => {
    let receipt;

    beforeEach(async () => {
      receipt = await receipts.create(pack, 'install', 'success');
    });

    it('should write and read receipt from Git notes', async () => {
      const writeResult = await receipts.write(receipt);

      expect(writeResult.ref).toBe('refs/notes/gitvan/test-receipts');
      expect(writeResult.commit).toBeTruthy();

      const readReceipts = await receipts.read('test-pack');
      expect(readReceipts).toHaveLength(1);
      expect(readReceipts[0].id).toBe('test-pack');
      expect(readReceipts[0].operation).toBe('install');
      expect(readReceipts[0].status).toBe('success');
    });

    it('should read all receipts when no packId specified', async () => {
      await receipts.write(receipt);

      // Create another receipt for different pack
      const otherPack = {
        manifest: { id: 'other-pack', version: '1.0.0' },
        fingerprint: 'def456ghi789'
      };
      const otherReceipt = await receipts.create(otherPack, 'uninstall', 'success');
      await receipts.write(otherReceipt);

      const allReceipts = await receipts.read();
      expect(allReceipts.length).toBeGreaterThanOrEqual(2);

      const packIds = allReceipts.map(r => r.id);
      expect(packIds).toContain('test-pack');
      expect(packIds).toContain('other-pack');
    });

    it('should return latest receipt when requested', async () => {
      await receipts.write(receipt);

      // Create newer receipt
      const newerReceipt = await receipts.create(pack, 'update', 'success');
      await receipts.write(newerReceipt);

      const latest = await receipts.read('test-pack', { latest: true });
      expect(latest.operation).toBe('update');
      expect(new Date(latest.timestamp).getTime()).toBeGreaterThan(new Date(receipt.timestamp).getTime());
    });

    it('should return empty array when no receipts found', async () => {
      const receipts_result = await receipts.read('nonexistent-pack');
      expect(receipts_result).toEqual([]);
    });

    it('should return null for latest when no receipts found', async () => {
      const latest = await receipts.read('nonexistent-pack', { latest: true });
      expect(latest).toBeNull();
    });
  });

  describe('verify', () => {
    let receipt;

    beforeEach(async () => {
      receipt = await receipts.create(pack, 'install', 'success');
    });

    it('should verify valid receipt', async () => {
      const result = await receipts.verify(receipt);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.receipt).toBe(receipt);
    });

    it('should detect receipt integrity tampering', async () => {
      // Tamper with receipt integrity
      receipt.integrity.receipt = 'tampered-hash';

      const result = await receipts.verify(receipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Receipt integrity check failed');
    });

    it('should verify missing required fields', async () => {
      delete receipt.id;
      delete receipt.timestamp;

      const result = await receipts.verify(receipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required fields: id, timestamp');
    });

    it('should verify commit exists', async () => {
      receipt.commit = 'nonexistent-commit-hash';

      const result = await receipts.verify(receipt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Commit not found: nonexistent-commit-hash');
    });
  });

  describe('listByStatus', () => {
    beforeEach(async () => {
      // Create receipts with different statuses
      const successReceipt = await receipts.create(pack, 'install', 'success');
      await receipts.write(successReceipt);

      const failureReceipt = await receipts.create(pack, 'update', 'failure');
      await receipts.write(failureReceipt);

      const pendingReceipt = await receipts.create(pack, 'verify', 'pending');
      await receipts.write(pendingReceipt);
    });

    it('should filter receipts by status', async () => {
      const successReceipts = await receipts.listByStatus('success');
      const failureReceipts = await receipts.listByStatus('failure');
      const pendingReceipts = await receipts.listByStatus('pending');

      expect(successReceipts).toHaveLength(1);
      expect(successReceipts[0].operation).toBe('install');

      expect(failureReceipts).toHaveLength(1);
      expect(failureReceipts[0].operation).toBe('update');

      expect(pendingReceipts).toHaveLength(1);
      expect(pendingReceipts[0].operation).toBe('verify');
    });
  });

  describe('listByOperation', () => {
    beforeEach(async () => {
      // Create receipts with different operations
      const installReceipt = await receipts.create(pack, 'install', 'success');
      await receipts.write(installReceipt);

      const updateReceipt = await receipts.create(pack, 'update', 'success');
      await receipts.write(updateReceipt);

      const anotherInstallReceipt = await receipts.create(pack, 'install', 'failure');
      await receipts.write(anotherInstallReceipt);
    });

    it('should filter receipts by operation', async () => {
      const installReceipts = await receipts.listByOperation('install');
      const updateReceipts = await receipts.listByOperation('update');

      expect(installReceipts).toHaveLength(2);
      expect(updateReceipts).toHaveLength(1);
      expect(updateReceipts[0].operation).toBe('update');
    });
  });

  describe('getReceiptHistory', () => {
    beforeEach(async () => {
      // Create multiple receipts for the same pack
      const receipt1 = await receipts.create(pack, 'install', 'success');
      await receipts.write(receipt1);

      const receipt2 = await receipts.create(pack, 'update', 'success');
      await receipts.write(receipt2);

      const receipt3 = await receipts.create(pack, 'verify', 'failure');
      await receipts.write(receipt3);
    });

    it('should return chronological history', async () => {
      const history = await receipts.getReceiptHistory('test-pack');

      expect(history).toHaveLength(3);
      expect(history[0].operation).toBe('verify'); // Newest first
      expect(history[1].operation).toBe('update');
      expect(history[2].operation).toBe('install');

      // Check fields are present
      history.forEach(entry => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('operation');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('version');
        expect(entry).toHaveProperty('commit');
      });
    });
  });

  describe('exportReceipts', () => {
    beforeEach(async () => {
      const receipt1 = await receipts.create(pack, 'install', 'success');
      await receipts.write(receipt1);

      const pack2 = {
        manifest: { id: 'pack2', version: '2.0.0' },
        fingerprint: 'xyz789'
      };
      const receipt2 = await receipts.create(pack2, 'update', 'failure');
      await receipts.write(receipt2);
    });

    it('should export receipts as JSON', async () => {
      const json = await receipts.exportReceipts('json');
      const exported = JSON.parse(json);

      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThanOrEqual(2);
      expect(exported[0]).toHaveProperty('id');
      expect(exported[0]).toHaveProperty('operation');
      expect(exported[0]).toHaveProperty('status');
    });

    it('should export receipts as CSV', async () => {
      const csv = await receipts.exportReceipts('csv');
      const lines = csv.split('\n');

      expect(lines[0]).toBe('id,version,operation,status,timestamp,commit');
      expect(lines.length).toBeGreaterThan(2); // Header + at least 2 data rows
      expect(lines[1]).toContain('pack2'); // Newest first
    });

    it('should handle empty receipts for CSV', async () => {
      // Clear all receipts by reading from non-existent ref
      const emptyReceipts = new ReceiptManager({
        receiptsRef: 'refs/notes/gitvan/empty-receipts'
      });

      const csv = await emptyReceipts.exportReceipts('csv');
      expect(csv).toBe('');
    });

    it('should reject unsupported export formats', async () => {
      await expect(receipts.exportReceipts('xml')).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('hashObject', () => {
    it('should create consistent hashes', () => {
      const obj = { b: 2, a: 1 };
      const hash1 = receipts.hashObject(obj);
      const hash2 = receipts.hashObject(obj);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create different hashes for different objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };

      const hash1 = receipts.hashObject(obj1);
      const hash2 = receipts.hashObject(obj2);

      expect(hash1).not.toBe(hash2);
    });
  });
});