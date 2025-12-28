/**
 * @fileoverview GitVan v4 - Git Operations Hook Types
 *
 * Type definitions for Git operation hooks providing type-safe
 * wrappers around Git commands.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// Git Command Result Types
// ============================================================================

/**
 * Base result type for git operations
 */
export interface GitOperationResult {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** Standard output */
  readonly stdout: string;
  /** Standard error */
  readonly stderr: string;
  /** Execution duration in milliseconds */
  readonly duration: number;
}

/**
 * Successful git operation result
 */
export interface GitOperationSuccess extends GitOperationResult {
  readonly success: true;
}

/**
 * Failed git operation result
 */
export interface GitOperationError extends GitOperationResult {
  readonly success: false;
  /** Error that occurred */
  readonly error: Error;
  /** Git exit code */
  readonly exitCode: number;
}

// ============================================================================
// Commit Operation Types
// ============================================================================

/**
 * Options for commit operations
 */
export interface CommitOptions {
  /** Commit message */
  readonly message: string;
  /** Sign commit with GPG */
  readonly sign?: boolean;
  /** Allow empty commit */
  readonly allowEmpty?: boolean;
  /** Amend the previous commit */
  readonly amend?: boolean;
  /** Override author */
  readonly author?: string;
  /** Override date */
  readonly date?: string;
  /** Fixup commit SHA */
  readonly fixup?: string;
  /** Squash commit SHA */
  readonly squash?: string;
}

/**
 * Result of a commit operation
 */
export interface CommitResult extends GitOperationSuccess {
  /** New commit SHA */
  readonly sha: string;
  /** Short commit SHA */
  readonly shortSha: string;
  /** Commit message subject */
  readonly subject: string;
}

// ============================================================================
// Branch Operation Types
// ============================================================================

/**
 * Options for branch creation
 */
export interface BranchCreateOptions {
  /** Branch name */
  readonly name: string;
  /** Starting point (commit, branch, or tag) */
  readonly startPoint?: string;
  /** Force create (overwrite existing) */
  readonly force?: boolean;
  /** Track a remote branch */
  readonly track?: string;
  /** Don't set up tracking */
  readonly noTrack?: boolean;
}

/**
 * Options for branch deletion
 */
export interface BranchDeleteOptions {
  /** Branch name(s) to delete */
  readonly names: readonly string[];
  /** Force delete (even if not merged) */
  readonly force?: boolean;
  /** Delete remote branch */
  readonly remote?: string;
}

/**
 * Options for branch listing
 */
export interface BranchListOptions {
  /** Include remote branches */
  readonly all?: boolean;
  /** Only remote branches */
  readonly remotes?: boolean;
  /** Only merged branches */
  readonly merged?: string;
  /** Only unmerged branches */
  readonly noMerged?: string;
  /** Sort by criteria */
  readonly sort?: 'refname' | 'committerdate' | 'authordate';
  /** Pattern to filter branches */
  readonly pattern?: string;
}

/**
 * Branch information from list operation
 */
export interface BranchListItem {
  /** Branch name */
  readonly name: string;
  /** Whether this is the current branch */
  readonly isCurrent: boolean;
  /** Latest commit SHA */
  readonly sha: string;
  /** Upstream branch if any */
  readonly upstream?: string;
  /** Whether branch is remote */
  readonly isRemote: boolean;
}

// ============================================================================
// Checkout Operation Types
// ============================================================================

/**
 * Options for checkout operations
 */
export interface CheckoutOptions {
  /** Target ref (branch, tag, or commit) */
  readonly target: string;
  /** Create new branch */
  readonly create?: boolean;
  /** Force checkout (discard local changes) */
  readonly force?: boolean;
  /** Track a remote branch */
  readonly track?: string;
  /** Detach HEAD */
  readonly detach?: boolean;
  /** Checkout specific paths */
  readonly paths?: readonly string[];
}

// ============================================================================
// Merge Operation Types
// ============================================================================

/**
 * Options for merge operations
 */
export interface MergeOptions {
  /** Branch(es) to merge */
  readonly branches: readonly string[];
  /** Merge message */
  readonly message?: string;
  /** Create merge commit even if fast-forward */
  readonly noFf?: boolean;
  /** Only allow fast-forward */
  readonly ffOnly?: boolean;
  /** Squash merge */
  readonly squash?: boolean;
  /** Don't commit after merge */
  readonly noCommit?: boolean;
  /** Merge strategy */
  readonly strategy?: 'recursive' | 'resolve' | 'octopus' | 'ours' | 'subtree';
  /** Strategy options */
  readonly strategyOption?: string;
  /** Sign merge commit */
  readonly sign?: boolean;
}

