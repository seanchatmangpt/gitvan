/**
 * @fileoverview GitVan v4 - Git Operations Hooks
 *
 * This module provides hooks for executing Git operations with type safety.
 * All operations return reactive results and can be composed with other hooks.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  useState,
  useCallback,
  useHookContext,
  tryUseHookContext,
  type AsyncHookResult,
} from '../core/index.js';

import type {
  GitOperationResult,
  CommitOptions,
  CommitResult,
  BranchCreateOptions,
  BranchDeleteOptions,
  BranchListOptions,
  BranchListItem,
  CheckoutOptions,
  MergeOptions,
  MergeResult,
  RebaseOptions,
  RebaseResult,
  ResetOptions,
  ResetMode,
  FetchOptions,
  PushOptions,
  PushResult,
  PullOptions,
  StashSaveOptions,
  StashApplyOptions,
  TagCreateOptions,
  TagDeleteOptions,
  DiffOptions,
  DiffResult,
  DiffEntry,
  LogOptions,
  LogEntry,
  CleanOptions,
} from './types.js';

const execFileAsync = promisify(execFile);

// ============================================================================
// Git Command Executor
// ============================================================================

/**
 * Execute a git command with full result tracking
 */
async function executeGit(
  args: readonly string[],
  cwd: string,
): Promise<GitOperationResult> {
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync('git', [...args], {
      cwd,
      env: { ...process.env, TZ: 'UTC', LANG: 'C' },
      maxBuffer: 12 * 1024 * 1024,
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      success: false,
      stdout: err.stdout?.trim() ?? '',
      stderr: err.stderr?.trim() ?? '',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error : new Error(String(error)),
      exitCode: err.code ?? 1,
    } as GitOperationResult & { error: Error; exitCode: number };
  }
}

// ============================================================================
// useGitCommit Hook
// ============================================================================

/**
 * Hook for creating commits
 *
 * @returns Object with commit function
 *
 * @example
 * ```typescript
 * const { commit } = useGitCommit();
 *
 * await commit({
 *   message: 'feat: add new feature',
 *   sign: true,
 * });
 * ```
 */
