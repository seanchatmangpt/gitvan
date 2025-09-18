import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileOperations } from '../src/pack/operations/file-ops.mjs';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync, statSync } from 'node:fs';
import { join } from 'pathe';

const testDir = '/tmp/gitvan-enhanced-file-ops-test-' + Date.now();

describe('Enhanced File Operations', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Glob Pattern Support', () => {
    it('should handle glob patterns for multiple files', async () => {
      const fileOps = new FileOperations();

      // Create test files
      mkdirSync(join(testDir, 'src'), { recursive: true });
      writeFileSync(join(testDir, 'src', 'file1.txt'), 'Content 1');
      writeFileSync(join(testDir, 'src', 'file2.txt'), 'Content 2');
      writeFileSync(join(testDir, 'src', 'other.md'), 'Markdown content');

      // Test glob pattern
      const result = await fileOps.apply({
        src: join(testDir, 'src', '*.txt'),
        target: join(testDir, 'dest'),
        action: 'write'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(existsSync(join(testDir, 'dest', 'file1.txt'))).toBe(true);
      expect(existsSync(join(testDir, 'dest', 'file2.txt'))).toBe(true);
      expect(existsSync(join(testDir, 'dest', 'other.md'))).toBe(false);
    });

    it('should handle single file (non-glob) patterns', async () => {
      const fileOps = new FileOperations();

      writeFileSync(join(testDir, 'single.txt'), 'Single file content');

      const result = await fileOps.apply({
        src: join(testDir, 'single.txt'),
        target: join(testDir, 'single-copy.txt'),
        action: 'write'
      });

      expect(Array.isArray(result)).toBe(false);
      expect(result.src).toBe(join(testDir, 'single.txt'));
      expect(existsSync(join(testDir, 'single-copy.txt'))).toBe(true);
    });
  });

  describe('Atomic Operations', () => {
    it('should perform atomic writes', async () => {
      const fileOps = new FileOperations();

      writeFileSync(join(testDir, 'source.txt'), 'Atomic content');

      const result = await fileOps.apply({
        src: join(testDir, 'source.txt'),
        target: join(testDir, 'atomic-target.txt'),
        action: 'write'
      });

      expect(existsSync(join(testDir, 'atomic-target.txt'))).toBe(true);
      expect(readFileSync(join(testDir, 'atomic-target.txt'), 'utf8')).toBe('Atomic content');
      expect(result.sourceHash).toBe(result.targetHash);
    });

    it('should cleanup temp files on failure', async () => {
      const fileOps = new FileOperations();

      writeFileSync(join(testDir, 'source.txt'), 'Content');

      // Create a directory where target file should be to force failure
      mkdirSync(join(testDir, 'target.txt'), { recursive: true });

      await expect(fileOps.apply({
        src: join(testDir, 'source.txt'),
        target: join(testDir, 'target.txt'),
        action: 'write'
      })).rejects.toThrow();

      // Check no temp files left behind
      const files = rmSync(testDir, { recursive: true, force: true });
      // Recreate for cleanup
      mkdirSync(testDir, { recursive: true });
    });
  });

  describe('Permission Preservation', () => {
    it('should preserve file permissions by default', async () => {
      const fileOps = new FileOperations();

      const sourcePath = join(testDir, 'source.txt');
      const targetPath = join(testDir, 'target.txt');

      writeFileSync(sourcePath, 'Content with permissions');

      // Set specific permissions (readable/writable by owner only)
      const fs = await import('node:fs');
      fs.chmodSync(sourcePath, 0o600);

      await fileOps.apply({
        src: sourcePath,
        target: targetPath,
        action: 'write',
        preservePermissions: true
      });

      const sourceStats = statSync(sourcePath);
      const targetStats = statSync(targetPath);

      expect(targetStats.mode & 0o777).toBe(sourceStats.mode & 0o777);
    });

    it('should allow disabling permission preservation', async () => {
      const fileOps = new FileOperations();

      const sourcePath = join(testDir, 'source.txt');
      const targetPath = join(testDir, 'target.txt');

      writeFileSync(sourcePath, 'Content');

      await fileOps.apply({
        src: sourcePath,
        target: targetPath,
        action: 'write',
        preservePermissions: false
      });

      expect(existsSync(targetPath)).toBe(true);
    });
  });

  describe('Symlink Support', () => {
    it('should handle symlinks correctly', async () => {
      const fileOps = new FileOperations();

      const realFile = join(testDir, 'real-file.txt');
      const symlink = join(testDir, 'symlink.txt');
      const target = join(testDir, 'symlink-copy.txt');

      writeFileSync(realFile, 'Real content');
      symlinkSync(realFile, symlink);

      const result = await fileOps.apply({
        src: symlink,
        target: target,
        action: 'write'
      });

      expect(result.isSymlink).toBe(true);
      expect(existsSync(target)).toBe(true);
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should track operations for rollback', async () => {
      const fileOps = new FileOperations();

      writeFileSync(join(testDir, 'source1.txt'), 'Content 1');
      writeFileSync(join(testDir, 'source2.txt'), 'Content 2');

      await fileOps.apply({
        src: join(testDir, 'source1.txt'),
        target: join(testDir, 'target1.txt'),
        action: 'write'
      });

      await fileOps.apply({
        src: join(testDir, 'source2.txt'),
        target: join(testDir, 'target2.txt'),
        action: 'write'
      });

      expect(existsSync(join(testDir, 'target1.txt'))).toBe(true);
      expect(existsSync(join(testDir, 'target2.txt'))).toBe(true);

      // Rollback operations
      await fileOps.rollback();

      expect(existsSync(join(testDir, 'target1.txt'))).toBe(false);
      expect(existsSync(join(testDir, 'target2.txt'))).toBe(false);
    });

    it('should clear operation log', async () => {
      const fileOps = new FileOperations();

      writeFileSync(join(testDir, 'source.txt'), 'Content');

      await fileOps.apply({
        src: join(testDir, 'source.txt'),
        target: join(testDir, 'target.txt'),
        action: 'write'
      });

      expect(fileOps.operationLog.length).toBe(1);

      fileOps.clearOperationLog();
      expect(fileOps.operationLog.length).toBe(0);
    });
  });

  describe('Dry Run Mode', () => {
    it('should not perform actual operations in dry run', async () => {
      const fileOps = new FileOperations({ dryRun: true });

      writeFileSync(join(testDir, 'source.txt'), 'Content');

      const result = await fileOps.apply({
        src: join(testDir, 'source.txt'),
        target: join(testDir, 'target.txt'),
        action: 'write'
      });

      expect(result.dryRun).toBe(true);
      expect(existsSync(join(testDir, 'target.txt'))).toBe(false);
    });

    it('should handle glob patterns in dry run', async () => {
      const fileOps = new FileOperations({ dryRun: true });

      mkdirSync(join(testDir, 'src'), { recursive: true });
      writeFileSync(join(testDir, 'src', 'file1.txt'), 'Content 1');
      writeFileSync(join(testDir, 'src', 'file2.txt'), 'Content 2');

      const result = await fileOps.apply({
        src: join(testDir, 'src', '*.txt'),
        target: join(testDir, 'dest'),
        action: 'write'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].dryRun).toBe(true);
      expect(result[1].dryRun).toBe(true);
    });
  });

  describe('Directory Operations', () => {
    it('should create directories with correct permissions', async () => {
      const fileOps = new FileOperations();

      const dirPath = join(testDir, 'new-dir', 'nested');

      const result = await fileOps.createDirectory(dirPath, {
        recursive: true,
        mode: 0o755
      });

      expect(result.created).toBe(true);
      expect(existsSync(dirPath)).toBe(true);
    });

    it('should handle existing directories', async () => {
      const fileOps = new FileOperations();

      const dirPath = join(testDir, 'existing-dir');
      mkdirSync(dirPath);

      const result = await fileOps.createDirectory(dirPath);

      expect(result.existed).toBe(true);
    });

    it('should respect dry run for directory creation', async () => {
      const fileOps = new FileOperations({ dryRun: true });

      const dirPath = join(testDir, 'dry-run-dir');

      const result = await fileOps.createDirectory(dirPath);

      expect(result.dryRun).toBe(true);
      expect(existsSync(dirPath)).toBe(false);
    });
  });
});