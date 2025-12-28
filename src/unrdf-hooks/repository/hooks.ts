/**
 * @fileoverview GitVan v4 - Repository State Hooks
 *
 * This module provides hooks for accessing and managing Git repository state.
 * All hooks are reactive and automatically track dependencies.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  useState,
  useEffect,
  useComputed,
  useMemo,
  useHookContext,
  tryUseHookContext,
  type HookCleanup,
  type AsyncHookResult,
} from '../core/index.js';

import type {
  RepositoryInfo,
  BranchInfo,
  HeadInfo,
  WorkingDirectoryStatus,
  FileChange,
  FileStatus,
  RemoteInfo,
  StashEntry,
  TagInfo,
  WorktreeInfo,
  SubmoduleInfo,
  RepositoryState,
  RepositoryStateOptions,
  TrackingStatus,
  CommitAuthor,
} from './types.js';

import { DEFAULT_REPOSITORY_STATE_OPTIONS } from './types.js';

const execFileAsync = promisify(execFile);

// ============================================================================
// Git Command Utilities
// ============================================================================

/**
 * Execute a git command and return output
 */
async function git(
  args: readonly string[],
  cwd: string,
): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    env: { ...process.env, TZ: 'UTC', LANG: 'C' },
    maxBuffer: 12 * 1024 * 1024,
  });
  return stdout.trim();
}

/**
 * Execute git command, returning null on error
 */
async function gitOrNull(
  args: readonly string[],
  cwd: string,
): Promise<string | null> {
  try {
    return await git(args, cwd);
  } catch {
    return null;
  }
}

// ============================================================================
// Repository Info Hook
// ============================================================================

/**
 * Hook to get basic repository information
 *
 * @returns Async result with repository info
 *
 * @example
 * ```typescript
 * const repoInfo = useRepositoryInfo();
 *
 * useEffect(() => {
 *   const info = repoInfo();
 *   if (info.data) {
 *     console.log('Root:', info.data.root);
 *     console.log('Is bare:', info.data.isBare);
 *   }
 * });
 * ```
 */
