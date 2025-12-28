/**
 * @fileoverview GitVan v4 - Repository State Hook Types
 *
 * Type definitions for repository state management hooks.
 * Provides comprehensive types for tracking Git repository state.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// Repository Info Types
// ============================================================================

/**
 * Basic repository information
 */
export interface RepositoryInfo {
  /** Repository root directory path */
  readonly root: string;
  /** Whether this is a Git repository */
  readonly isRepository: boolean;
  /** Whether this is a bare repository */
  readonly isBare: boolean;
  /** Whether this is inside a worktree */
  readonly isWorktree: boolean;
  /** Git directory path (.git or .git/worktrees/xxx) */
  readonly gitDir: string;
}

/**
 * Current branch information
 */
export interface BranchInfo {
  /** Current branch name or null if detached */
  readonly name: string | null;
  /** Whether HEAD is detached */
  readonly isDetached: boolean;
  /** Upstream branch if set */
  readonly upstream?: string;
  /** Tracking status relative to upstream */
  readonly tracking?: TrackingStatus;
}

/**
 * Tracking status relative to upstream
 */
export interface TrackingStatus {
  /** Number of commits ahead of upstream */
  readonly ahead: number;
  /** Number of commits behind upstream */
  readonly behind: number;
  /** Whether the branch has diverged */
  readonly diverged: boolean;
}

/**
 * Current HEAD information
 */
export interface HeadInfo {
  /** Full commit SHA */
  readonly sha: string;
  /** Short commit SHA (7 chars) */
  readonly shortSha: string;
  /** Commit message subject */
  readonly subject: string;
  /** Commit author */
  readonly author: CommitAuthor;
  /** Commit timestamp */
  readonly timestamp: Date;
}

/**
 * Commit author information
 */
export interface CommitAuthor {
  /** Author name */
  readonly name: string;
  /** Author email */
  readonly email: string;
}

// ============================================================================
// Working Directory Types
// ============================================================================

/**
 * Working directory status
 */
export interface WorkingDirectoryStatus {
  /** Whether the working directory is clean */
  readonly clean: boolean;
  /** Number of staged files */
  readonly staged: number;
  /** Number of unstaged modified files */
  readonly unstaged: number;
  /** Number of untracked files */
  readonly untracked: number;
  /** Number of conflicted files */
  readonly conflicted: number;
  /** Detailed file changes */
  readonly files: readonly FileChange[];
}

/**
 * File change status codes
 */
export type FileStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'conflicted';

/**
 * Individual file change
 */
export interface FileChange {
  /** File path relative to repository root */
  readonly path: string;
  /** Original path for renamed/copied files */
  readonly originalPath?: string;
  /** Index status (staged) */
  readonly indexStatus: FileStatus | null;
  /** Worktree status (unstaged) */
  readonly worktreeStatus: FileStatus | null;
  /** Whether file is binary */
  readonly isBinary: boolean;
}

// ============================================================================
// Remote Types
// ============================================================================

/**
 * Remote repository information
 */
export interface RemoteInfo {
  /** Remote name */
  readonly name: string;
  /** Fetch URL */
  readonly fetchUrl: string;
  /** Push URL */
  readonly pushUrl: string;
  /** Default branch on remote */
  readonly defaultBranch?: string;
  /** Whether this is the origin remote */
  readonly isOrigin: boolean;
}

/**
 * Remote branch information
 */
export interface RemoteBranchInfo {
  /** Full ref name (refs/remotes/origin/main) */
  readonly ref: string;
  /** Remote name */
  readonly remote: string;
  /** Branch name on remote */
  readonly branch: string;
  /** Latest commit SHA */
  readonly sha: string;
}

// ============================================================================
// Stash Types
// ============================================================================

/**
 * Stash entry information
 */
export interface StashEntry {
  /** Stash index (stash@{0}) */
  readonly index: number;
  /** Stash commit SHA */
  readonly sha: string;
  /** Stash message */
  readonly message: string;
  /** Creation timestamp */
  readonly timestamp: Date;
  /** Branch the stash was created on */
  readonly branch?: string;
}