/**
 * Result of a merge operation
 */
export interface MergeResult extends GitOperationResult {
  /** Whether merge was successful */
  readonly merged: boolean;
  /** Whether a merge commit was created */
  readonly commitCreated: boolean;
  /** Merge commit SHA if created */
  readonly sha?: string;
  /** Whether merge was fast-forward */
  readonly fastForward: boolean;
  /** Conflicted files if any */
  readonly conflicts: readonly string[];
}

// ============================================================================
// Rebase Operation Types
// ============================================================================

/**
 * Options for rebase operations
 */
export interface RebaseOptions {
  /** Target to rebase onto */
  readonly onto: string;
  /** Interactive rebase */
  readonly interactive?: boolean;
  /** Continue after conflict resolution */
  readonly continue?: boolean;
  /** Abort the rebase */
  readonly abort?: boolean;
  /** Skip current commit */
  readonly skip?: boolean;
  /** Preserve merge commits */
  readonly preserveMerges?: boolean;
  /** Autosquash fixup/squash commits */
  readonly autosquash?: boolean;
  /** Sign rebased commits */
  readonly sign?: boolean;
}

/**
 * Result of a rebase operation
 */
export interface RebaseResult extends GitOperationResult {
  /** Whether rebase completed */
  readonly completed: boolean;
  /** Number of commits rebased */
  readonly commitsRebased: number;
  /** Whether there are conflicts */
  readonly hasConflicts: boolean;
  /** Conflicted files if any */
  readonly conflicts: readonly string[];
}

// ============================================================================
// Reset Operation Types
// ============================================================================

/**
 * Reset mode
 */
export type ResetMode = 'soft' | 'mixed' | 'hard' | 'merge' | 'keep';

/**
 * Options for reset operations
 */
export interface ResetOptions {
  /** Reset mode */
  readonly mode: ResetMode;
  /** Target commit */
  readonly target?: string;
  /** Specific paths to reset */
  readonly paths?: readonly string[];
}

// ============================================================================
// Remote Operation Types
// ============================================================================

/**
 * Options for fetch operations
 */
export interface FetchOptions {
  /** Remote to fetch from */
  readonly remote?: string;
  /** Refspec to fetch */
  readonly refspec?: string;
  /** Fetch all remotes */
  readonly all?: boolean;
  /** Prune deleted refs */
  readonly prune?: boolean;
  /** Fetch tags */
  readonly tags?: boolean;
  /** Depth limit */
  readonly depth?: number;
  /** Unshallow a shallow clone */
  readonly unshallow?: boolean;
}

/**
 * Options for push operations
 */
export interface PushOptions {
  /** Remote to push to */
  readonly remote?: string;
  /** Branch to push */
  readonly branch?: string;
  /** Force push */
  readonly force?: boolean;
  /** Force with lease (safer) */
  readonly forceWithLease?: boolean;
  /** Set upstream */
  readonly setUpstream?: boolean;
  /** Push tags */
  readonly tags?: boolean;
  /** Delete remote ref */
  readonly delete?: boolean;
  /** Dry run */
  readonly dryRun?: boolean;
}

/**
 * Result of a push operation
 */
export interface PushResult extends GitOperationResult {
  /** Remote that was pushed to */
  readonly remote: string;
  /** Branch that was pushed */
  readonly branch: string;
  /** Whether push was rejected */
  readonly rejected: boolean;
  /** New SHA on remote */
  readonly newSha?: string;
}

/**
 * Options for pull operations
 */
export interface PullOptions {
  /** Remote to pull from */
  readonly remote?: string;
  /** Branch to pull */
  readonly branch?: string;
  /** Rebase instead of merge */
  readonly rebase?: boolean;
  /** Fast-forward only */
  readonly ffOnly?: boolean;
  /** No fast-forward */
  readonly noFf?: boolean;
  /** Squash merge */
  readonly squash?: boolean;
  /** Autostash before operation */
  readonly autostash?: boolean;
}

// ============================================================================
// Stash Operation Types
// ============================================================================

/**
 * Options for stash save
 */
export interface StashSaveOptions {
  /** Stash message */
  readonly message?: string;
  /** Include untracked files */
  readonly includeUntracked?: boolean;
  /** Keep staged changes */
  readonly keepIndex?: boolean;
  /** Include all files (including ignored) */
  readonly all?: boolean;
  /** Specific paths to stash */
  readonly paths?: readonly string[];
}