export function useGitCommit(): {
  commit: (options: CommitOptions) => Promise<CommitResult | null>;
  result: () => AsyncHookResult<CommitResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<CommitResult>>({
    data: null,
    error: null,
    loading: false,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  const commit = async (options: CommitOptions): Promise<CommitResult | null> => {
    setResult((prev) => ({ ...prev, loading: true, error: null }));
    const startTime = Date.now();

    const args: string[] = ['commit'];

    if (options.message) {
      args.push('-m', options.message);
    }
    if (options.sign) {
      args.push('-S');
    }
    if (options.allowEmpty) {
      args.push('--allow-empty');
    }
    if (options.amend) {
      args.push('--amend');
    }
    if (options.author) {
      args.push('--author', options.author);
    }
    if (options.date) {
      args.push('--date', options.date);
    }
    if (options.fixup) {
      args.push('--fixup', options.fixup);
    }
    if (options.squash) {
      args.push('--squash', options.squash);
    }

    const gitResult = await executeGit(args, cwd);

    if (!gitResult.success) {
      setResult({
        data: null,
        error: 'error' in gitResult ? gitResult.error as Error : new Error('Commit failed'),
        loading: false,
        executed: true,
        duration: Date.now() - startTime,
        attempts: 1,
        cached: false,
      });
      return null;
    }

    // Get commit info
    const infoResult = await executeGit(
      ['log', '-1', '--format=%H%n%h%n%s'],
      cwd,
    );

    if (!infoResult.success) {
      setResult({
        data: null,
        error: new Error('Failed to get commit info'),
        loading: false,
        executed: true,
        duration: Date.now() - startTime,
        attempts: 1,
        cached: false,
      });
      return null;
    }

    const [sha, shortSha, subject] = infoResult.stdout.split('\n');

    if (!sha || !shortSha || !subject) {
      setResult({
        data: null,
        error: new Error('Invalid commit info format'),
        loading: false,
        executed: true,
        duration: Date.now() - startTime,
        attempts: 1,
        cached: false,
      });
      return null;
    }

    const commitResult: CommitResult = {
      success: true,
      stdout: gitResult.stdout,
      stderr: gitResult.stderr,
      duration: gitResult.duration,
      sha,
      shortSha,
      subject,
    };

    setResult({
      data: commitResult,
      error: null,
      loading: false,
      executed: true,
      duration: Date.now() - startTime,
      attempts: 1,
      cached: false,
    });

    return commitResult;
  };

  return {
    commit,
    result,
  };
}

// ============================================================================
// useGitBranch Hook
// ============================================================================

/**
 * Hook for branch operations
 *
 * @example
 * ```typescript
 * const { create, delete: deleteBranch, list } = useGitBranch();
 *
 * // Create a new branch
 * await create({ name: 'feature/new-feature' });
 *
 * // List branches
 * const branches = await list({ all: true });
 *
 * // Delete a branch
 * await deleteBranch({ names: ['old-feature'], force: true });
 * ```
 */
export function useGitBranch(): {
  create: (options: BranchCreateOptions) => Promise<GitOperationResult>;
  delete: (options: BranchDeleteOptions) => Promise<GitOperationResult>;
  list: (options?: BranchListOptions) => Promise<readonly BranchListItem[]>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const create = async (options: BranchCreateOptions): Promise<GitOperationResult> => {
    const args: string[] = ['branch'];

    if (options.force) {
      args.push('-f');
    }
    if (options.track) {
      args.push('--track', options.track);
    }
    if (options.noTrack) {
      args.push('--no-track');
    }

    args.push(options.name);

    if (options.startPoint) {
      args.push(options.startPoint);
    }

    return executeGit(args, cwd);
  };

  const deleteBranch = async (options: BranchDeleteOptions): Promise<GitOperationResult> => {
    const args: string[] = ['branch'];

    if (options.force) {
      args.push('-D');
    } else {
      args.push('-d');
    }

    args.push(...options.names);

    return executeGit(args, cwd);
  };

  const list = async (options: BranchListOptions = {}): Promise<readonly BranchListItem[]> => {
    const args: string[] = ['branch', '-v', '--format=%(HEAD)%(refname:short)%09%(objectname:short)%09%(upstream:short)'];

    if (options.all) {
      args.push('-a');
    }
    if (options.remotes) {
      args.push('-r');
    }
    if (options.merged) {
      args.push('--merged', options.merged);
    }
    if (options.noMerged) {
      args.push('--no-merged', options.noMerged);
    }
    if (options.sort) {
      args.push(`--sort=${options.sort}`);
    }
    if (options.pattern) {
      args.push(options.pattern);
    }

    const result = await executeGit(args, cwd);

    if (!result.success) {
      return [];
    }

    return result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line): BranchListItem => {
        const isCurrent = line.startsWith('*');
        const [nameWithHead, sha, upstream] = line.split('\t');
        const name = (nameWithHead?.replace(/^\*?\s*/, '') ?? '').trim();
        const isRemote = name.startsWith('remotes/') || (options.remotes ?? false);

        return {
          name: name.replace(/^remotes\//, ''),
          isCurrent,
          sha: sha ?? '',
          upstream: upstream || undefined,
          isRemote,
        };
      });
  };

  return {
    create,
    delete: deleteBranch,
    list,
  };
}

// ============================================================================
// useGitCheckout Hook
// ============================================================================

/**
 * Hook for checkout operations
 *
 * @example
 * ```typescript
 * const { checkout } = useGitCheckout();
 *
 * // Switch to a branch
 * await checkout({ target: 'main' });
 *
 * // Create and switch to new branch
 * await checkout({ target: 'feature/new', create: true });
 * ```
 */
export function useGitCheckout(): {
  checkout: (options: CheckoutOptions) => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const checkout = async (options: CheckoutOptions): Promise<GitOperationResult> => {
    const args: string[] = ['checkout'];

    if (options.create) {
      args.push('-b');
    }
    if (options.force) {
      args.push('-f');
    }
    if (options.track) {
      args.push('--track', options.track);
    }
    if (options.detach) {
      args.push('--detach');
    }

    args.push(options.target);

    if (options.paths && options.paths.length > 0) {
      args.push('--', ...options.paths);
    }

    return executeGit(args, cwd);
  };

  return { checkout };
}

// ============================================================================
// useGitMerge Hook
// ============================================================================

/**
 * Hook for merge operations
 *
 * @example
 * ```typescript
 * const { merge, abort } = useGitMerge();
 *
 * const result = await merge({
 *   branches: ['feature/new'],
 *   noFf: true,
 * });
 *
 * if (result.conflicts.length > 0) {
 *   // Handle conflicts
 *   await abort();
 * }
 * ```
 */
export function useGitMerge(): {
  merge: (options: MergeOptions) => Promise<MergeResult>;
  abort: () => Promise<GitOperationResult>;
  continue: () => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const merge = async (options: MergeOptions): Promise<MergeResult> => {
    const args: string[] = ['merge'];

    if (options.message) {
      args.push('-m', options.message);
    }
    if (options.noFf) {
      args.push('--no-ff');
    }
    if (options.ffOnly) {
      args.push('--ff-only');
    }
    if (options.squash) {
      args.push('--squash');
    }
    if (options.noCommit) {
      args.push('--no-commit');
    }
    if (options.strategy) {
      args.push('-s', options.strategy);
    }
    if (options.strategyOption) {
      args.push('-X', options.strategyOption);
    }
    if (options.sign) {
      args.push('-S');
    }

    args.push(...options.branches);

    const result = await executeGit(args, cwd);

    // Check for conflicts
    const statusResult = await executeGit(['status', '--porcelain'], cwd);
    const conflicts = statusResult.stdout
      .split('\n')
      .filter((line) => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'))
      .map((line) => line.substring(3).trim());

    // Check if commit was created
    let sha: string | undefined;
    if (result.success && !options.noCommit && !options.squash) {
      const headResult = await executeGit(['rev-parse', 'HEAD'], cwd);
      sha = headResult.success ? headResult.stdout : undefined;
    }

    const fastForward = result.stdout.includes('Fast-forward');

    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration,
      merged: result.success,
      commitCreated: result.success && !options.noCommit && !options.squash,
      sha,
      fastForward,
      conflicts,
    };
  };

  const abort = async (): Promise<GitOperationResult> => {
    return executeGit(['merge', '--abort'], cwd);
  };

  const continueOp = async (): Promise<GitOperationResult> => {
    return executeGit(['merge', '--continue'], cwd);
  };

  return {
    merge,
    abort,
    continue: continueOp,
  };
}

// ============================================================================
// useGitRebase Hook
// ============================================================================

/**
 * Hook for rebase operations
 *
 * @example
 * ```typescript
 * const { rebase, abort, continue: cont, skip } = useGitRebase();
 *
 * const result = await rebase({
 *   onto: 'main',
 *   autosquash: true,
 * });
 *
 * if (result.hasConflicts) {
 *   // Handle conflicts then continue
 *   await cont();
 * }
 * ```
 */
export function useGitRebase(): {
  rebase: (options: RebaseOptions) => Promise<RebaseResult>;
  abort: () => Promise<GitOperationResult>;
  continue: () => Promise<GitOperationResult>;
  skip: () => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const rebase = async (options: RebaseOptions): Promise<RebaseResult> => {
    const args: string[] = ['rebase'];

    if (options.continue) {
      args.push('--continue');
    } else if (options.abort) {
      args.push('--abort');
    } else if (options.skip) {
      args.push('--skip');
    } else {
      if (options.interactive) {
        args.push('-i');
      }
      if (options.preserveMerges) {
        args.push('--preserve-merges');
      }
      if (options.autosquash) {
        args.push('--autosquash');
      }
      if (options.sign) {
        args.push('-S');
      }
      args.push(options.onto);
    }

    const result = await executeGit(args, cwd);

    // Check for conflicts
    const statusResult = await executeGit(['status', '--porcelain'], cwd);
    const conflicts = statusResult.stdout
      .split('\n')
      .filter((line) => line.startsWith('UU'))
      .map((line) => line.substring(3).trim());

    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration,
      completed: result.success,
      commitsRebased: 0, // Would need to track this
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  };

  const abort = async (): Promise<GitOperationResult> => {
    return executeGit(['rebase', '--abort'], cwd);
  };

  const continueOp = async (): Promise<GitOperationResult> => {
    return executeGit(['rebase', '--continue'], cwd);
  };

  const skip = async (): Promise<GitOperationResult> => {
    return executeGit(['rebase', '--skip'], cwd);
  };

  return {
    rebase,
    abort,
    continue: continueOp,
    skip,
  };
}

// ============================================================================
// useGitReset Hook
// ============================================================================

/**
 * Hook for reset operations
 *
 * @example
 * ```typescript
 * const { reset } = useGitReset();
 *
 * // Soft reset to unstage
 * await reset({ mode: 'soft', target: 'HEAD~1' });
 *
 * // Hard reset (DANGER!)
 * await reset({ mode: 'hard', target: 'origin/main' });
 * ```
 */
export function useGitReset(): {
  reset: (options: ResetOptions) => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const reset = async (options: ResetOptions): Promise<GitOperationResult> => {
    const args: string[] = ['reset', `--${options.mode}`];

    if (options.target) {
      args.push(options.target);
    }

    if (options.paths && options.paths.length > 0) {
      args.push('--', ...options.paths);
    }

    return executeGit(args, cwd);
  };

  return { reset };
}

// ============================================================================
// useGitRemote Hook
// ============================================================================

/**
 * Hook for remote operations (fetch, push, pull)
 *
 * @example
 * ```typescript
 * const { fetch, push, pull } = useGitRemote();
 *
 * // Fetch all remotes
 * await fetch({ all: true, prune: true });
 *
 * // Push with upstream
 * await push({ setUpstream: true });
 *
 * // Pull with rebase
 * await pull({ rebase: true });
 * ```
 */
export function useGitRemote(): {
  fetch: (options?: FetchOptions) => Promise<GitOperationResult>;
  push: (options?: PushOptions) => Promise<PushResult>;
  pull: (options?: PullOptions) => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const fetch = async (options: FetchOptions = {}): Promise<GitOperationResult> => {
    const args: string[] = ['fetch'];

    if (options.all) {
      args.push('--all');
    }
    if (options.prune) {
      args.push('--prune');
    }
    if (options.tags) {
      args.push('--tags');
    }
    if (options.depth) {
      args.push('--depth', String(options.depth));
    }
    if (options.unshallow) {
      args.push('--unshallow');
    }
    if (options.remote) {
      args.push(options.remote);
    }
    if (options.refspec) {
      args.push(options.refspec);
    }

    return executeGit(args, cwd);
  };

  const push = async (options: PushOptions = {}): Promise<PushResult> => {
    const args: string[] = ['push'];

    if (options.force) {
      args.push('--force');
    }
    if (options.forceWithLease) {
      args.push('--force-with-lease');
    }
    if (options.setUpstream) {
      args.push('--set-upstream');
    }
    if (options.tags) {
      args.push('--tags');
    }
    if (options.delete) {
      args.push('--delete');
    }
    if (options.dryRun) {
      args.push('--dry-run');
    }
    if (options.remote) {
      args.push(options.remote);
    }
    if (options.branch) {
      args.push(options.branch);
    }

    const result = await executeGit(args, cwd);

    return {
      ...result,
      remote: options.remote ?? 'origin',
      branch: options.branch ?? 'HEAD',
      rejected: result.stderr.includes('rejected') || result.stderr.includes('failed'),
    };
  };

  const pull = async (options: PullOptions = {}): Promise<GitOperationResult> => {
    const args: string[] = ['pull'];

    if (options.rebase) {
      args.push('--rebase');
    }
    if (options.ffOnly) {
      args.push('--ff-only');
    }
    if (options.noFf) {
      args.push('--no-ff');
    }
    if (options.squash) {
      args.push('--squash');
    }
    if (options.autostash) {
      args.push('--autostash');
    }
    if (options.remote) {
      args.push(options.remote);
    }
    if (options.branch) {
      args.push(options.branch);
    }

    return executeGit(args, cwd);
  };

  return { fetch, push, pull };
}

// ============================================================================
// useGitStash Hook
// ============================================================================

/**
 * Hook for stash operations
 *
 * @example
 * ```typescript
 * const { save, apply, pop, drop, list } = useGitStash();
 *
 * // Save changes
 * await save({ message: 'WIP: feature work', includeUntracked: true });
 *
 * // Pop latest stash
 * await pop();
 * ```
 */
export function useGitStash(): {
  save: (options?: StashSaveOptions) => Promise<GitOperationResult>;
  apply: (options?: StashApplyOptions) => Promise<GitOperationResult>;
  pop: (options?: StashApplyOptions) => Promise<GitOperationResult>;
  drop: (stash?: string | number) => Promise<GitOperationResult>;
  list: () => Promise<readonly string[]>;
  clear: () => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const save = async (options: StashSaveOptions = {}): Promise<GitOperationResult> => {
    const args: string[] = ['stash', 'push'];

    if (options.message) {
      args.push('-m', options.message);
    }
    if (options.includeUntracked) {
      args.push('-u');
    }
    if (options.keepIndex) {
      args.push('--keep-index');
    }
    if (options.all) {
      args.push('-a');
    }
    if (options.paths && options.paths.length > 0) {
      args.push('--', ...options.paths);
    }

    return executeGit(args, cwd);
  };

  const apply = async (options: StashApplyOptions = {}): Promise<GitOperationResult> => {
    const args: string[] = ['stash', 'apply'];

    if (options.index) {
      args.push('--index');
    }
    if (options.stash !== undefined) {
      args.push(`stash@{${options.stash}}`);
    }

    return executeGit(args, cwd);
  };

  const pop = async (options: StashApplyOptions = {}): Promise<GitOperationResult> => {
    const args: string[] = ['stash', 'pop'];

    if (options.index) {
      args.push('--index');
    }
    if (options.stash !== undefined) {
      args.push(`stash@{${options.stash}}`);
    }

    return executeGit(args, cwd);
  };

  const drop = async (stash?: string | number): Promise<GitOperationResult> => {
    const args: string[] = ['stash', 'drop'];

    if (stash !== undefined) {
      args.push(`stash@{${stash}}`);
    }

    return executeGit(args, cwd);
  };

  const list = async (): Promise<readonly string[]> => {
    const result = await executeGit(['stash', 'list'], cwd);
    return result.success ? result.stdout.split('\n').filter(Boolean) : [];
  };

  const clear = async (): Promise<GitOperationResult> => {
    return executeGit(['stash', 'clear'], cwd);
  };

  return { save, apply, pop, drop, list, clear };
}

// ============================================================================
// useGitTag Hook
// ============================================================================

/**
 * Hook for tag operations
 *
 * @example
 * ```typescript
 * const { create, delete: deleteTag, list } = useGitTag();
 *
 * // Create annotated tag
 * await create({ name: 'v1.0.0', message: 'Release 1.0.0' });
 *
 * // List tags
 * const tags = await list();
 * ```
 */
export function useGitTag(): {
  create: (options: TagCreateOptions) => Promise<GitOperationResult>;
  delete: (options: TagDeleteOptions) => Promise<GitOperationResult>;
  list: (pattern?: string) => Promise<readonly string[]>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const create = async (options: TagCreateOptions): Promise<GitOperationResult> => {
    const args: string[] = ['tag'];

    if (options.message) {
      args.push('-a', '-m', options.message);
    }
    if (options.sign) {
      args.push('-s');
    }
    if (options.force) {
      args.push('-f');
    }

    args.push(options.name);

    if (options.target) {
      args.push(options.target);
    }

    return executeGit(args, cwd);
  };

  const deleteTag = async (options: TagDeleteOptions): Promise<GitOperationResult> => {
    return executeGit(['tag', '-d', ...options.names], cwd);
  };

  const list = async (pattern?: string): Promise<readonly string[]> => {
    const args: string[] = ['tag', '-l'];
    if (pattern) {
      args.push(pattern);
    }

    const result = await executeGit(args, cwd);
    return result.success ? result.stdout.split('\n').filter(Boolean) : [];
  };

  return { create, delete: deleteTag, list };
}

// ============================================================================
// useGitDiff Hook
// ============================================================================

/**
 * Hook for diff operations
 *
 * @example
 * ```typescript
 * const { diff } = useGitDiff();
 *
 * // Get staged changes
 * const staged = await diff({ staged: true });
 *
 * // Compare branches
 * const changes = await diff({ from: 'main', to: 'feature' });
 * ```
 */
export function useGitDiff(): {
  diff: (options?: DiffOptions) => Promise<DiffResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const diff = async (options: DiffOptions = {}): Promise<DiffResult> => {
    const args: string[] = ['diff', '--numstat'];

    if (options.staged) {
      args.push('--cached');
    }
    if (options.renames) {
      args.push('-M');
    }
    if (options.from && options.to) {
      args.push(`${options.from}...${options.to}`);
    } else if (options.from) {
      args.push(options.from);
    }
    if (options.paths && options.paths.length > 0) {
      args.push('--', ...options.paths);
    }

    const result = await executeGit(args, cwd);

    if (!result.success) {
      return {
        success: false,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: result.duration,
        entries: [],
        totalAdditions: 0,
        totalDeletions: 0,
        filesChanged: 0,
      };
    }

    const entries: DiffEntry[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const line of result.stdout.split('\n').filter(Boolean)) {
      const [addStr, delStr, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');
      const isBinary = addStr === '-';
      const additions = isBinary ? 0 : parseInt(addStr ?? '0', 10);
      const deletions = isBinary ? 0 : parseInt(delStr ?? '0', 10);

      // Parse path for renames
      let originalPath: string | undefined;
      let finalPath = path;
      const renameMatch = path.match(/(.+)\{(.+) => (.+)\}(.*)/) || path.match(/(.+) => (.+)/);

      if (renameMatch) {
        if (renameMatch.length === 5 && renameMatch[1] !== undefined && renameMatch[2] !== undefined && renameMatch[3] !== undefined && renameMatch[4] !== undefined) {
          originalPath = renameMatch[1] + renameMatch[2] + renameMatch[4];
          finalPath = renameMatch[1] + renameMatch[3] + renameMatch[4];
        } else if (renameMatch.length === 3 && renameMatch[1] !== undefined && renameMatch[2] !== undefined) {
          originalPath = renameMatch[1];
          finalPath = renameMatch[2];
        }
      }

      const type: DiffEntry['type'] = originalPath
        ? 'renamed'
        : additions > 0 && deletions === 0
          ? 'added'
          : deletions > 0 && additions === 0
            ? 'deleted'
            : 'modified';

      entries.push({
        path: finalPath,
        originalPath,
        type,
        additions,
        deletions,
        isBinary,
      });

      totalAdditions += additions;
      totalDeletions += deletions;
    }

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration,
      entries,
      totalAdditions,
      totalDeletions,
      filesChanged: entries.length,
    };
  };

  return { diff };
}

// ============================================================================
// useGitLog Hook
// ============================================================================

/**
 * Hook for log operations
 *
 * @example
 * ```typescript
 * const { log } = useGitLog();
 *
 * // Get recent commits
 * const commits = await log({ maxCount: 10 });
 *
 * // Search by author
 * const authorCommits = await log({ author: 'John', maxCount: 50 });
 * ```
 */
export function useGitLog(): {
  log: (options?: LogOptions) => Promise<readonly LogEntry[]>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const log = async (options: LogOptions = {}): Promise<readonly LogEntry[]> => {
    const format = '%H%n%h%n%s%n%b%n%an%n%ae%n%aI%n%cn%n%ce%n%cI%n%P%n---COMMIT---';
    const args: string[] = ['log', `--format=${format}`];

    if (options.maxCount) {
      args.push(`-n${options.maxCount}`);
    }
    if (options.skip) {
      args.push(`--skip=${options.skip}`);
    }
    if (options.since) {
      const date = options.since instanceof Date
        ? options.since.toISOString()
        : options.since;
      args.push(`--since=${date}`);
    }
    if (options.until) {
      const date = options.until instanceof Date
        ? options.until.toISOString()
        : options.until;
      args.push(`--until=${date}`);
    }
    if (options.author) {
      args.push(`--author=${options.author}`);
    }
    if (options.grep) {
      args.push(`--grep=${options.grep}`);
    }
    if (options.firstParent) {
      args.push('--first-parent');
    }
    if (options.merges) {
      args.push('--merges');
    }
    if (options.noMerges) {
      args.push('--no-merges');
    }
    if (options.from && options.to) {
      args.push(`${options.from}..${options.to}`);
    } else if (options.from) {
      args.push(options.from);
    }
    if (options.paths && options.paths.length > 0) {
      args.push('--', ...options.paths);
    }

    const result = await executeGit(args, cwd);

    if (!result.success) {
      return [];
    }

    const entries: LogEntry[] = [];
    const commits = result.stdout.split('---COMMIT---').filter(Boolean);

    for (const commit of commits) {
      const lines = commit.trim().split('\n');
      if (lines.length < 10) continue;

      const sha = lines[0] ?? '';
      const shortSha = lines[1] ?? '';
      const subject = lines[2] ?? '';

      // Find the body (everything between subject and author info)
      let bodyEndIndex = lines.length - 6; // 6 lines at the end for author/committer info
      const body = lines.slice(3, bodyEndIndex).join('\n').trim() || undefined;

      const authorName = lines[lines.length - 6] ?? '';
      const authorEmail = lines[lines.length - 5] ?? '';
      const authorDate = new Date(lines[lines.length - 4] ?? '');
      const committerName = lines[lines.length - 3] ?? '';
      const committerEmail = lines[lines.length - 2] ?? '';
      const commitDate = new Date(lines[lines.length - 1]?.split('\n')[0] ?? '');
      const parentLine = lines[lines.length - 1]?.split('\n')[1] ?? '';
      const parents = parentLine.split(' ').filter(Boolean);

      entries.push({
        sha,
        shortSha,
        subject,
        body,
        authorName,
        authorEmail,
        authorDate,
        committerName,
        committerEmail,
        commitDate,
        parents,
        isMerge: parents.length > 1,
      });
    }

    return entries;
  };

  return { log };
}

// ============================================================================
// useGitAdd Hook
// ============================================================================

/**
 * Hook for staging files
 *
 * @example
 * ```typescript
 * const { add, addAll } = useGitAdd();
 *
 * // Stage specific files
 * await add(['src/index.ts', 'package.json']);
 *
 * // Stage all changes
 * await addAll();
 * ```
 */
export function useGitAdd(): {
  add: (paths: readonly string[]) => Promise<GitOperationResult>;
  addAll: () => Promise<GitOperationResult>;
  addUpdated: () => Promise<GitOperationResult>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const add = async (paths: readonly string[]): Promise<GitOperationResult> => {
    return executeGit(['add', '--', ...paths], cwd);
  };

  const addAll = async (): Promise<GitOperationResult> => {
    return executeGit(['add', '-A'], cwd);
  };

  const addUpdated = async (): Promise<GitOperationResult> => {
    return executeGit(['add', '-u'], cwd);
  };

  return { add, addAll, addUpdated };
}

// ============================================================================
// useGitClean Hook
// ============================================================================

/**
 * Hook for cleaning the working directory
 *
 * @example
 * ```typescript
 * const { clean, dryRun } = useGitClean();
 *
 * // Preview what would be deleted
 * const preview = await dryRun();
 *
 * // Clean untracked files
 * await clean({ force: true, directories: true });
 * ```
 */
export function useGitClean(): {
  clean: (options: CleanOptions) => Promise<GitOperationResult>;
  dryRun: (options?: Omit<CleanOptions, 'dryRun'>) => Promise<readonly string[]>;
} {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const clean = async (options: CleanOptions): Promise<GitOperationResult> => {
    const args: string[] = ['clean'];

    if (options.force) {
      args.push('-f');
    }
    if (options.directories) {
      args.push('-d');
    }
    if (options.ignored) {
      args.push('-x');
    }
    if (options.dryRun) {
      args.push('-n');
    }
    if (options.paths && options.paths.length > 0) {
      args.push('--', ...options.paths);
    }

    return executeGit(args, cwd);
  };

  const dryRun = async (options: Omit<CleanOptions, 'dryRun'> = {}): Promise<readonly string[]> => {
    const result = await clean({ ...options, dryRun: true });
    if (!result.success) return [];

    return result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => line.replace(/^Would remove /, ''));
  };

  return { clean, dryRun };
}