// ============================================================================
// Tag Types
// ============================================================================

/**
 * Tag information
 */
export interface TagInfo {
  /** Tag name */
  readonly name: string;
  /** Tag type (lightweight or annotated) */
  readonly type: 'lightweight' | 'annotated';
  /** Target commit SHA */
  readonly targetSha: string;
  /** Tag object SHA (for annotated tags) */
  readonly tagSha?: string;
  /** Tag message (for annotated tags) */
  readonly message?: string;
  /** Tagger information (for annotated tags) */
  readonly tagger?: CommitAuthor;
  /** Tag timestamp (for annotated tags) */
  readonly timestamp?: Date;
}

// ============================================================================
// Worktree Types
// ============================================================================

/**
 * Worktree information
 */
export interface WorktreeInfo {
  /** Worktree path */
  readonly path: string;
  /** HEAD commit SHA */
  readonly head: string;
  /** Branch name or null if detached */
  readonly branch: string | null;
  /** Whether this is the main worktree */
  readonly isMain: boolean;
  /** Whether the worktree is bare */
  readonly isBare: boolean;
  /** Whether the worktree is locked */
  readonly isLocked: boolean;
  /** Lock reason if locked */
  readonly lockReason?: string;
  /** Whether the worktree is prunable */
  readonly isPrunable: boolean;
}

// ============================================================================
// Submodule Types
// ============================================================================

/**
 * Submodule information
 */
export interface SubmoduleInfo {
  /** Submodule name */
  readonly name: string;
  /** Submodule path relative to repository root */
  readonly path: string;
  /** Remote URL */
  readonly url: string;
  /** Currently checked out commit SHA */
  readonly sha: string;
  /** Branch to track */
  readonly branch?: string;
  /** Submodule status */
  readonly status: SubmoduleStatus;
}

/**
 * Submodule status
 */
export interface SubmoduleStatus {
  /** Whether the submodule is initialized */
  readonly initialized: boolean;
  /** Whether the submodule has uncommitted changes */
  readonly modified: boolean;
  /** Whether the submodule has untracked files */
  readonly untracked: boolean;
  /** Whether the submodule commit differs from .gitmodules */
  readonly commitChanged: boolean;
}

// ============================================================================
// Complete Repository State
// ============================================================================

/**
 * Complete repository state
 */
export interface RepositoryState {
  /** Repository info */
  readonly info: RepositoryInfo;
  /** Current branch info */
  readonly branch: BranchInfo;
  /** Current HEAD info */
  readonly head: HeadInfo;
  /** Working directory status */
  readonly status: WorkingDirectoryStatus;
  /** Remote repositories */
  readonly remotes: readonly RemoteInfo[];
  /** Stash entries */
  readonly stashes: readonly StashEntry[];
  /** Tags */
  readonly tags: readonly TagInfo[];
  /** Worktrees */
  readonly worktrees: readonly WorktreeInfo[];
  /** Submodules */
  readonly submodules: readonly SubmoduleInfo[];
  /** State last updated timestamp */
  readonly lastUpdated: Date;
}

// ============================================================================
// Hook Option Types
// ============================================================================

/**
 * Options for repository state hooks
 */
export interface RepositoryStateOptions {
  /** Auto-refresh interval in milliseconds (0 = disabled) */
  readonly autoRefresh?: number;
  /** Watch for file system changes */
  readonly watchFileSystem?: boolean;
  /** Include submodule information */
  readonly includeSubmodules?: boolean;
  /** Include stash information */
  readonly includeStashes?: boolean;
  /** Include detailed file changes */
  readonly includeFiles?: boolean;
  /** Maximum number of recent commits to track */
  readonly maxRecentCommits?: number;
}

/**
 * Default repository state options
 */
export const DEFAULT_REPOSITORY_STATE_OPTIONS: Required<RepositoryStateOptions> = {
  autoRefresh: 0,
  watchFileSystem: false,
  includeSubmodules: false,
  includeStashes: true,
  includeFiles: true,
  maxRecentCommits: 10,
} as const;
