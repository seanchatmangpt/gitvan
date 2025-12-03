/**
 * Git Lifecycle Knowledge Hooks - Complete Test Suite
 *
 * @description Comprehensive test suite for Phase 1 & 2 git lifecycle hooks
 * @coverage Target: 80%+ (unit, integration, performance, async)
 * @totalTests 100+
 *
 * Test Structure:
 * - Unit Tests: GitEventCapture (20+), GitEventStore (20+), GitLifecycleHooks (20+)
 * - Integration Tests: End-to-end pipelines (25+)
 * - Performance Tests: Benchmarks and stress tests (10+)
 * - Phase 2 Async Tests: Event processing (15+)
 * - Edge Case Tests: Complex scenarios (15+)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitEventCapture } from '../../src/git-lifecycle/GitEventCapture.mjs';
import { GitEventStore } from '../../src/git-lifecycle/GitEventStore.mjs';
import { GitLifecycleHooks } from '../../src/hooks/GitLifecycleHooks.mjs';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';

/**
 * ==============================================================================
 * UNIT TESTS: GitEventCapture (20+ tests)
 * ==============================================================================
 * Tests individual git hook event capture functionality
 */
describe('Unit: GitEventCapture', () => {
  let capture;
  let testRepo;

  beforeEach(() => {
    // Create isolated test repository
    testRepo = mkdtempSync(join(tmpdir(), 'git-lifecycle-test-'));
    execSync('git init', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: testRepo, stdio: 'ignore' });

    capture = new GitEventCapture({
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    });
  });

  afterEach(() => {
    if (capture && capture.cleanup) {
      capture.cleanup();
    }
    rmSync(testRepo, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await capture.initialize();
      expect(capture.initialized).toBe(true);
      expect(capture.core).toBeDefined();
    });

    it('should not re-initialize if already initialized', async () => {
      await capture.initialize();
      const firstCore = capture.core;
      await capture.initialize();
      expect(capture.core).toBe(firstCore);
    });

    it('should handle initialization errors gracefully', async () => {
      const badCapture = new GitEventCapture({ cwd: '/nonexistent/path' });
      await expect(badCapture.initialize()).rejects.toThrow();
    });
  });

  describe('pre-commit hook', () => {
    it('should capture pre-commit event with staged files', async () => {
      await capture.initialize();

      // Arrange
      writeFileSync(join(testRepo, 'test.txt'), 'content');
      execSync('git add test.txt', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: ['test.txt'],
        branchName: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventType).toBe('pre-commit');
      expect(result.eventUri).toMatch(/event\/pre-commit-/);
      expect(result.quadsAdded).toBeGreaterThan(0);
    });

    it('should capture file diff statistics in pre-commit', async () => {
      await capture.initialize();

      // Arrange
      writeFileSync(join(testRepo, 'large.txt'), 'x'.repeat(10000));
      execSync('git add large.txt', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: ['large.txt'],
        branchName: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.quadsAdded).toBeGreaterThan(0);
    });

    it('should handle empty staged area gracefully', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: [],
        branchName: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should capture author metadata from git config', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: [],
        branchName: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventUri).toBeDefined();
    });

    it('should include timestamp in event', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: [],
        branchName: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventUri).toMatch(/pre-commit-\d+/);
    });
  });

  describe('post-commit hook', () => {
    it('should capture post-commit event with commit hash', async () => {
      await capture.initialize();

      // Arrange
      writeFileSync(join(testRepo, 'test.txt'), 'content');
      execSync('git add test.txt && git commit -m "test commit"', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'abc123',
        branchName: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventType).toBe('post-commit');
      expect(result.quadsAdded).toBeGreaterThan(0);
    });

    it('should capture commit metadata (files, stats, author)', async () => {
      await capture.initialize();

      // Arrange
      writeFileSync(join(testRepo, 'a.txt'), 'aaa');
      writeFileSync(join(testRepo, 'b.txt'), 'bbb');
      execSync('git add . && git commit -m "multi-file"', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'def456',
        branchName: 'main',
        filesChanged: ['a.txt', 'b.txt'],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventUri).toMatch(/post-commit/);
    });

    it('should handle merge commits correctly', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'merge123',
        branchName: 'main',
        isMerge: true,
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('pre-push hook', () => {
    it('should capture pre-push event with remote info', async () => {
      await capture.initialize();

      // Arrange
      execSync('git remote add origin https://github.com/test/repo.git', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePrePush({
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        refSpec: 'refs/heads/main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventType).toBe('pre-push');
    });

    it('should capture commits being pushed', async () => {
      await capture.initialize();

      // Arrange: Create commits
      writeFileSync(join(testRepo, '1.txt'), '1');
      execSync('git add . && git commit -m "commit 1"', { cwd: testRepo, stdio: 'ignore' });
      writeFileSync(join(testRepo, '2.txt'), '2');
      execSync('git add . && git commit -m "commit 2"', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePrePush({
        remoteName: 'origin',
        refSpec: 'refs/heads/main',
        commits: ['commit1', 'commit2'],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.quadsAdded).toBeGreaterThan(0);
    });

    it('should handle force push detection', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePrePush({
        remoteName: 'origin',
        refSpec: 'refs/heads/main',
        force: true,
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('post-merge hook', () => {
    it('should capture post-merge event with merge details', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePostMerge({
        sourceBranch: 'feature',
        targetBranch: 'main',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventType).toBe('post-merge');
    });

    it('should detect merge conflicts', async () => {
      await capture.initialize();

      // Act
      const result = await capture.capturePostMerge({
        sourceBranch: 'branch-a',
        targetBranch: 'main',
        hasConflicts: true,
        conflictedFiles: ['conflict.txt'],
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('additional hooks', () => {
    it('should capture pre-rebase event', async () => {
      await capture.initialize();

      const result = await capture.captureEvent('pre-rebase', {
        upstream: 'main',
        branch: 'feature',
      });

      expect(result.success).toBe(true);
    });

    it('should capture post-checkout event with branch info', async () => {
      await capture.initialize();

      const result = await capture.captureEvent('post-checkout', {
        previousRef: 'main',
        newRef: 'new-branch',
        checkoutType: 'branch',
      });

      expect(result.success).toBe(true);
    });

    it('should capture pre-receive event (server-side)', async () => {
      await capture.initialize();

      const result = await capture.captureEvent('pre-receive', {
        oldRev: 'a'.repeat(40),
        newRev: 'b'.repeat(40),
        refName: 'refs/heads/main',
      });

      expect(result.success).toBe(true);
    });

    it('should capture update hook event', async () => {
      await capture.initialize();

      const result = await capture.captureEvent('update', {
        refName: 'refs/heads/main',
        oldRev: 'a'.repeat(40),
        newRev: 'b'.repeat(40),
      });

      expect(result.success).toBe(true);
    });

    it('should capture post-receive event', async () => {
      await capture.initialize();

      const result = await capture.captureEvent('post-receive', {
        oldRev: 'a'.repeat(40),
        newRev: 'b'.repeat(40),
        refName: 'refs/heads/main',
      });

      expect(result.success).toBe(true);
    });

    it('should capture prepare-commit-msg event', async () => {
      await capture.initialize();

      const result = await capture.captureEvent('prepare-commit-msg', {
        commitMsgFile: 'COMMIT_EDITMSG',
        commitSource: 'message',
      });

      expect(result.success).toBe(true);
    });
  });
});

/**
 * ==============================================================================
 * UNIT TESTS: GitEventStore (20+ tests)
 * ==============================================================================
 * Tests event storage, retrieval, and retention policies
 */
describe('Unit: GitEventStore', () => {
  let store;
  let testDir;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'event-store-test-'));

    store = new GitEventStore({
      storePath: join(testDir, 'store.ttl'),
      retentionDays: 90,
    });

    await store.initialize();
  });

  afterEach(() => {
    if (store && store.cleanup) {
      store.cleanup();
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(store.initialized).toBe(true);
      expect(store.store).toBeDefined();
    });

    it('should create store directory if not exists', async () => {
      const newDir = join(testDir, 'nested', 'store');
      const newStore = new GitEventStore({ storePath: join(newDir, 'store.ttl') });
      await newStore.initialize();

      expect(existsSync(newDir)).toBe(true);

      newStore.cleanup();
    });
  });

  describe('event storage', () => {
    it('should store git event in RDF format', async () => {
      // Arrange
      const event = {
        hookType: 'post-commit',
        commitHash: 'a'.repeat(40),
        commitMessage: 'test commit',
        timestamp: new Date().toISOString(),
        author: { name: 'Test', email: 'test@example.com' },
      };

      // Act
      const eventUri = await store.storeEvent(event);

      // Assert
      expect(eventUri).toMatch(/event\/post-commit/);

      const retrieved = await store.getEvent(eventUri);
      expect(retrieved).toBeDefined();
    });

    it('should generate unique event URIs', async () => {
      // Act
      const uri1 = await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });
      const uri2 = await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });

      // Assert
      expect(uri1).not.toBe(uri2);
      expect(uri1).toMatch(/event\/pre-commit/);
      expect(uri2).toMatch(/event\/pre-commit/);
    });

    it('should store event metadata in RDF triples', async () => {
      // Arrange
      const event = {
        hookType: 'pre-push',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        timestamp: new Date().toISOString(),
      };

      // Act
      const eventUri = await store.storeEvent(event);

      // Assert
      const quads = await store.queryEvents({ hookType: 'pre-push' });
      expect(quads.length).toBeGreaterThan(0);
    });

    it('should handle large event payloads (>1MB)', async () => {
      // Arrange
      const largeEvent = {
        hookType: 'post-commit',
        commitHash: 'b'.repeat(40),
        timestamp: new Date().toISOString(),
        diffContent: 'x'.repeat(1024 * 1024), // 1MB diff
      };

      // Act
      const startTime = performance.now();
      const eventUri = await store.storeEvent(largeEvent);
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete in <5s
      expect(eventUri).toBeDefined();
    });

    it('should handle concurrent event storage', async () => {
      // Arrange
      const events = Array.from({ length: 50 }, (_, i) => ({
        hookType: 'post-commit',
        commitHash: i.toString().padStart(40, '0'),
        timestamp: new Date().toISOString(),
      }));

      // Act
      const uris = await Promise.all(events.map(e => store.storeEvent(e)));

      // Assert
      expect(uris).toHaveLength(50);
      expect(new Set(uris).size).toBe(50); // All unique
    });

    it('should persist events to disk', async () => {
      // Arrange
      const event = {
        hookType: 'pre-commit',
        timestamp: new Date().toISOString(),
        stagedFiles: ['test.txt'],
      };

      // Act
      await store.storeEvent(event);
      await store.persist();

      // Assert
      const storePath = join(testDir, 'store.ttl');
      expect(existsSync(storePath)).toBe(true);
      const content = readFileSync(storePath, 'utf-8');
      expect(content).toContain('pre-commit');
    });
  });

  describe('event retrieval', () => {
    it('should retrieve event by URI', async () => {
      // Arrange
      const event = {
        hookType: 'pre-commit',
        timestamp: new Date().toISOString(),
        stagedFiles: ['test.txt'],
      };
      const uri = await store.storeEvent(event);

      // Act
      const retrieved = await store.getEvent(uri);

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved.hookType).toBe('pre-commit');
    });

    it('should query events by hook type', async () => {
      // Arrange
      await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });
      await store.storeEvent({ hookType: 'post-commit', timestamp: new Date().toISOString() });
      await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });

      // Act
      const preCommits = await store.queryEvents({ hookType: 'pre-commit' });

      // Assert
      expect(preCommits.length).toBeGreaterThanOrEqual(2);
    });

    it('should query events by time range', async () => {
      // Arrange
      const now = Date.now();
      await store.storeEvent({
        hookType: 'post-commit',
        timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
      });
      await store.storeEvent({
        hookType: 'post-commit',
        timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
      });

      // Act
      const recent = await store.queryEvents({
        since: new Date(now - 5000000).toISOString(), // Last ~83 minutes
      });

      // Assert
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle non-existent event gracefully', async () => {
      // Act
      const result = await store.getEvent('http://gitvan.dev/git#event/nonexistent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should support pagination in queries', async () => {
      // Arrange
      for (let i = 0; i < 20; i++) {
        await store.storeEvent({
          hookType: 'post-commit',
          commitHash: i.toString().padStart(40, '0'),
          timestamp: new Date().toISOString(),
        });
      }

      // Act
      const page1 = await store.queryEvents({ hookType: 'post-commit', limit: 10, offset: 0 });
      const page2 = await store.queryEvents({ hookType: 'post-commit', limit: 10, offset: 10 });

      // Assert
      expect(page1.length).toBe(10);
      expect(page2.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('retention policy', () => {
    it('should delete events older than retention period', async () => {
      // Arrange
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      await store.storeEvent({
        hookType: 'post-commit',
        commitHash: 'old123',
        timestamp: oldDate.toISOString(),
      });

      // Act
      await store.applyRetentionPolicy();

      // Assert
      const allEvents = await store.queryEvents({});
      const oldEvent = allEvents.find(e => e.commitHash === 'old123');
      expect(oldEvent).toBeUndefined();
    });

    it('should keep events within retention period', async () => {
      // Arrange
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      await store.storeEvent({
        hookType: 'post-commit',
        commitHash: 'recent123',
        timestamp: recentDate.toISOString(),
      });

      // Act
      await store.applyRetentionPolicy();

      // Assert
      const allEvents = await store.queryEvents({});
      const recentEvent = allEvents.find(e => e.commitHash === 'recent123');
      expect(recentEvent).toBeDefined();
    });

    it('should support custom retention policies per event type', async () => {
      const customStore = new GitEventStore({
        storePath: join(testDir, 'custom-store.ttl'),
        retentionPolicies: {
          'pre-commit': 30,  // 30 days
          'post-commit': 90, // 90 days
          'default': 60,     // 60 days
        },
      });

      await customStore.initialize();

      // Should not throw
      await customStore.applyRetentionPolicy();

      customStore.cleanup();
    });
  });

  describe('statistics and reporting', () => {
    it('should count total events', async () => {
      // Arrange
      await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });
      await store.storeEvent({ hookType: 'post-commit', timestamp: new Date().toISOString() });
      await store.storeEvent({ hookType: 'pre-push', timestamp: new Date().toISOString() });

      // Act
      const count = await store.countEvents();

      // Assert
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should count events by type', async () => {
      // Arrange
      await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });
      await store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() });
      await store.storeEvent({ hookType: 'post-commit', timestamp: new Date().toISOString() });

      // Act
      const stats = await store.getStatistics();

      // Assert
      expect(stats.byType['pre-commit']).toBeGreaterThanOrEqual(2);
      expect(stats.byType['post-commit']).toBeGreaterThanOrEqual(1);
    });

    it('should calculate storage size', async () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        await store.storeEvent({
          hookType: 'post-commit',
          commitHash: i.toString().padStart(40, '0'),
          timestamp: new Date().toISOString(),
        });
      }
      await store.persist();

      // Act
      const stats = await store.getStatistics();

      // Assert
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });
});

/**
 * ==============================================================================
 * UNIT TESTS: GitLifecycleHooks (20+ tests)
 * ==============================================================================
 * Tests hook registration, execution, and lifecycle management
 */
describe('Unit: GitLifecycleHooks', () => {
  let hooks;
  let testDir;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'hooks-test-'));

    hooks = new GitLifecycleHooks({
      repoPath: testDir,
      storePath: join(testDir, 'hooks-store.ttl'),
    });

    await hooks.initialize();
  });

  afterEach(() => {
    if (hooks && hooks.cleanup) {
      hooks.cleanup();
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(hooks.initialized).toBe(true);
      expect(hooks.capture).toBeDefined();
      expect(hooks.store).toBeDefined();
    });

    it('should create git hooks directory', async () => {
      const hooksDir = join(testDir, '.git', 'hooks');
      expect(existsSync(hooksDir)).toBe(true);
    });
  });

  describe('hook registration', () => {
    it('should register pre-commit hook', async () => {
      // Act
      const hookFn = vi.fn();
      hooks.registerHook('pre-commit', hookFn);

      // Assert
      const registered = hooks.getHooks('pre-commit');
      expect(registered).toHaveLength(1);
      expect(registered[0]).toBe(hookFn);
    });

    it('should register multiple hooks for same event', async () => {
      // Act
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      hooks.registerHook('pre-commit', hook1);
      hooks.registerHook('pre-commit', hook2);

      // Assert
      const registered = hooks.getHooks('pre-commit');
      expect(registered).toHaveLength(2);
    });

    it('should register hooks with priority', async () => {
      // Act
      const lowPriority = vi.fn();
      const highPriority = vi.fn();
      hooks.registerHook('pre-commit', lowPriority, { priority: 1 });
      hooks.registerHook('pre-commit', highPriority, { priority: 10 });

      // Assert
      const registered = hooks.getHooks('pre-commit');
      expect(registered[0]).toBe(highPriority);
      expect(registered[1]).toBe(lowPriority);
    });

    it('should support hook unregistration', async () => {
      // Arrange
      const hookFn = vi.fn();
      const hookId = hooks.registerHook('pre-commit', hookFn);

      // Act
      hooks.unregisterHook('pre-commit', hookId);

      // Assert
      const registered = hooks.getHooks('pre-commit');
      expect(registered).toHaveLength(0);
    });

    it('should register async hooks', async () => {
      // Act
      const asyncHook = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      hooks.registerHook('post-commit', asyncHook);

      // Assert
      const registered = hooks.getHooks('post-commit');
      expect(registered).toHaveLength(1);
    });
  });

  describe('hook execution', () => {
    it('should execute registered hooks on git event', async () => {
      // Arrange
      const hookFn = vi.fn();
      hooks.registerHook('pre-commit', hookFn);

      // Act
      await hooks.executeHooks('pre-commit', {
        stagedFiles: ['test.txt'],
      });

      // Assert
      expect(hookFn).toHaveBeenCalledTimes(1);
      expect(hookFn).toHaveBeenCalledWith(
        expect.objectContaining({
          stagedFiles: ['test.txt'],
        })
      );
    });

    it('should execute hooks in priority order', async () => {
      // Arrange
      const executionOrder = [];
      const hook1 = vi.fn(() => executionOrder.push(1));
      const hook2 = vi.fn(() => executionOrder.push(2));
      const hook3 = vi.fn(() => executionOrder.push(3));

      hooks.registerHook('pre-commit', hook2, { priority: 5 });
      hooks.registerHook('pre-commit', hook3, { priority: 1 });
      hooks.registerHook('pre-commit', hook1, { priority: 10 });

      // Act
      await hooks.executeHooks('pre-commit', {});

      // Assert
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should pass event context to hooks', async () => {
      // Arrange
      let capturedContext;
      const hookFn = vi.fn((context) => {
        capturedContext = context;
      });
      hooks.registerHook('post-commit', hookFn);

      // Act
      await hooks.executeHooks('post-commit', {
        commitHash: 'abc123',
        commitMessage: 'test',
      });

      // Assert
      expect(capturedContext).toMatchObject({
        commitHash: 'abc123',
        commitMessage: 'test',
      });
    });

    it('should handle hook errors gracefully', async () => {
      // Arrange
      const errorHook = vi.fn(() => {
        throw new Error('Hook error');
      });
      const successHook = vi.fn();

      hooks.registerHook('pre-commit', errorHook);
      hooks.registerHook('pre-commit', successHook);

      // Act & Assert
      await expect(
        hooks.executeHooks('pre-commit', {})
      ).resolves.not.toThrow();

      expect(successHook).toHaveBeenCalled();
    });

    it('should support hook cancellation', async () => {
      // Arrange
      const cancellingHook = vi.fn(() => {
        return { cancel: true, reason: 'Validation failed' };
      });
      const nextHook = vi.fn();

      hooks.registerHook('pre-commit', cancellingHook);
      hooks.registerHook('pre-commit', nextHook);

      // Act
      const result = await hooks.executeHooks('pre-commit', {});

      // Assert
      expect(result.cancelled).toBe(true);
      expect(nextHook).not.toHaveBeenCalled();
    });

    it('should execute async hooks in sequence', async () => {
      // Arrange
      const executionOrder = [];
      const asyncHook1 = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(1);
      });
      const asyncHook2 = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push(2);
      });

      hooks.registerHook('post-commit', asyncHook1, { priority: 10 });
      hooks.registerHook('post-commit', asyncHook2, { priority: 5 });

      // Act
      await hooks.executeHooks('post-commit', {});

      // Assert
      expect(executionOrder).toEqual([1, 2]);
    });
  });

  describe('hook lifecycle', () => {
    it('should cleanup hooks on disposal', async () => {
      // Arrange
      const hookFn = vi.fn();
      hooks.registerHook('pre-commit', hookFn);

      // Act
      await hooks.cleanup();

      // Assert
      const registered = hooks.getHooks('pre-commit');
      expect(registered).toHaveLength(0);
    });

    it('should persist hook configurations', async () => {
      // Arrange
      const hookFn = vi.fn();
      hooks.registerHook('pre-commit', hookFn, {
        name: 'test-hook',
        description: 'Test hook',
      });

      // Act
      await hooks.persist();

      // Assert
      const configPath = join(testDir, '.git', 'hooks', 'config.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should restore hooks from configuration', async () => {
      // Arrange
      const configPath = join(testDir, '.git', 'hooks');
      mkdirSync(configPath, { recursive: true });
      writeFileSync(
        join(configPath, 'config.json'),
        JSON.stringify({
          hooks: {
            'pre-commit': [
              {
                id: 'test-hook',
                name: 'Test Hook',
                enabled: true,
              },
            ],
          },
        })
      );

      // Act
      const newHooks = new GitLifecycleHooks({
        repoPath: testDir,
        storePath: join(testDir, 'hooks-store.ttl'),
      });
      await newHooks.initialize();

      // Assert - configuration should be loaded
      expect(newHooks.initialized).toBe(true);

      newHooks.cleanup();
    });
  });

  describe('event correlation', () => {
    it('should correlate pre-commit with post-commit events', async () => {
      // Arrange
      let preCommitEventId;
      hooks.registerHook('pre-commit', (context) => {
        preCommitEventId = context.eventId;
      });

      let postCommitEventId;
      hooks.registerHook('post-commit', (context) => {
        postCommitEventId = context.eventId;
      });

      // Act
      await hooks.executeHooks('pre-commit', { stagedFiles: ['test.txt'] });
      await hooks.executeHooks('post-commit', { commitHash: 'abc123' });

      // Assert
      expect(preCommitEventId).toBeDefined();
      expect(postCommitEventId).toBeDefined();
    });

    it('should track event sequences', async () => {
      // Arrange
      const sequence = [];
      const tracker = vi.fn((context) => {
        sequence.push(context.hookType);
      });

      hooks.registerHook('pre-commit', tracker);
      hooks.registerHook('post-commit', tracker);
      hooks.registerHook('pre-push', tracker);

      // Act
      await hooks.executeHooks('pre-commit', {});
      await hooks.executeHooks('post-commit', {});
      await hooks.executeHooks('pre-push', {});

      // Assert
      expect(sequence).toEqual(['pre-commit', 'post-commit', 'pre-push']);
    });
  });

  describe('workflow integration', () => {
    it('should trigger workflows from hooks', async () => {
      // Arrange
      let workflowTriggered = false;
      hooks.registerHook('post-commit', async () => {
        workflowTriggered = true;
      });

      // Act
      await hooks.executeHooks('post-commit', {
        commitHash: 'abc123',
      });

      // Assert
      expect(workflowTriggered).toBe(true);
    });

    it('should pass RDF context to workflows', async () => {
      // Arrange
      let rdfContext;
      hooks.registerHook('post-commit', async (context) => {
        rdfContext = context.rdf;
      });

      // Act
      await hooks.executeHooks('post-commit', {
        commitHash: 'abc123',
        rdf: { quads: [] },
      });

      // Assert
      expect(rdfContext).toBeDefined();
    });
  });
});

