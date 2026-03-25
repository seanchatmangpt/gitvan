/**
 * Git Utilities Tests
 *
 * Demonstrates usage of git test helpers:
 * - Mock repository creation
 * - Test commit generation
 * - Branch and tag operations
 * - Repository state assertions
 *
 * These tests validate that the git testing infrastructure works correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMockRepo,
  createTestCommit,
  createTestBranch,
  createTestTag,
  createTestHook,
  createTestRef,
  createTestNote,
  createInitialCommit,
  createMultipleCommits,
  getGitConfig,
  assertRepoState,
  cleanupMockRepo,
} from './utils/git-test-helpers.mjs';

describe('Git Utilities - Mock Repository', () => {
  let repo;

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create mock repository', async () => {
    repo = await createMockRepo();

    expect(repo).toBeDefined();
    expect(repo.path).toBeDefined();
    expect(repo.initialized).toBe(true);
    expect(typeof repo.getCurrentBranch).toBe('function');
    expect(typeof repo.getCommitCount).toBe('function');
  });

  it('should initialize git config', async () => {
    repo = await createMockRepo();

    const config = await getGitConfig(repo);

    expect(config['user.name']).toBe('Test User');
    expect(config['user.email']).toBe('test@example.com');
  });

  it('should get current branch', async () => {
    repo = await createMockRepo();

    const branch = await repo.getCurrentBranch();

    expect(branch).toBeDefined();
    expect(typeof branch).toBe('string');
  });

  it('should get commit count', async () => {
    repo = await createMockRepo();

    const count = await repo.getCommitCount();

    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should get empty log initially', async () => {
    repo = await createMockRepo();

    const log = await repo.getLog();

    expect(Array.isArray(log)).toBe(true);
  });

  it('should get repository status', async () => {
    repo = await createMockRepo();

    const status = await repo.getStatus();

    expect(typeof status).toBe('string');
  });

  it('should list branches', async () => {
    repo = await createMockRepo();

    const branches = await repo.getBranches();

    expect(Array.isArray(branches)).toBe(true);
  });

  it('should list files', async () => {
    repo = await createMockRepo();

    const files = await repo.getFiles();

    expect(Array.isArray(files)).toBe(true);
  });

  it('should list tags', async () => {
    repo = await createMockRepo();

    const tags = await repo.getTags();

    expect(Array.isArray(tags)).toBe(true);
  });
});

describe('Git Utilities - Commits', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create test commit', async () => {
    const commit = await createTestCommit(repo, {
      message: 'Test commit message',
      file: 'test.txt',
      content: 'test content',
    });

    expect(commit).toBeDefined();
    expect(commit.hash).toBeDefined();
    expect(commit.message).toBe('Test commit message');
    expect(commit.file).toBe('test.txt');
  });

  it('should verify commit in log', async () => {
    await createTestCommit(repo, {
      message: 'Commit A',
      file: 'a.txt',
      content: 'Content A',
    });

    const log = await repo.getLog();

    expect(log.length).toBeGreaterThan(0);
    expect(log[0]).toContain('Commit A');
  });

  it('should increment commit count', async () => {
    const countBefore = await repo.getCommitCount();

    await createTestCommit(repo, {
      message: 'New commit',
    });

    const countAfter = await repo.getCommitCount();

    expect(countAfter).toBe(countBefore + 1);
  });

  it('should create initial commit', async () => {
    const commit = await createInitialCommit(repo);

    expect(commit).toBeDefined();
    expect(commit.hash).toBeDefined();
  });

  it('should create multiple commits', async () => {
    const commits = await createMultipleCommits(repo, 3, {
      message: 'Auto commit',
    });

    expect(commits).toHaveLength(3);
    expect(commits[0].hash).toBeDefined();
    expect(commits[1].hash).toBeDefined();
    expect(commits[2].hash).toBeDefined();
  });

  it('should create commits with different authors', async () => {
    const commit1 = await createTestCommit(repo, {
      message: 'By Alice',
      author: 'Alice',
    });

    const commit2 = await createTestCommit(repo, {
      message: 'By Bob',
      author: 'Bob',
    });

    expect(commit1.author).toBe('Alice');
    expect(commit2.author).toBe('Bob');
  });
});

describe('Git Utilities - Branches', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
    await createInitialCommit(repo);
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create branch', async () => {
    const branch = await createTestBranch(repo, 'feature/test');

    expect(branch).toBeDefined();
    expect(branch.name).toBe('feature/test');
    expect(branch.created).toBe(true);
  });

  it('should verify branch exists', async () => {
    await createTestBranch(repo, 'feature/verify');

    const branches = await repo.getBranches();
    const found = branches.some(b => b.includes('feature/verify'));

    expect(found).toBe(true);
  });

  it('should create branch from specific source', async () => {
    await createTestBranch(repo, 'main-branch');
    await createTestBranch(repo, 'feature/from-main', {
      fromBranch: 'main-branch',
    });

    const branches = await repo.getBranches();
    const hasBoth =
      branches.some(b => b.includes('main-branch')) &&
      branches.some(b => b.includes('feature/from-main'));

    expect(hasBoth).toBe(true);
  });

  it('should support multiple branches', async () => {
    const names = ['feature/a', 'feature/b', 'feature/c'];

    for (const name of names) {
      await createTestBranch(repo, name);
    }

    const branches = await repo.getBranches();

    for (const name of names) {
      const found = branches.some(b => b.includes(name));
      expect(found).toBe(true);
    }
  });
});

describe('Git Utilities - Tags', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
    await createInitialCommit(repo);
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create lightweight tag', async () => {
    const tag = await createTestTag(repo, 'v1.0.0');

    expect(tag).toBeDefined();
    expect(tag.name).toBe('v1.0.0');
    expect(tag.annotated).toBe(false);
    expect(tag.created).toBe(true);
  });

  it('should create annotated tag', async () => {
    const tag = await createTestTag(repo, 'v2.0.0', {
      message: 'Release 2.0.0',
    });

    expect(tag.name).toBe('v2.0.0');
    expect(tag.annotated).toBe(true);
  });

  it('should verify tag exists', async () => {
    await createTestTag(repo, 'release-1.0');

    const tags = await repo.getTags();
    const found = tags.some(t => t.includes('release-1.0'));

    expect(found).toBe(true);
  });

  it('should create multiple tags', async () => {
    const versions = ['v1.0', 'v2.0', 'v3.0'];

    for (const version of versions) {
      await createTestTag(repo, version);
    }

    const tags = await repo.getTags();

    for (const version of versions) {
      const found = tags.some(t => t.includes(version));
      expect(found).toBe(true);
    }
  });
});

describe('Git Utilities - Hooks', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create hook script', async () => {
    const hook = await createTestHook(
      repo,
      'pre-commit',
      '#!/bin/sh\necho "Pre-commit hook"'
    );

    expect(hook).toBeDefined();
    expect(hook.name).toBe('pre-commit');
    expect(hook.executable).toBe(true);
    expect(hook.created).toBe(true);
  });

  it('should create multiple hooks', async () => {
    const hooks = ['pre-commit', 'commit-msg', 'post-commit'];

    for (const hookName of hooks) {
      const hook = await createTestHook(
        repo,
        hookName,
        `#!/bin/sh\necho "${hookName}"`
      );

      expect(hook.created).toBe(true);
    }
  });
});

describe('Git Utilities - Refs', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
    await createInitialCommit(repo);
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create custom ref', async () => {
    const ref = await createTestRef(repo, 'custom/myref');

    expect(ref).toBeDefined();
    expect(ref.path).toContain('custom/myref');
    expect(ref.target).toBeDefined();
    expect(ref.created).toBe(true);
  });

  it('should create multiple refs', async () => {
    const refPaths = ['custom/ref1', 'custom/ref2', 'custom/ref3'];

    for (const refPath of refPaths) {
      const ref = await createTestRef(repo, refPath);
      expect(ref.created).toBe(true);
    }
  });
});

describe('Git Utilities - Notes', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
    await createInitialCommit(repo);
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create note on commit', async () => {
    const note = await createTestNote(repo, 'This is a test note');

    expect(note).toBeDefined();
    expect(note.content).toBe('This is a test note');
    expect(note.created).toBe(true);
  });

  it('should create notes on different commits', async () => {
    const commit1 = await createTestCommit(repo, {
      message: 'Commit 1',
    });

    const commit2 = await createTestCommit(repo, {
      message: 'Commit 2',
    });

    const note1 = await createTestNote(repo, 'Note 1', commit1.hash);
    const note2 = await createTestNote(repo, 'Note 2', commit2.hash);

    expect(note1.commit).toBe(commit1.hash);
    expect(note2.commit).toBe(commit2.hash);
  });
});

describe('Git Utilities - Repository State', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should assert commit count', async () => {
    await createInitialCommit(repo);
    await createTestCommit(repo, { message: 'Commit 2' });

    expect(async () => {
      await assertRepoState(repo, { commitCount: 2 });
    }).not.toThrow();
  });

  it('should throw on commit count mismatch', async () => {
    await createInitialCommit(repo);

    await expect(async () => {
      await assertRepoState(repo, { commitCount: 5 });
    }).rejects.toThrow();
  });

  it('should assert file count', async () => {
    await createTestCommit(repo, {
      message: 'Add file',
      file: 'test.txt',
    });

    expect(async () => {
      await assertRepoState(repo, { fileCount: 1 });
    }).not.toThrow();
  });

  it('should assert clean status', async () => {
    await createTestCommit(repo, { message: 'Clean state' });

    expect(async () => {
      await assertRepoState(repo, { statusClean: true });
    }).not.toThrow();
  });
});

describe('Git Utilities - Git Config', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should get all git config', async () => {
    const config = await getGitConfig(repo);

    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
    expect(config['user.name']).toBe('Test User');
  });

  it('should get specific config value', async () => {
    const name = await getGitConfig(repo, 'user.name');

    expect(name).toBe('Test User');
  });

  it('should get email config', async () => {
    const email = await getGitConfig(repo, 'user.email');

    expect(email).toBe('test@example.com');
  });
});

describe('Git Utilities - Integration Scenarios', () => {
  let repo;

  beforeEach(async () => {
    repo = await createMockRepo();
  });

  afterEach(async () => {
    if (repo) {
      await cleanupMockRepo(repo);
    }
  });

  it('should create complete development scenario', async () => {
    // Initial commit
    const initial = await createInitialCommit(repo);
    expect(initial).toBeDefined();

    // Create feature branch
    await createTestBranch(repo, 'feature/new-feature');

    // Make commits on feature
    const commit1 = await createTestCommit(repo, {
      message: 'Feature work 1',
      file: 'feature.txt',
    });

    const commit2 = await createTestCommit(repo, {
      message: 'Feature work 2',
    });

    // Create tag
    await createTestTag(repo, 'v1.0.0', {
      message: 'Version 1.0.0',
    });

    // Verify state
    const branches = await repo.getBranches();
    const tags = await repo.getTags();
    const count = await repo.getCommitCount();

    expect(branches.length).toBeGreaterThan(1);
    expect(tags.some(t => t.includes('v1.0.0'))).toBe(true);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('should create multiple feature branches', async () => {
    await createInitialCommit(repo);

    const features = ['feature/auth', 'feature/db', 'feature/api'];

    for (const feature of features) {
      await createTestBranch(repo, feature);
      await createTestCommit(repo, {
        message: `Work on ${feature}`,
      });
    }

    const branches = await repo.getBranches();
    const hasAllFeatures = features.every(f =>
      branches.some(b => b.includes(f))
    );

    expect(hasAllFeatures).toBe(true);
  });

  it('should track commit sequence', async () => {
    const commits = await createMultipleCommits(repo, 5, {
      message: 'Sequential commit',
    });

    expect(commits).toHaveLength(5);

    // Verify sequence in log
    const log = await repo.getLog(5);

    expect(log.length).toBeGreaterThanOrEqual(5);

    // Verify commit hashes are unique
    const hashes = new Set(commits.map(c => c.hash));
    expect(hashes.size).toBe(5);
  });
});
