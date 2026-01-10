/**
 * Git Test Helpers
 *
 * Utilities for creating mock git repositories, commits, and simulating git hooks.
 * Provides 80/20 functionality for most common Git testing scenarios.
 *
 * Usage:
 * ```javascript
 * import {
 *   createMockRepo,
 *   createTestCommit,
 *   createTestBranch,
 * } from './git-test-helpers.mjs';
 *
 * describe('Git Tests', () => {
 *   let repo;
 *
 *   beforeEach(async () => {
 *     repo = await createMockRepo('/tmp/test-repo');
 *     await createTestCommit(repo, { message: 'Initial commit' });
 *   });
 * });
 * ```
 */

import { execSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const execFileAsync = promisify(execFile);

/**
 * Create mock git repository
 * Initializes a bare git repository for testing
 *
 * @param {string} [repoPath] - Path to create repo (generated if not provided)
 * @returns {Promise<object>} Repository object
 */
export async function createMockRepo(repoPath = null) {
  const dir = repoPath || generateTestRepoPath();

  // Clean up if exists
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }

  // Create directory
  mkdirSync(dir, { recursive: true });

  try {
    // Initialize git repo with deterministic environment
    execSync('git init', {
      cwd: dir,
      env: { ...process.env, TZ: 'UTC', LANG: 'C' },
      stdio: 'pipe',
    });

    // Configure git user
    execSync('git config user.name "Test User"', {
      cwd: dir,
      stdio: 'pipe',
    });

    execSync('git config user.email "test@example.com"', {
      cwd: dir,
      stdio: 'pipe',
    });

    // Disable commit signing for tests
    execSync('git config commit.gpgsign false', {
      cwd: dir,
      stdio: 'pipe',
    });

    // Set default branch to main for consistency
    try {
      execSync('git config init.defaultBranch main', {
        cwd: dir,
        stdio: 'pipe',
      });
    } catch {
      // Older git versions don't support this
    }

    return {
      path: dir,
      name: 'test-repo',
      initialized: true,

      // Get current branch
      getCurrentBranch: async () => {
        try {
          return execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: dir,
            encoding: 'utf8',
          }).trim();
        } catch {
          return 'main';
        }
      },

      // Get commit count
      getCommitCount: async () => {
        try {
          return parseInt(
            execSync('git rev-list --count HEAD', {
              cwd: dir,
              encoding: 'utf8',
            }).trim(),
            10
          );
        } catch {
          return 0;
        }
      },

      // Get recent commits
      getLog: async (n = 10) => {
        try {
          return execSync(`git log --oneline -n ${n}`, {
            cwd: dir,
            encoding: 'utf8',
          })
            .trim()
            .split('\n')
            .filter(l => l);
        } catch {
          return [];
        }
      },

      // Get git status
      getStatus: async () => {
        try {
          return execSync('git status --porcelain', {
            cwd: dir,
            encoding: 'utf8',
          }).trim();
        } catch {
          return '';
        }
      },

      // Get list of files
      getFiles: async () => {
        try {
          return execSync('git ls-files', {
            cwd: dir,
            encoding: 'utf8',
          })
            .trim()
            .split('\n')
            .filter(f => f);
        } catch {
          return [];
        }
      },

      // Get branches
      getBranches: async () => {
        try {
          return execSync('git branch -a', {
            cwd: dir,
            encoding: 'utf8',
          })
            .trim()
            .split('\n')
            .map(b => b.trim())
            .filter(b => b);
        } catch {
          return [];
        }
      },

      // Get tags
      getTags: async () => {
        try {
          return execSync('git tag', {
            cwd: dir,
            encoding: 'utf8',
          })
            .trim()
            .split('\n')
            .filter(t => t);
        } catch {
          return [];
        }
      },
    };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(`Failed to initialize mock repo: ${error.message}`);
  }
}