/**
 * Options for stash apply/pop
 */
export interface StashApplyOptions {
  /** Stash index or ref */
  readonly stash?: string | number;
  /** Reinstate index state */
  readonly index?: boolean;
  /** Pop (remove) instead of apply */
  readonly pop?: boolean;
}

// ============================================================================
// Tag Operation Types
// ============================================================================

/**
 * Options for tag creation
 */
export interface TagCreateOptions {
  /** Tag name */
  readonly name: string;
  /** Target commit */
  readonly target?: string;
  /** Tag message (creates annotated tag) */
  readonly message?: string;
  /** Sign tag */
  readonly sign?: boolean;
  /** Force (overwrite existing) */
  readonly force?: boolean;
}

/**
 * Options for tag deletion
 */
export interface TagDeleteOptions {
  /** Tag name(s) to delete */
  readonly names: readonly string[];
}

// ============================================================================
// Diff Operation Types
// ============================================================================

/**
 * Options for diff operations
 */
export interface DiffOptions {
  /** First commit/branch */
  readonly from?: string;
  /** Second commit/branch */
  readonly to?: string;
  /** Show staged changes */
  readonly staged?: boolean;
  /** Show only names */
  readonly nameOnly?: boolean;
  /** Show name and status */
  readonly nameStatus?: boolean;
  /** Show stats */
  readonly stat?: boolean;
  /** Specific paths */
  readonly paths?: readonly string[];
  /** Context lines */
  readonly context?: number;
  /** Detect renames */
  readonly renames?: boolean;
}

/**
 * Diff file entry
 */
export interface DiffEntry {
  /** File path */
  readonly path: string;
  /** Original path (for renames) */
  readonly originalPath?: string;
  /** Change type */
  readonly type: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  /** Lines added */
  readonly additions: number;
  /** Lines deleted */
  readonly deletions: number;
  /** Whether file is binary */
  readonly isBinary: boolean;
}

/**
 * Result of a diff operation
 */
export interface DiffResult extends GitOperationResult {
  /** Diff entries */
  readonly entries: readonly DiffEntry[];
  /** Total additions */
  readonly totalAdditions: number;
  /** Total deletions */
  readonly totalDeletions: number;
  /** Number of files changed */
  readonly filesChanged: number;
}

// ============================================================================
// Log Operation Types
// ============================================================================

/**
 * Options for log operations
 */
export interface LogOptions {
  /** Maximum number of commits */
  readonly maxCount?: number;
  /** Skip first N commits */
  readonly skip?: number;
  /** Since date */
  readonly since?: string | Date;
  /** Until date */
  readonly until?: string | Date;
  /** Author pattern */
  readonly author?: string;
  /** Grep commit message */
  readonly grep?: string;
  /** Path filter */
  readonly paths?: readonly string[];
  /** Start from ref */
  readonly from?: string;
  /** End at ref */
  readonly to?: string;
  /** First parent only (for merges) */
  readonly firstParent?: boolean;
  /** Include merge commits */
  readonly merges?: boolean;
  /** Exclude merge commits */
  readonly noMerges?: boolean;
}

/**
 * Commit entry from log
 */
export interface LogEntry {
  /** Full commit SHA */
  readonly sha: string;
  /** Short commit SHA */
  readonly shortSha: string;
  /** Commit message subject */
  readonly subject: string;
  /** Full commit message */
  readonly body?: string;
  /** Author name */
  readonly authorName: string;
  /** Author email */
  readonly authorEmail: string;
  /** Author date */
  readonly authorDate: Date;
  /** Committer name */
  readonly committerName: string;
  /** Committer email */
  readonly committerEmail: string;
  /** Commit date */
  readonly commitDate: Date;
  /** Parent commit SHAs */
  readonly parents: readonly string[];
  /** Whether this is a merge commit */
  readonly isMerge: boolean;
}

// ============================================================================
// Clean Operation Types
// ============================================================================

/**
 * Options for clean operations
 */
export interface CleanOptions {
  /** Force clean */
  readonly force?: boolean;
  /** Include directories */
  readonly directories?: boolean;
  /** Include ignored files */
  readonly ignored?: boolean;
  /** Dry run */
  readonly dryRun?: boolean;
  /** Interactive mode (not recommended for hooks) */
  readonly interactive?: boolean;
  /** Paths to clean */
  readonly paths?: readonly string[];
}