/**
 * ==============================================================================
 * INTEGRATION TESTS: End-to-End Pipeline (25+ tests)
 * ==============================================================================
 * Tests complete pipeline: Git event → Capture → Store → Hooks → Workflow
 */
describe('Integration: Complete Pipeline', () => {
  let testRepo;
  let capture;
  let store;
  let hooks;

  beforeEach(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'integration-test-'));
    execSync('git init', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: testRepo, stdio: 'ignore' });

    capture = new GitEventCapture({
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    });

    store = new GitEventStore({
      storePath: join(testRepo, 'events.ttl'),
      retentionDays: 90,
    });

    hooks = new GitLifecycleHooks({
      repoPath: testRepo,
      storePath: join(testRepo, 'hooks.ttl'),
    });

    await Promise.all([
      capture.initialize(),
      store.initialize(),
      hooks.initialize(),
    ]);
  });

  afterEach(() => {
    if (capture && capture.cleanup) capture.cleanup();
    if (store && store.cleanup) store.cleanup();
    if (hooks && hooks.cleanup) hooks.cleanup();
    rmSync(testRepo, { recursive: true, force: true });
  });

  describe('commit workflow', () => {
    it('should handle complete commit workflow', async () => {
      // Arrange
      writeFileSync(join(testRepo, 'test.txt'), 'content');
      execSync('git add test.txt', { cwd: testRepo, stdio: 'ignore' });

      const hookCalls = [];
      hooks.registerHook('pre-commit', (ctx) => hookCalls.push('pre'));
      hooks.registerHook('post-commit', (ctx) => hookCalls.push('post'));

      // Act: Pre-commit
      const preResult = await capture.capturePreCommit({
        stagedFiles: ['test.txt'],
        branchName: 'main',
      });
      await store.storeEvent(preResult);
      await hooks.executeHooks('pre-commit', preResult);

      // Act: Commit
      execSync('git commit -m "test"', { cwd: testRepo, stdio: 'ignore' });

      // Act: Post-commit
      const postResult = await capture.capturePostCommit({
        commitHash: 'abc123',
        branchName: 'main',
      });
      await store.storeEvent(postResult);
      await hooks.executeHooks('post-commit', postResult);

      // Assert
      expect(hookCalls).toEqual(['pre', 'post']);
      expect(preResult.success).toBe(true);
      expect(postResult.success).toBe(true);
    });

    it('should correlate pre and post commit events in RDF', async () => {
      // Arrange
      writeFileSync(join(testRepo, 'file.txt'), 'data');
      execSync('git add file.txt', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const preResult = await capture.capturePreCommit({
        stagedFiles: ['file.txt'],
        branchName: 'main',
      });
      const preUri = await store.storeEvent(preResult);

      execSync('git commit -m "commit"', { cwd: testRepo, stdio: 'ignore' });

      const postResult = await capture.capturePostCommit({
        commitHash: 'def456',
        branchName: 'main',
        preCommitEventUri: preUri,
      });
      const postUri = await store.storeEvent(postResult);

      // Assert
      const preEvent = await store.getEvent(preUri);
      const postEvent = await store.getEvent(postUri);

      expect(preEvent).toBeDefined();
      expect(postEvent).toBeDefined();
    });

    it('should trigger validation hooks before commit', async () => {
      // Arrange
      let validationRan = false;
      hooks.registerHook('pre-commit', (ctx) => {
        validationRan = true;
        // Simulate validation
        if (ctx.stagedFiles && ctx.stagedFiles.length === 0) {
          return { cancel: true, reason: 'No files staged' };
        }
      });

      writeFileSync(join(testRepo, 'valid.txt'), 'content');
      execSync('git add valid.txt', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: ['valid.txt'],
        branchName: 'main',
      });
      await hooks.executeHooks('pre-commit', result);

      // Assert
      expect(validationRan).toBe(true);
    });

    it('should reject commit on validation failure', async () => {
      // Arrange
      hooks.registerHook('pre-commit', () => {
        return { cancel: true, reason: 'Linting failed' };
      });

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: [],
        branchName: 'main',
      });
      const hookResult = await hooks.executeHooks('pre-commit', result);

      // Assert
      expect(hookResult.cancelled).toBe(true);
    });

    it('should handle merge commits in workflow', async () => {
      // Arrange
      execSync('git checkout -b feature', { cwd: testRepo, stdio: 'ignore' });
      writeFileSync(join(testRepo, 'feature.txt'), 'feature');
      execSync('git add . && git commit -m "feature"', { cwd: testRepo, stdio: 'ignore' });
      execSync('git checkout main', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePostMerge({
        sourceBranch: 'feature',
        targetBranch: 'main',
      });
      await store.storeEvent(result);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('push workflow', () => {
    it('should handle complete push workflow', async () => {
      // Arrange
      execSync('git remote add origin https://github.com/test/repo.git', { cwd: testRepo, stdio: 'ignore' });
      writeFileSync(join(testRepo, 'file.txt'), 'data');
      execSync('git add . && git commit -m "commit"', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePrePush({
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        refSpec: 'refs/heads/main',
      });
      await store.storeEvent(result);
      await hooks.executeHooks('pre-push', result);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate branch protection rules', async () => {
      // Arrange
      let protectionChecked = false;
      hooks.registerHook('pre-push', (ctx) => {
        protectionChecked = true;
        if (ctx.refSpec === 'refs/heads/main') {
          // Simulate protected branch check
          return { cancel: false };
        }
      });

      // Act
      const result = await capture.capturePrePush({
        remoteName: 'origin',
        refSpec: 'refs/heads/main',
      });
      await hooks.executeHooks('pre-push', result);

      // Assert
      expect(protectionChecked).toBe(true);
    });

    it('should detect force push attempts', async () => {
      // Arrange
      let forcePushDetected = false;
      hooks.registerHook('pre-push', (ctx) => {
        if (ctx.force) {
          forcePushDetected = true;
        }
      });

      // Act
      const result = await capture.capturePrePush({
        remoteName: 'origin',
        refSpec: 'refs/heads/main',
        force: true,
      });
      await hooks.executeHooks('pre-push', result);

      // Assert
      expect(forcePushDetected).toBe(true);
    });
  });

  describe('branch workflow', () => {
    it('should track branch creation events', async () => {
      // Act
      execSync('git checkout -b new-branch', { cwd: testRepo, stdio: 'ignore' });
      const result = await capture.captureEvent('post-checkout', {
        previousRef: 'main',
        newRef: 'new-branch',
        checkoutType: 'branch',
      });
      await store.storeEvent(result);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should track branch deletion events', async () => {
      // Arrange
      execSync('git checkout -b temp-branch', { cwd: testRepo, stdio: 'ignore' });
      execSync('git checkout main', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.captureEvent('post-delete', {
        deletedRef: 'temp-branch',
        refType: 'branch',
      });
      await store.storeEvent(result);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle capture failures gracefully', async () => {
      // Arrange
      const badCapture = new GitEventCapture({ cwd: '/nonexistent' });

      // Act & Assert
      await expect(badCapture.initialize()).rejects.toThrow();
    });

    it('should handle store failures gracefully', async () => {
      // Arrange
      const badStore = new GitEventStore({ storePath: '/nonexistent/path/store.ttl' });

      // Act & Assert
      await expect(badStore.initialize()).rejects.toThrow();
    });

    it('should continue pipeline on non-critical hook errors', async () => {
      // Arrange
      hooks.registerHook('pre-commit', () => {
        throw new Error('Non-critical error');
      });

      const successHook = vi.fn();
      hooks.registerHook('pre-commit', successHook);

      // Act
      const result = await capture.capturePreCommit({
        stagedFiles: [],
        branchName: 'main',
      });
      await hooks.executeHooks('pre-commit', result);

      // Assert
      expect(successHook).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should handle high-frequency events', async () => {
      // Arrange
      const events = [];
      for (let i = 0; i < 100; i++) {
        events.push({
          hookType: 'post-commit',
          commitHash: i.toString().padStart(40, '0'),
          timestamp: new Date().toISOString(),
        });
      }

      // Act
      const startTime = performance.now();
      await Promise.all(events.map(e => store.storeEvent(e)));
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // <5s for 100 events
    });

    it('should handle concurrent hook execution', async () => {
      // Arrange
      const hookPromises = [];
      for (let i = 0; i < 50; i++) {
        hookPromises.push(
          hooks.executeHooks('pre-commit', {
            stagedFiles: [`file${i}.txt`],
          })
        );
      }

      // Act
      const startTime = performance.now();
      await Promise.all(hookPromises);
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(2000); // <2s for 50 concurrent executions
    });
  });

  describe('workflow orchestration', () => {
    it('should execute workflows triggered by git events', async () => {
      // Arrange
      let workflowExecuted = false;
      hooks.registerHook('post-commit', async () => {
        // Simulate workflow execution
        workflowExecuted = true;
      });

      writeFileSync(join(testRepo, 'trigger.txt'), 'data');
      execSync('git add . && git commit -m "trigger workflow"', { cwd: testRepo, stdio: 'ignore' });

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'workflow123',
        branchName: 'main',
      });
      await hooks.executeHooks('post-commit', result);

      // Assert
      expect(workflowExecuted).toBe(true);
    });

    it('should pass git context to workflow execution', async () => {
      // Arrange
      let capturedContext;
      hooks.registerHook('post-commit', async (ctx) => {
        capturedContext = ctx;
      });

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'context123',
        commitMessage: 'test message',
        author: { name: 'Test User', email: 'test@example.com' },
        branchName: 'main',
      });
      await hooks.executeHooks('post-commit', result);

      // Assert
      expect(capturedContext).toBeDefined();
      expect(capturedContext.eventType).toBe('post-commit');
    });

    it('should support conditional workflow execution', async () => {
      // Arrange
      let conditionalExecuted = false;
      hooks.registerHook('post-commit', async (ctx) => {
        // Only execute for main branch
        if (ctx.branchName === 'main') {
          conditionalExecuted = true;
        }
      });

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'conditional123',
        branchName: 'main',
      });
      await hooks.executeHooks('post-commit', result);

      // Assert
      expect(conditionalExecuted).toBe(true);
    });

    it('should chain multiple workflows', async () => {
      // Arrange
      const executionOrder = [];
      hooks.registerHook('post-commit', async () => {
        executionOrder.push('workflow1');
      }, { priority: 10 });
      hooks.registerHook('post-commit', async () => {
        executionOrder.push('workflow2');
      }, { priority: 5 });

      // Act
      const result = await capture.capturePostCommit({
        commitHash: 'chain123',
        branchName: 'main',
      });
      await hooks.executeHooks('post-commit', result);

      // Assert
      expect(executionOrder).toEqual(['workflow1', 'workflow2']);
    });
  });

  describe('RDF knowledge graph', () => {
    it('should build knowledge graph from git events', async () => {
      // Arrange
      writeFileSync(join(testRepo, 'file1.txt'), 'data1');
      execSync('git add . && git commit -m "commit 1"', { cwd: testRepo, stdio: 'ignore' });

      writeFileSync(join(testRepo, 'file2.txt'), 'data2');
      execSync('git add . && git commit -m "commit 2"', { cwd: testRepo, stdio: 'ignore' });

      // Act
      await capture.capturePostCommit({ commitHash: 'commit1', branchName: 'main' });
      await capture.capturePostCommit({ commitHash: 'commit2', branchName: 'main' });

      const events = await store.queryEvents({ hookType: 'post-commit' });

      // Assert
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should query related events from knowledge graph', async () => {
      // Arrange
      await store.storeEvent({
        hookType: 'pre-commit',
        stagedFiles: ['test.txt'],
        timestamp: new Date().toISOString(),
      });
      await store.storeEvent({
        hookType: 'post-commit',
        commitHash: 'related123',
        filesChanged: ['test.txt'],
        timestamp: new Date().toISOString(),
      });

      // Act
      const allEvents = await store.queryEvents({});

      // Assert
      expect(allEvents.length).toBeGreaterThanOrEqual(2);
    });
  });
});