/**
 * Create test commit in repository
 *
 * @param {object} repo - Repository object
 * @param {object} options - Commit options
 * @param {string} [options.message='Test commit'] - Commit message
 * @param {string} [options.file] - File to create (optional)
 * @param {string} [options.content='test content'] - File content
 * @param {string} [options.author] - Author name
 * @returns {Promise<object>} Commit info
 */
export async function createTestCommit(
  repo,
  {
    message = 'Test commit',
    file = null,
    content = 'test content',
    author = null,
  } = {}
) {
  try {
    // Create test file if needed
    if (file) {
      const filePath = join(repo.path, file);
      const fileDir = filePath.split('/').slice(0, -1).join('/');
      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true });
      }
      writeFileSync(filePath, content, 'utf8');
      execSync(`git add "${file}"`, { cwd: repo.path, stdio: 'pipe' });
    } else {
      // Create a simple test file
      const timestamp = Date.now();
      const testFile = `.gitvan-test-${timestamp}`;
      writeFileSync(join(repo.path, testFile), content, 'utf8');
      execSync(`git add "${testFile}"`, { cwd: repo.path, stdio: 'pipe' });
    }

    // Create commit
    const env = { ...process.env, TZ: 'UTC', LANG: 'C' };
    if (author) {
      env.GIT_AUTHOR_NAME = author;
      env.GIT_AUTHOR_EMAIL = `${author}@example.com`;
    }

    const result = execSync(`git commit -m "${message}"`, {
      cwd: repo.path,
      encoding: 'utf8',
      env,
      stdio: 'pipe',
    });

    // Get commit hash
    const hash = execSync('git rev-parse HEAD', {
      cwd: repo.path,
      encoding: 'utf8',
    }).trim();

    return {
      hash,
      message,
      file: file || `.gitvan-test-${Date.now()}`,
      author: author || 'Test User',
    };
  } catch (error) {
    throw new Error(`Failed to create test commit: ${error.message}`);
  }
}

/**
 * Create test branch in repository
 *
 * @param {object} repo - Repository object
 * @param {string} branchName - Branch name
 * @param {object} [options] - Branch options
 * @param {string} [options.fromBranch='main'] - Source branch
 * @returns {Promise<object>} Branch info
 */
export async function createTestBranch(
  repo,
  branchName,
  { fromBranch = 'main' } = {}
) {
  try {
    // Check out source branch if different from current
    const currentBranch = await repo.getCurrentBranch();
    if (currentBranch !== fromBranch) {
      execSync(`git checkout -b ${fromBranch} 2>/dev/null || git checkout ${fromBranch}`, {
        cwd: repo.path,
        stdio: 'pipe',
      });
    }

    // Create new branch
    execSync(`git checkout -b ${branchName}`, {
      cwd: repo.path,
      stdio: 'pipe',
    });

    return {
      name: branchName,
      from: fromBranch,
      created: true,
    };
  } catch (error) {
    throw new Error(`Failed to create test branch: ${error.message}`);
  }
}

/**
 * Create test tag in repository
 *
 * @param {object} repo - Repository object
 * @param {string} tagName - Tag name
 * @param {object} [options] - Tag options
 * @param {string} [options.message] - Annotated tag message
 * @param {string} [options.ref='HEAD'] - Ref to tag
 * @returns {Promise<object>} Tag info
 */
export async function createTestTag(
  repo,
  tagName,
  { message = null, ref = 'HEAD' } = {}
) {
  try {
    const cmd = message
      ? `git tag -a ${tagName} ${ref} -m "${message}"`
      : `git tag ${tagName} ${ref}`;

    execSync(cmd, {
      cwd: repo.path,
      stdio: 'pipe',
    });

    return {
      name: tagName,
      ref,
      annotated: !!message,
      created: true,
    };
  } catch (error) {
    throw new Error(`Failed to create test tag: ${error.message}`);
  }
}

/**
 * Simulate git hook (prepare files for hook execution)
 *
 * @param {object} repo - Repository object
 * @param {string} hookName - Hook name (pre-commit, commit-msg, etc.)
 * @param {string} scriptContent - Hook script content
 * @returns {Promise<object>} Hook info
 */
