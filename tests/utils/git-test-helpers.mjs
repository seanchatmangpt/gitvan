/**
 * Git Test Helpers
 *
 * Utility functions for setting up and managing test repositories
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

/**
 * Create a temporary test repository
 * Returns an object with path and cleanup function
 */
export async function createTestRepo(options = {}) {
  const {
    bare = false,
    initializeCommit = true,
    author = 'Test User <test@example.com>',
    defaultBranch = 'main',
  } = options;

  // Generate unique directory name
  const testId = randomBytes(8).toString('hex');
  const repoPath = join(tmpdir(), `gitvan-test-${testId}`);

  // Create directory
  await fs.mkdir(repoPath, { recursive: true });

  // Initialize git repo
  const { execSync } = await import('child_process');

  try {
    // Set git config for test environment
    execSync('git init', { cwd: repoPath, stdio: 'pipe' });

    // Configure user
    execSync(`git config user.name "Test User"`, {
      cwd: repoPath,
      stdio: 'pipe',
    });
    execSync(`git config user.email "test@example.com"`, {
      cwd: repoPath,
      stdio: 'pipe',
    });

    // Set default branch
    execSync(`git checkout -b ${defaultBranch}`, {
      cwd: repoPath,
      stdio: 'pipe',
    });

    // Create initial commit if requested
    if (initializeCommit) {
      const readmeContent = `# Test Repository

Generated for testing purposes.

- Test ID: ${testId}
- Created: ${new Date().toISOString()}
`;

      await fs.writeFile(join(repoPath, 'README.md'), readmeContent);

      execSync('git add README.md', { cwd: repoPath, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', {
        cwd: repoPath,
        stdio: 'pipe',
      });
    }
  } catch (error) {
    // Cleanup on error
    await cleanupRepo(repoPath);
    throw new Error(`Failed to initialize test repo: ${error.message}`);
  }

  return {
    path: repoPath,
    testId,
    defaultBranch,

    /**
     * Create a file in the repo
     */
    async createFile(filePath, content = '') {
      const fullPath = join(repoPath, filePath);
      await fs.mkdir(join(repoPath, filePath.split('/').slice(0, -1).join('/')), {
        recursive: true,
      });
      await fs.writeFile(fullPath, content);
    },

    /**
     * Read a file from the repo
     */
    async readFile(filePath) {
      const fullPath = join(repoPath, filePath);
      return fs.readFile(fullPath, 'utf-8');
    },

    /**
     * Execute git command
     */
    async git(command, options = {}) {
      const { execSync } = await import('child_process');
      try {
        return execSync(`git ${command}`, {
          cwd: repoPath,
          encoding: 'utf-8',
          stdio: options.stdio || 'pipe',
          ...options,
        });
      } catch (error) {
        if (options.throwOnError !== false) {
          throw error;
        }
        return null;
      }
    },

    /**
     * Create a commit with a file change
     */
    async createCommit(fileName, content, message) {
      const fullPath = join(repoPath, fileName);
      await fs.writeFile(fullPath, content);
      execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
      execSync(`git commit -m "${message}"`, { cwd: repoPath, stdio: 'pipe' });
    },

    /**
     * Create a branch
     */
    async createBranch(branchName, startPoint = defaultBranch) {
      execSync(`git checkout -b ${branchName} ${startPoint}`, {
        cwd: repoPath,
        stdio: 'pipe',
      });
      execSync(`git checkout ${defaultBranch}`, {
        cwd: repoPath,
        stdio: 'pipe',
      });
    },

    /**
     * Get commit log
     */
    async getLog(format = '%h %s') {
      const { execSync } = await import('child_process');
      const output = execSync(`git log --format="${format}"`, {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return output.trim().split('\n').filter(l => l);
    },

    /**
     * Get current branch
     */
    async getCurrentBranch() {
      const { execSync } = await import('child_process');
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();
    },

    /**
     * Cleanup the test repository
     */
    async cleanup() {
      return cleanupRepo(repoPath);
    },
  };
}

/**
 * Clean up a test repository
 */
export async function cleanupRepo(repoPath) {
  try {
    const { execSync } = await import('child_process');

    // Remove git locks if they exist
    const lockPath = join(repoPath, '.git', 'index.lock');
    try {
      await fs.unlink(lockPath);
    } catch {
      // Lock doesn't exist, that's fine
    }

    // Recursively remove directory
    await fs.rm(repoPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`Failed to cleanup repo at ${repoPath}:`, error.message);
    return false;
  }
}

/**
 * Create a remote repository for testing push/pull
 */
export async function createRemoteRepo(options = {}) {
  const { bare = true } = options;

  const testId = randomBytes(8).toString('hex');
  const remoteRepoPath = join(tmpdir(), `gitvan-remote-${testId}`);

  const { execSync } = await import('child_process');

  try {
    // Create bare repository
    await fs.mkdir(remoteRepoPath, { recursive: true });

    if (bare) {
      execSync(`git init --bare`, { cwd: remoteRepoPath, stdio: 'pipe' });
    } else {
      execSync('git init', { cwd: remoteRepoPath, stdio: 'pipe' });
      execSync(`git config user.name "Test Remote"`, {
        cwd: remoteRepoPath,
        stdio: 'pipe',
      });
      execSync(`git config user.email "remote@example.com"`, {
        cwd: remoteRepoPath,
        stdio: 'pipe',
      });
    }
  } catch (error) {
    await cleanupRepo(remoteRepoPath);
    throw new Error(`Failed to create remote repo: ${error.message}`);
  }

  return {
    path: remoteRepoPath,
    testId,
    bare,

    /**
     * Add remote to a local repository
     */
    async addToLocalRepo(localRepoPath, remoteName = 'origin') {
      const { execSync } = await import('child_process');
      execSync(`git remote add ${remoteName} ${remoteRepoPath}`, {
        cwd: localRepoPath,
        stdio: 'pipe',
      });
    },

    /**
     * Cleanup the remote repository
     */
    async cleanup() {
      return cleanupRepo(remoteRepoPath);
    },
  };
}

/**
 * Setup a complete test environment with local and remote repos
 */
export async function createTestEnvironment(options = {}) {
  const localRepo = await createTestRepo(options.local);
  const remoteRepo = await createRemoteRepo(options.remote);

  // Connect them
  await remoteRepo.addToLocalRepo(localRepo.path);

  return {
    localRepo,
    remoteRepo,

    /**
     * Cleanup both repositories
     */
    async cleanup() {
      await localRepo.cleanup();
      await remoteRepo.cleanup();
    },
  };
}

/**
 * Simulate a merge conflict scenario
 */
export async function createMergeConflictScenario(repo) {
  const { execSync } = await import('child_process');

  // Create conflicting file on main
  await repo.createCommit('conflict.txt', 'main version', 'Main version');

  // Create feature branch with different content
  execSync('git checkout -b feature/conflict', { cwd: repo.path, stdio: 'pipe' });
  await repo.createCommit('conflict.txt', 'feature version', 'Feature version');

  // Switch back to main (merge will fail)
  execSync('git checkout main', { cwd: repo.path, stdio: 'pipe' });

  return {
    mainBranch: 'main',
    featureBranch: 'feature/conflict',
    conflictingFile: 'conflict.txt',

    /**
     * Resolve the conflict (main wins)
     */
    async resolveConflict() {
      await repo.createFile('conflict.txt', 'main version');
      execSync('git add conflict.txt', { cwd: repo.path, stdio: 'pipe' });
      execSync('git commit -m "Resolve conflict"', {
        cwd: repo.path,
        stdio: 'pipe',
      });
    },
  };
}

/**
 * Helper to verify git state
 */
export async function verifyGitState(repoPath, expectedState = {}) {
  const { execSync } = await import('child_process');

  const state = {
    branch: null,
    clean: true,
    staging: [],
    untracked: [],
  };

  try {
    // Get current branch
    state.branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    // Check if clean
    const status = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    state.clean = status.trim().length === 0;
    state.status = status.trim();
  } catch (error) {
    return null;
  }

  // Verify against expected state
  if (expectedState.branch && state.branch !== expectedState.branch) {
    throw new Error(
      `Expected branch '${expectedState.branch}', got '${state.branch}'`
    );
  }

  if (expectedState.clean !== undefined && state.clean !== expectedState.clean) {
    throw new Error(
      `Expected clean=${expectedState.clean}, got ${state.clean}`
    );
  }

  return state;
}