export function useRepositoryInfo(): () => AsyncHookResult<RepositoryInfo> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<RepositoryInfo>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchInfo() {
      try {
        const [root, gitDir, isBare, isWorktree] = await Promise.all([
          gitOrNull(['rev-parse', '--show-toplevel'], cwd),
          gitOrNull(['rev-parse', '--git-dir'], cwd),
          gitOrNull(['rev-parse', '--is-bare-repository'], cwd),
          gitOrNull(['rev-parse', '--is-inside-work-tree'], cwd),
        ]);

        if (cancelled) return;

        const info: RepositoryInfo = {
          root: root ?? cwd,
          isRepository: root !== null,
          isBare: isBare === 'true',
          isWorktree: isWorktree === 'true',
          gitDir: gitDir ?? '',
        };

        setResult({
          data: info,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchInfo();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// Branch Info Hook
// ============================================================================

/**
 * Hook to get current branch information
 *
 * @returns Async result with branch info
 *
 * @example
 * ```typescript
 * const branchInfo = useBranchInfo();
 *
 * useEffect(() => {
 *   const info = branchInfo();
 *   if (info.data) {
 *     console.log('Current branch:', info.data.name);
 *     console.log('Is detached:', info.data.isDetached);
 *   }
 * });
 * ```
 */
export function useBranchInfo(): () => AsyncHookResult<BranchInfo> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<BranchInfo>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchBranch() {
      try {
        // Get current branch name
        const branchName = await gitOrNull(
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          cwd,
        );

        if (cancelled) return;

        const isDetached = branchName === 'HEAD';

        // Get upstream info if not detached
        let upstream: string | undefined;
        let tracking: TrackingStatus | undefined;

        if (!isDetached && branchName) {
          upstream = await gitOrNull(
            ['rev-parse', '--abbrev-ref', `${branchName}@{upstream}`],
            cwd,
          ) ?? undefined;

          if (upstream) {
            const aheadBehind = await gitOrNull(
              ['rev-list', '--left-right', '--count', `${upstream}...HEAD`],
              cwd,
            );

            if (aheadBehind) {
              const [behind, ahead] = aheadBehind.split(/\s+/).map(Number);
              tracking = {
                ahead: ahead ?? 0,
                behind: behind ?? 0,
                diverged: (ahead ?? 0) > 0 && (behind ?? 0) > 0,
              };
            }
          }
        }

        const info: BranchInfo = {
          name: isDetached ? null : branchName,
          isDetached,
          upstream,
          tracking,
        };

        setResult({
          data: info,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchBranch();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// HEAD Info Hook
// ============================================================================

/**
 * Hook to get current HEAD information
 *
 * @returns Async result with HEAD info
 *
 * @example
 * ```typescript
 * const headInfo = useHeadInfo();
 *
 * useEffect(() => {
 *   const info = headInfo();
 *   if (info.data) {
 *     console.log('SHA:', info.data.sha);
 *     console.log('Subject:', info.data.subject);
 *   }
 * });
 * ```
 */
export function useHeadInfo(): () => AsyncHookResult<HeadInfo> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<HeadInfo>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchHead() {
      try {
        // Get commit info with format
        const format = '%H%n%h%n%s%n%an%n%ae%n%aI';
        const output = await git(
          ['log', '-1', `--format=${format}`],
          cwd,
        );

        if (cancelled) return;

        const [sha, shortSha, subject, authorName, authorEmail, timestamp] =
          output.split('\n');

        if (!sha || !shortSha || !subject || !authorName || !authorEmail || !timestamp) {
          throw new Error('Invalid commit format');
        }

        const info: HeadInfo = {
          sha,
          shortSha,
          subject,
          author: {
            name: authorName,
            email: authorEmail,
          },
          timestamp: new Date(timestamp),
        };

        setResult({
          data: info,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchHead();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// Working Directory Status Hook
// ============================================================================

/**
 * Parse porcelain v2 status output
 */
function parseStatusLine(line: string): FileChange | null {
  if (line.length < 2) return null;

  const xy = line.substring(0, 2);
  const rest = line.substring(3);

  // Parse status codes
  const indexCode = xy[0];
  const worktreeCode = xy[1];

  const statusMap: Record<string, FileStatus> = {
    'A': 'added',
    'M': 'modified',
    'D': 'deleted',
    'R': 'renamed',
    'C': 'copied',
    '?': 'untracked',
    '!': 'ignored',
    'U': 'conflicted',
  };

  // Handle rename/copy
  let path = rest;
  let originalPath: string | undefined;

  if (indexCode === 'R' || indexCode === 'C') {
    const parts = rest.split(' -> ');
    if (parts.length === 2) {
      originalPath = parts[0];
      path = parts[1] ?? rest;
    }
  }

  return {
    path,
    originalPath,
    indexStatus: indexCode && indexCode !== ' ' ? (statusMap[indexCode] ?? null) : null,
    worktreeStatus: worktreeCode && worktreeCode !== ' ' ? (statusMap[worktreeCode] ?? null) : null,
    isBinary: false, // Would need additional check
  };
}

/**
 * Hook to get working directory status
 *
 * @param options - Status options
 * @returns Async result with working directory status
 *
 * @example
 * ```typescript
 * const status = useWorkingDirectoryStatus();
 *
 * useEffect(() => {
 *   const s = status();
 *   if (s.data) {
 *     console.log('Clean:', s.data.clean);
 *     console.log('Staged files:', s.data.staged);
 *   }
 * });
 * ```
 */
export function useWorkingDirectoryStatus(
  options: { includeFiles?: boolean } = {},
): () => AsyncHookResult<WorkingDirectoryStatus> {
  const { includeFiles = true } = options;
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<WorkingDirectoryStatus>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchStatus() {
      try {
        const output = await git(['status', '--porcelain'], cwd);

        if (cancelled) return;

        const lines = output.split('\n').filter(Boolean);
        const files: FileChange[] = [];
        let staged = 0;
        let unstaged = 0;
        let untracked = 0;
        let conflicted = 0;

        for (const line of lines) {
          const change = parseStatusLine(line);
          if (change) {
            if (includeFiles) {
              files.push(change);
            }

            if (change.indexStatus === 'conflicted' ||
                change.worktreeStatus === 'conflicted') {
              conflicted++;
            } else {
              if (change.indexStatus && change.indexStatus !== 'untracked') {
                staged++;
              }
              if (change.worktreeStatus === 'untracked') {
                untracked++;
              } else if (change.worktreeStatus) {
                unstaged++;
              }
            }
          }
        }

        const status: WorkingDirectoryStatus = {
          clean: lines.length === 0,
          staged,
          unstaged,
          untracked,
          conflicted,
          files,
        };

        setResult({
          data: status,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [cwd, includeFiles]);

  return result;
}

// ============================================================================
// Remotes Hook
// ============================================================================

/**
 * Hook to get remote repository information
 *
 * @returns Async result with remotes array
 *
 * @example
 * ```typescript
 * const remotes = useRemotes();
 *
 * useEffect(() => {
 *   const r = remotes();
 *   if (r.data) {
 *     const origin = r.data.find(remote => remote.isOrigin);
 *     console.log('Origin URL:', origin?.fetchUrl);
 *   }
 * });
 * ```
 */
export function useRemotes(): () => AsyncHookResult<readonly RemoteInfo[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly RemoteInfo[]>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchRemotes() {
      try {
        const output = await gitOrNull(['remote', '-v'], cwd);

        if (cancelled) return;

        const remotes: Map<string, Partial<RemoteInfo>> = new Map();

        if (output) {
          for (const line of output.split('\n').filter(Boolean)) {
            const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
            if (match) {
              const [, name, url, type] = match;
              if (!name || !url) continue;

              const existing = remotes.get(name) ?? { name, isOrigin: name === 'origin' };

              if (type === 'fetch') {
                existing.fetchUrl = url;
              } else {
                existing.pushUrl = url;
              }

              remotes.set(name, existing);
            }
          }
        }

        const remoteInfos: RemoteInfo[] = Array.from(remotes.values())
          .filter((r): r is RemoteInfo =>
            typeof r.name === 'string' &&
            typeof r.fetchUrl === 'string' &&
            typeof r.pushUrl === 'string' &&
            typeof r.isOrigin === 'boolean'
          );

        setResult({
          data: remoteInfos,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchRemotes();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// Stashes Hook
// ============================================================================

/**
 * Hook to get stash entries
 *
 * @returns Async result with stash entries array
 *
 * @example
 * ```typescript
 * const stashes = useStashes();
 *
 * useEffect(() => {
 *   const s = stashes();
 *   if (s.data && s.data.length > 0) {
 *     console.log('Latest stash:', s.data[0].message);
 *   }
 * });
 * ```
 */
export function useStashes(): () => AsyncHookResult<readonly StashEntry[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly StashEntry[]>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchStashes() {
      try {
        const format = '%H%n%gd%n%gs%n%aI';
        const output = await gitOrNull(
          ['stash', 'list', `--format=${format}`],
          cwd,
        );

        if (cancelled) return;

        const stashes: StashEntry[] = [];

        if (output) {
          const lines = output.split('\n');
          for (let i = 0; i < lines.length; i += 4) {
            const sha = lines[i];
            const reflog = lines[i + 1];
            const message = lines[i + 2];
            const timestamp = lines[i + 3];

            if (sha && reflog && message && timestamp) {
              // Parse stash index from reflog (stash@{0})
              const indexMatch = reflog.match(/stash@\{(\d+)\}/);
              const index = indexMatch ? parseInt(indexMatch[1] ?? '0', 10) : stashes.length;

              // Parse branch from message
              const branchMatch = message.match(/^WIP on (\S+):/);
              const branch = branchMatch?.[1];

              stashes.push({
                index,
                sha,
                message,
                timestamp: new Date(timestamp),
                branch,
              });
            }
          }
        }

        setResult({
          data: stashes,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchStashes();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// Tags Hook
// ============================================================================

/**
 * Hook to get repository tags
 *
 * @returns Async result with tags array
 *
 * @example
 * ```typescript
 * const tags = useTags();
 *
 * useEffect(() => {
 *   const t = tags();
 *   if (t.data) {
 *     console.log('Tags:', t.data.map(tag => tag.name).join(', '));
 *   }
 * });
 * ```
 */
export function useTags(): () => AsyncHookResult<readonly TagInfo[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly TagInfo[]>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchTags() {
      try {
        // Get all tags with their target SHAs
        const output = await gitOrNull(
          ['tag', '-l', '--format=%(refname:short)%09%(objecttype)%09%(*objectname)%09%(objectname)'],
          cwd,
        );

        if (cancelled) return;

        const tags: TagInfo[] = [];

        if (output) {
          for (const line of output.split('\n').filter(Boolean)) {
            const [name, objectType, deref, objectName] = line.split('\t');
            if (!name || !objectName) continue;

            const isAnnotated = objectType === 'tag';
            const targetSha = isAnnotated && deref ? deref : objectName;

            tags.push({
              name,
              type: isAnnotated ? 'annotated' : 'lightweight',
              targetSha,
              tagSha: isAnnotated ? objectName : undefined,
            });
          }
        }

        setResult({
          data: tags,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// Worktrees Hook
// ============================================================================

/**
 * Hook to get worktree information
 *
 * @returns Async result with worktrees array
 *
 * @example
 * ```typescript
 * const worktrees = useWorktrees();
 *
 * useEffect(() => {
 *   const w = worktrees();
 *   if (w.data) {
 *     const main = w.data.find(wt => wt.isMain);
 *     console.log('Main worktree:', main?.path);
 *   }
 * });
 * ```
 */
export function useWorktrees(): () => AsyncHookResult<readonly WorktreeInfo[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly WorktreeInfo[]>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchWorktrees() {
      try {
        const output = await git(['worktree', 'list', '--porcelain'], cwd);

        if (cancelled) return;

        const worktrees: WorktreeInfo[] = [];
        let current: Partial<WorktreeInfo> = {};
        let isFirst = true;

        for (const line of output.split('\n')) {
          if (line.startsWith('worktree ')) {
            if (current.path) {
              worktrees.push(current as WorktreeInfo);
            }
            current = {
              path: line.substring(9),
              isMain: isFirst,
              isBare: false,
              isLocked: false,
              isPrunable: false,
            };
            isFirst = false;
          } else if (line.startsWith('HEAD ')) {
            current.head = line.substring(5);
          } else if (line.startsWith('branch ')) {
            current.branch = line.substring(7).replace('refs/heads/', '');
          } else if (line === 'detached') {
            current.branch = null;
          } else if (line === 'bare') {
            current.isBare = true;
          } else if (line === 'locked') {
            current.isLocked = true;
          } else if (line.startsWith('locked ')) {
            current.isLocked = true;
            current.lockReason = line.substring(7);
          } else if (line === 'prunable') {
            current.isPrunable = true;
          }
        }

        if (current.path) {
          worktrees.push(current as WorktreeInfo);
        }

        setResult({
          data: worktrees,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchWorktrees();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}

// ============================================================================
// Complete Repository State Hook
// ============================================================================

/**
 * Hook to get complete repository state
 * Combines all repository information into a single reactive state
 *
 * @param options - Repository state options
 * @returns Async result with complete repository state
 *
 * @example
 * ```typescript
 * const state = useRepositoryState({
 *   includeStashes: true,
 *   includeFiles: true,
 * });
 *
 * useEffect(() => {
 *   const s = state();
 *   if (s.data) {
 *     console.log('Branch:', s.data.branch.name);
 *     console.log('Clean:', s.data.status.clean);
 *   }
 * });
 * ```
 */
export function useRepositoryState(
  options: RepositoryStateOptions = {},
): () => AsyncHookResult<RepositoryState> {
  const opts = { ...DEFAULT_REPOSITORY_STATE_OPTIONS, ...options };

  const repoInfo = useRepositoryInfo();
  const branchInfo = useBranchInfo();
  const headInfo = useHeadInfo();
  const status = useWorkingDirectoryStatus({ includeFiles: opts.includeFiles });
  const remotes = useRemotes();
  const stashes = opts.includeStashes ? useStashes() : null;
  const tags = useTags();
  const worktrees = useWorktrees();

  return useComputed(() => {
    const repo = repoInfo();
    const branch = branchInfo();
    const head = headInfo();
    const st = status();
    const rem = remotes();
    const stash = stashes?.() ?? { data: [], loading: false, error: null, executed: true, duration: 0, attempts: 0, cached: false };
    const tag = tags();
    const wt = worktrees();

    // Check if any are still loading
    const loading =
      repo.loading ||
      branch.loading ||
      head.loading ||
      st.loading ||
      rem.loading ||
      stash.loading ||
      tag.loading ||
      wt.loading;

    // Collect any errors
    const error =
      repo.error ??
      branch.error ??
      head.error ??
      st.error ??
      rem.error ??
      stash.error ??
      tag.error ??
      wt.error;

    if (loading) {
      return {
        data: null,
        error: null,
        loading: true,
        executed: false,
        duration: 0,
        attempts: 0,
        cached: false,
      };
    }

    if (error || !repo.data || !branch.data || !head.data || !st.data || !rem.data || !tag.data || !wt.data) {
      return {
        data: null,
        error: error ?? new Error('Failed to load repository state'),
        loading: false,
        executed: true,
        duration: 0,
        attempts: 1,
        cached: false,
      };
    }

    const state: RepositoryState = {
      info: repo.data,
      branch: branch.data,
      head: head.data,
      status: st.data,
      remotes: rem.data,
      stashes: stash.data ?? [],
      tags: tag.data,
      worktrees: wt.data,
      submodules: [], // TODO: Implement submodule hook
      lastUpdated: new Date(),
    };

    return {
      data: state,
      error: null,
      loading: false,
      executed: true,
      duration: Math.max(repo.duration, branch.duration, head.duration, st.duration),
      attempts: 1,
      cached: false,
    };
  });
}

// ============================================================================
// Convenience Computed Hooks
// ============================================================================

/**
 * Hook to check if repository is dirty (has uncommitted changes)
 */
export function useIsDirty(): () => boolean {
  const status = useWorkingDirectoryStatus({ includeFiles: false });

  return useComputed(() => {
    const s = status();
    return s.data ? !s.data.clean : false;
  });
}

/**
 * Hook to get current branch name
 */
export function useCurrentBranch(): () => string | null {
  const branch = useBranchInfo();

  return useComputed(() => {
    const b = branch();
    return b.data?.name ?? null;
  });
}

/**
 * Hook to get current commit SHA
 */
export function useCurrentSha(): () => string | null {
  const head = useHeadInfo();

  return useComputed(() => {
    const h = head();
    return h.data?.sha ?? null;
  });
}