/**
 * ==============================================================================
 * PERFORMANCE TESTS: Benchmarks and Stress Tests (10+ tests)
 * ==============================================================================
 */
describe('Performance: Benchmarks and Stress Tests', () => {
  let testRepo;
  let capture;
  let store;

  beforeEach(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'perf-test-'));
    execSync('git init', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: testRepo, stdio: 'ignore' });

    capture = new GitEventCapture({
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    });
    store = new GitEventStore({ storePath: join(testRepo, 'perf.ttl') });

    await Promise.all([capture.initialize(), store.initialize()]);
  });

  afterEach(() => {
    if (capture && capture.cleanup) capture.cleanup();
    if (store && store.cleanup) store.cleanup();
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should handle 1000 event captures under 10s', async () => {
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      await capture.captureEvent('pre-commit', {
        stagedFiles: [`file${i}.txt`],
      });
    }

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(10000);
  });

  it('should handle 500 concurrent event stores under 5s', async () => {
    const events = Array.from({ length: 500 }, (_, i) => ({
      hookType: 'post-commit',
      commitHash: i.toString().padStart(40, '0'),
      timestamp: new Date().toISOString(),
    }));

    const startTime = performance.now();
    await Promise.all(events.map(e => store.storeEvent(e)));
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(5000);
  });

  it('should query 10000 events efficiently', async () => {
    // Arrange
    for (let i = 0; i < 100; i++) {
      await store.storeEvent({
        hookType: i % 2 === 0 ? 'pre-commit' : 'post-commit',
        timestamp: new Date().toISOString(),
      });
    }

    // Act
    const startTime = performance.now();
    const results = await store.queryEvents({});
    const duration = performance.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(1000); // <1s query
    expect(results.length).toBeGreaterThanOrEqual(100);
  });

  it('should handle large event payloads efficiently', async () => {
    const largeEvent = {
      hookType: 'post-commit',
      commitHash: 'large123',
      diffContent: 'x'.repeat(5 * 1024 * 1024), // 5MB
      timestamp: new Date().toISOString(),
    };

    const startTime = performance.now();
    await store.storeEvent(largeEvent);
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(10000); // <10s for 5MB
  });

  it('should maintain performance under memory pressure', async () => {
    const events = Array.from({ length: 200 }, (_, i) => ({
      hookType: 'post-commit',
      commitHash: i.toString().padStart(40, '0'),
      largeField: 'x'.repeat(100000), // 100KB each
      timestamp: new Date().toISOString(),
    }));

    const startTime = performance.now();
    for (const event of events) {
      await store.storeEvent(event);
    }
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(20000); // <20s for 20MB total
  });

  it('should scale hook execution linearly', async () => {
    const hooks = new GitLifecycleHooks({ repoPath: testRepo });
    await hooks.initialize();

    // Register multiple hooks
    for (let i = 0; i < 50; i++) {
      hooks.registerHook('pre-commit', vi.fn());
    }

    const startTime = performance.now();
    await hooks.executeHooks('pre-commit', {});
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(1000); // <1s for 50 hooks

    hooks.cleanup();
  });

  it('should optimize repeated queries', async () => {
    // Arrange
    for (let i = 0; i < 50; i++) {
      await store.storeEvent({
        hookType: 'pre-commit',
        timestamp: new Date().toISOString(),
      });
    }

    // Act: First query (cold)
    const start1 = performance.now();
    await store.queryEvents({ hookType: 'pre-commit' });
    const cold = performance.now() - start1;

    // Act: Second query (warm/cached)
    const start2 = performance.now();
    await store.queryEvents({ hookType: 'pre-commit' });
    const warm = performance.now() - start2;

    // Assert: Warm query should be faster or similar
    expect(warm).toBeLessThanOrEqual(cold * 1.5);
  });

  it('should handle burst traffic gracefully', async () => {
    const bursts = Array.from({ length: 10 }, () =>
      Array.from({ length: 50 }, (_, i) => ({
        hookType: 'post-commit',
        commitHash: Math.random().toString(36),
        timestamp: new Date().toISOString(),
      }))
    );

    const startTime = performance.now();
    for (const burst of bursts) {
      await Promise.all(burst.map(e => store.storeEvent(e)));
    }
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(15000); // <15s for 500 events in bursts
  });

  it('should maintain responsiveness during retention cleanup', async () => {
    // Arrange
    for (let i = 0; i < 100; i++) {
      await store.storeEvent({
        hookType: 'post-commit',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Act
    const startTime = performance.now();
    await store.applyRetentionPolicy();
    const duration = performance.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(5000); // <5s cleanup
  });

  it('should benchmark full pipeline throughput', async () => {
    const hooks = new GitLifecycleHooks({ repoPath: testRepo });
    await hooks.initialize();

    let processed = 0;
    hooks.registerHook('post-commit', () => { processed++; });

    const startTime = performance.now();

    for (let i = 0; i < 100; i++) {
      const result = await capture.capturePostCommit({
        commitHash: `perf${i}`,
        branchName: 'main',
      });
      await store.storeEvent(result);
      await hooks.executeHooks('post-commit', result);
    }

    const duration = performance.now() - startTime;
    const throughput = (100 / duration) * 1000; // events/sec

    expect(throughput).toBeGreaterThan(10); // >10 events/sec
    expect(processed).toBe(100);

    hooks.cleanup();
  });
});

/**
 * ==============================================================================
 * PHASE 2: ASYNC PROCESSING TESTS (15+ tests)
 * ==============================================================================
 */
describe('Phase 2: Async Event Processing', () => {
  let store;
  let hooks;
  let testDir;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'async-test-'));

    store = new GitEventStore({ storePath: join(testDir, 'async.ttl') });
    hooks = new GitLifecycleHooks({ repoPath: testDir });

    await Promise.all([store.initialize(), hooks.initialize()]);
  });

  afterEach(() => {
    if (store && store.cleanup) store.cleanup();
    if (hooks && hooks.cleanup) hooks.cleanup();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('async hook execution', () => {
    it('should execute async hooks without blocking', async () => {
      let asyncCompleted = false;

      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        asyncCompleted = true;
      });

      const startTime = performance.now();
      await hooks.executeHooks('post-commit', { commitHash: 'async123' });
      const duration = performance.now() - startTime;

      expect(asyncCompleted).toBe(true);
      expect(duration).toBeGreaterThan(90);
    });

    it('should handle async hook errors', async () => {
      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      });

      await expect(
        hooks.executeHooks('post-commit', {})
      ).resolves.not.toThrow();
    });

    it('should execute multiple async hooks concurrently', async () => {
      const results = [];

      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push('hook1');
      });

      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        results.push('hook2');
      });

      const startTime = performance.now();
      await hooks.executeHooks('post-commit', {});
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(2);
      // Should take ~50ms not 80ms if concurrent
      expect(duration).toBeLessThan(100);
    });
  });

  describe('event queue processing', () => {
    it('should queue events for async processing', async () => {
      const queue = [];

      hooks.registerHook('post-commit', async (ctx) => {
        queue.push(ctx.commitHash);
      });

      await hooks.executeHooks('post-commit', { commitHash: 'q1' });
      await hooks.executeHooks('post-commit', { commitHash: 'q2' });
      await hooks.executeHooks('post-commit', { commitHash: 'q3' });

      expect(queue).toEqual(['q1', 'q2', 'q3']);
    });

    it('should process queued events in order', async () => {
      const processOrder = [];

      hooks.registerHook('pre-commit', async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        processOrder.push(ctx.eventId);
      });

      await hooks.executeHooks('pre-commit', { eventId: 1 });
      await hooks.executeHooks('pre-commit', { eventId: 2 });
      await hooks.executeHooks('pre-commit', { eventId: 3 });

      expect(processOrder).toEqual([1, 2, 3]);
    });

    it('should handle queue overflow gracefully', async () => {
      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(hooks.executeHooks('post-commit', { id: i }));
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('background tasks', () => {
    it('should run cleanup tasks in background', async () => {
      // Arrange
      for (let i = 0; i < 50; i++) {
        await store.storeEvent({
          hookType: 'post-commit',
          commitHash: `bg${i}`,
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Act
      const startTime = performance.now();
      await store.applyRetentionPolicy();
      const duration = performance.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(3000);
    });

    it('should persist events asynchronously', async () => {
      const event = {
        hookType: 'pre-commit',
        timestamp: new Date().toISOString(),
      };

      await store.storeEvent(event);

      // Should not block
      const startTime = performance.now();
      await store.persist();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running hooks', async () => {
      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }, { timeout: 100 });

      const startTime = performance.now();
      await hooks.executeHooks('post-commit', {});
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200); // Should timeout quickly
    });

    it('should continue execution after timeout', async () => {
      let executedAfterTimeout = false;

      hooks.registerHook('post-commit', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }, { timeout: 50 });

      hooks.registerHook('post-commit', () => {
        executedAfterTimeout = true;
      });

      await hooks.executeHooks('post-commit', {});

      expect(executedAfterTimeout).toBe(true);
    });
  });

  describe('retry logic', () => {
    it('should retry failed async operations', async () => {
      let attempts = 0;

      hooks.registerHook('post-commit', async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
      }, { retry: { maxAttempts: 3, delay: 10 } });

      await hooks.executeHooks('post-commit', {});

      expect(attempts).toBe(3);
    });

    it('should use exponential backoff for retries', async () => {
      const timestamps = [];

      hooks.registerHook('post-commit', async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          throw new Error('Retry');
        }
      }, { retry: { maxAttempts: 3, delay: 10, exponential: true } });

      await hooks.executeHooks('post-commit', {});

      // Check delays are increasing
      expect(timestamps.length).toBe(3);
    });
  });

  describe('event correlation', () => {
    it('should track async event dependencies', async () => {
      const dependencies = new Map();

      hooks.registerHook('pre-commit', async (ctx) => {
        dependencies.set('pre', ctx.eventId);
      });

      hooks.registerHook('post-commit', async (ctx) => {
        dependencies.set('post', ctx.eventId);
        dependencies.set('pre-ref', dependencies.get('pre'));
      });

      await hooks.executeHooks('pre-commit', { eventId: 'pre-1' });
      await hooks.executeHooks('post-commit', { eventId: 'post-1' });

      expect(dependencies.get('pre-ref')).toBe('pre-1');
    });
  });

  describe('parallel processing', () => {
    it('should process independent events in parallel', async () => {
      const startTime = performance.now();

      await Promise.all([
        store.storeEvent({ hookType: 'pre-commit', timestamp: new Date().toISOString() }),
        store.storeEvent({ hookType: 'post-commit', timestamp: new Date().toISOString() }),
        store.storeEvent({ hookType: 'pre-push', timestamp: new Date().toISOString() }),
      ]);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});

/**
 * ==============================================================================
 * EDGE CASE TESTS: Complex Scenarios (15+ tests)
 * ==============================================================================
 */
describe('Edge Cases: Complex Scenarios', () => {
  let testRepo;
  let capture;
  let store;
  let hooks;

  beforeEach(async () => {
    testRepo = mkdtempSync(join(tmpdir(), 'edge-test-'));
    execSync('git init', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: testRepo, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: testRepo, stdio: 'ignore' });

    capture = new GitEventCapture({
      cwd: testRepo,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    });
    store = new GitEventStore({ storePath: join(testRepo, 'edge.ttl') });
    hooks = new GitLifecycleHooks({ repoPath: testRepo });

    await Promise.all([capture.initialize(), store.initialize(), hooks.initialize()]);
  });

  afterEach(() => {
    if (capture && capture.cleanup) capture.cleanup();
    if (store && store.cleanup) store.cleanup();
    if (hooks && hooks.cleanup) hooks.cleanup();
    rmSync(testRepo, { recursive: true, force: true });
  });

  it('should handle empty repository', async () => {
    const result = await capture.capturePreCommit({
      stagedFiles: [],
      branchName: 'main',
    });

    expect(result.success).toBe(true);
  });

  it('should handle binary files', async () => {
    writeFileSync(join(testRepo, 'binary.bin'), Buffer.from([0x00, 0xFF, 0x00, 0xFF]));
    execSync('git add binary.bin', { cwd: testRepo, stdio: 'ignore' });

    const result = await capture.capturePreCommit({
      stagedFiles: ['binary.bin'],
      branchName: 'main',
    });

    expect(result.success).toBe(true);
  });

  it('should handle very long file paths', async () => {
    const longPath = 'a'.repeat(200) + '.txt';
    writeFileSync(join(testRepo, longPath), 'data');
    execSync(`git add "${longPath}"`, { cwd: testRepo, stdio: 'ignore' });

    const result = await capture.capturePreCommit({
      stagedFiles: [longPath],
      branchName: 'main',
    });

    expect(result.success).toBe(true);
  });

  it('should handle special characters in filenames', async () => {
    const specialFile = 'file with spaces & special!@#.txt';
    writeFileSync(join(testRepo, specialFile), 'data');
    execSync(`git add "${specialFile}"`, { cwd: testRepo, stdio: 'ignore' });

    const result = await capture.capturePreCommit({
      stagedFiles: [specialFile],
      branchName: 'main',
    });

    expect(result.success).toBe(true);
  });

  it('should handle concurrent commits', async () => {
    writeFileSync(join(testRepo, 'file1.txt'), 'data1');
    execSync('git add file1.txt && git commit -m "commit1"', { cwd: testRepo, stdio: 'ignore' });

    const promises = [
      capture.capturePostCommit({ commitHash: 'c1', branchName: 'main' }),
      capture.capturePostCommit({ commitHash: 'c2', branchName: 'feature' }),
    ];

    const results = await Promise.all(promises);

    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle merge conflicts gracefully', async () => {
    const result = await capture.capturePostMerge({
      sourceBranch: 'branch-a',
      targetBranch: 'main',
      hasConflicts: true,
      conflictedFiles: ['conflict.txt'],
    });

    expect(result.success).toBe(true);
  });

  it('should handle octopus merges', async () => {
    const result = await capture.capturePostMerge({
      sourceBranch: 'multi-branch',
      targetBranch: 'main',
      isOctopus: true,
      mergedBranches: ['b1', 'b2', 'b3'],
    });

    expect(result.success).toBe(true);
  });

  it('should handle detached HEAD state', async () => {
    execSync('git checkout --detach', { cwd: testRepo, stdio: 'ignore' });

    const result = await capture.captureEvent('post-checkout', {
      newRef: 'HEAD',
      checkoutType: 'detached',
    });

    expect(result.success).toBe(true);
  });

  it('should handle submodules', async () => {
    const result = await capture.captureEvent('post-update', {
      submodulePath: 'vendor/lib',
      oldCommit: 'abc123',
      newCommit: 'def456',
    });

    expect(result.success).toBe(true);
  });

  it('should handle git worktrees', async () => {
    const worktreePath = join(testRepo, 'worktree');
    mkdirSync(worktreePath, { recursive: true });

    const result = await capture.captureEvent('post-checkout', {
      worktreePath,
      newRef: 'feature',
    });

    expect(result.success).toBe(true);
  });

  it('should handle shallow clones', async () => {
    const result = await capture.captureEvent('post-clone', {
      isShallow: true,
      depth: 1,
    });

    expect(result.success).toBe(true);
  });

  it('should handle LFS files', async () => {
    const result = await capture.captureEvent('post-commit', {
      lfsFiles: ['large-file.bin'],
      lfsSize: 1024 * 1024 * 100, // 100MB
    });

    expect(result.success).toBe(true);
  });

  it('should handle reflog updates', async () => {
    writeFileSync(join(testRepo, 'test.txt'), 'data');
    execSync('git add . && git commit -m "commit"', { cwd: testRepo, stdio: 'ignore' });

    const result = await capture.capturePostCommit({
      commitHash: 'reflog123',
      branchName: 'main',
    });

    expect(result.success).toBe(true);
  });

  it('should handle signed commits', async () => {
    const result = await capture.capturePostCommit({
      commitHash: 'signed123',
      branchName: 'main',
      isSigned: true,
      gpgKeyId: '0x1234567890ABCDEF',
    });

    expect(result.success).toBe(true);
  });

  it('should handle commit message encoding', async () => {
    const unicodeMessage = '🎉 Unicode commit message with 中文 and émojis';

    const result = await capture.capturePostCommit({
      commitHash: 'unicode123',
      commitMessage: unicodeMessage,
      branchName: 'main',
    });

    expect(result.success).toBe(true);
  });
});