export async function createTestHook(
  repo,
  hookName,
  scriptContent
) {
  try {
    const hookPath = join(repo.path, '.git', 'hooks', hookName);

    // Create hooks directory
    mkdirSync(join(repo.path, '.git', 'hooks'), { recursive: true });

    // Write hook script
    writeFileSync(hookPath, scriptContent, 'utf8');

    // Make executable
    execSync(`chmod +x "${hookPath}"`, { stdio: 'pipe' });

    return {
      name: hookName,
      path: hookPath,
      executable: true,
      created: true,
    };
  } catch (error) {
    throw new Error(`Failed to create test hook: ${error.message}`);
  }
}

/**
 * Create test ref (lightweight reference)
 *
 * @param {object} repo - Repository object
 * @param {string} refPath - Ref path (e.g., refs/custom/myref)
 * @param {string} [target='HEAD'] - Target commit/ref
 * @returns {Promise<object>} Ref info
 */
export async function createTestRef(
  repo,
  refPath,
  target = 'HEAD'
) {
  try {
    const hash = execSync(`git rev-parse ${target}`, {
      cwd: repo.path,
      encoding: 'utf8',
    }).trim();

    execSync(`git update-ref refs/${refPath} ${hash}`, {
      cwd: repo.path,
      stdio: 'pipe',
    });

    return {
      path: `refs/${refPath}`,
      target: hash,
      created: true,
    };
  } catch (error) {
    throw new Error(`Failed to create test ref: ${error.message}`);
  }
}

/**
 * Create test note on commit
 *
 * @param {object} repo - Repository object
 * @param {string} [commit='HEAD'] - Commit to annotate
 * @param {string} noteContent - Note content
 * @returns {Promise<object>} Note info
 */
export async function createTestNote(
  repo,
  noteContent,
  commit = 'HEAD'
) {
  try {
    // Use git notes command
    const message = Buffer.from(noteContent).toString('base64');
    execSync(`echo "${message}" | base64 -d | git notes add -m "${noteContent}" ${commit}`, {
      cwd: repo.path,
      stdio: 'pipe',
      shell: '/bin/sh',
    });

    return {
      commit,
      content: noteContent,
      created: true,
    };
  } catch (error) {
    // Fallback: simpler note creation
    try {
      execSync(`git notes add -m "${noteContent}" ${commit}`, {
        cwd: repo.path,
        stdio: 'pipe',
      });

      return {
        commit,
        content: noteContent,
        created: true,
      };
    } catch (fallbackError) {
      throw new Error(`Failed to create test note: ${fallbackError.message}`);
    }
  }
}

/**
 * Clean up mock repository
 *
 * @param {object} repo - Repository object
 */
export async function cleanupMockRepo(repo) {
  try {
    if (repo && repo.path && existsSync(repo.path)) {
      rmSync(repo.path, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`Warning: Failed to cleanup repo ${repo?.path}:`, error.message);
  }
}

/**
 * Create temporary worktree for testing
 *
 * @param {object} repo - Repository object
 * @param {string} [worktreeName] - Worktree name (generated if not provided)
 * @param {object} [options] - Worktree options
 * @param {string} [options.fromBranch='main'] - Source branch
 * @param {boolean} [options.orphan=false] - Create orphan branch
 * @returns {Promise<object>} Worktree info
 */
export async function createTestWorktree(
  repo,
  worktreeName = null,
  { fromBranch = 'main', orphan = false } = {}
) {
  try {
    const name = worktreeName || `wt-${randomBytes(4).toString('hex')}`;
    const wtPath = join(repo.path, '..', name);

    // Create worktree
    if (orphan) {
      execSync(
        `git worktree add --orphan ${name} ${wtPath}`,
        { cwd: repo.path, stdio: 'pipe' }
      );
    } else {
      execSync(
        `git worktree add ${name} ${wtPath} -b ${name}-branch ${fromBranch}`,
        { cwd: repo.path, stdio: 'pipe' }
      );
    }

    return {
      name,
      path: wtPath,
      branch: orphan ? null : `${name}-branch`,
      created: true,
    };
  } catch (error) {
    throw new Error(`Failed to create worktree: ${error.message}`);
  }
}

/**
 * Generate unique test repository path
 * @private
 * @returns {string} Path to test repository
 */
function generateTestRepoPath() {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return join('/tmp', `gitvan-test-repo-${timestamp}-${random}`);
}

/**
 * Helper to create initial commit in repo
 * Used when first commit is needed
 *
 * @param {object} repo - Repository object
 * @returns {Promise<object>} Commit info
 */
export async function createInitialCommit(repo) {
  try {
    // Check if repo has commits
    const count = await repo.getCommitCount();
    if (count === 0) {
      return await createTestCommit(repo, {
        message: 'Initial commit',
        file: 'README.md',
        content: '# Test Repository\n',
      });
    }

    const log = await repo.getLog(1);
    return log[0] ? { hash: log[0].split(' ')[0], message: log[0] } : null;
  } catch (error) {
    throw new Error(`Failed to create initial commit: ${error.message}`);
  }
}

/**
 * Create multiple test commits in sequence
 *
 * @param {object} repo - Repository object
 * @param {number} count - Number of commits to create
 * @param {object} [options] - Commit options
 * @returns {Promise<array>} Array of commit info objects
 */
export async function createMultipleCommits(repo, count, options = {}) {
  const commits = [];

  for (let i = 0; i < count; i++) {
    const commit = await createTestCommit(repo, {
      message: options.message || `Test commit ${i + 1}`,
      file: options.file || null,
      content: options.content || `Content ${i + 1}`,
      author: options.author,
    });

    commits.push(commit);
  }

  return commits;
}

/**
 * Get git configuration from repo
 *
 * @param {object} repo - Repository object
 * @param {string} [key] - Specific config key (optional)
 * @returns {Promise<object|string>} Configuration
 */
export async function getGitConfig(repo, key = null) {
  try {
    if (key) {
      return execSync(`git config ${key}`, {
        cwd: repo.path,
        encoding: 'utf8',
      }).trim();
    }

    const output = execSync('git config --list', {
      cwd: repo.path,
      encoding: 'utf8',
    });

    const config = {};
    output.split('\n').forEach(line => {
      const [k, v] = line.split('=');
      if (k) config[k] = v;
    });

    return config;
  } catch (error) {
    throw new Error(`Failed to get git config: ${error.message}`);
  }
}

/**
 * Assert git repository state
 *
 * @param {object} repo - Repository object
 * @param {object} expected - Expected state
 * @throws {AssertionError} If state doesn't match
 */
export async function assertRepoState(repo, expected) {
  if (expected.branchCount !== undefined) {
    const branches = await repo.getBranches();
    if (branches.length !== expected.branchCount) {
      throw new Error(
        `Expected ${expected.branchCount} branches, got ${branches.length}`
      );
    }
  }

  if (expected.commitCount !== undefined) {
    const count = await repo.getCommitCount();
    if (count !== expected.commitCount) {
      throw new Error(
        `Expected ${expected.commitCount} commits, got ${count}`
      );
    }
  }

  if (expected.fileCount !== undefined) {
    const files = await repo.getFiles();
    if (files.length !== expected.fileCount) {
      throw new Error(
        `Expected ${expected.fileCount} files, got ${files.length}`
      );
    }
  }

  if (expected.statusClean !== undefined) {
    const status = await repo.getStatus();
    const isClean = status === '';
    if (isClean !== expected.statusClean) {
      const statusMsg = isClean ? 'clean' : 'dirty';
      throw new Error(`Expected status to be ${!isClean ? 'clean' : 'dirty'}, got ${statusMsg}`);
    }
  }
}
