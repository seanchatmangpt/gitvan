/**
 * GitVan v2 Job Type Definitions
 * Frozen interfaces for job system
 */

export type JobKind =
  | 'commit'
  | 'branch'
  | 'tag'
  | 'merge'
  | 'rebase'
  | 'push'
  | 'pull'
  | 'clone'
  | 'init'
  | 'status'
  | 'diff'
  | 'log'
  | 'custom';

export interface JobMeta {
  /** Unique identifier for the job */
  id: string;
  /** Human-readable name */
  name: string;
  /** Job description */
  description?: string;
  /** Job category/kind */
  kind: JobKind;
  /** Job tags for filtering */
  tags?: string[];
  /** Job version */
  version?: string;
  /** Author information */
  author?: string;
  /** Creation timestamp */
  createdAt?: Date;
  /** Last modified timestamp */
  updatedAt?: Date;
}

export interface JobCtx {
  /** Current working directory */
  cwd: string;
  /** Environment variables */
  env: Record<string, string>;
  /** Job arguments */
  args: Record<string, any>;
  /** Git repository information */
  git: {
    branch: string;
    commit: string;
    remote?: string;
    isDirty: boolean;
  };
  /** User information */
  user: {
    name?: string;
    email?: string;
  };
  /** Execution timestamp */
  timestamp: Date;
  /** Session ID for grouping related jobs */
  sessionId: string;
}

export interface JobResult {
  /** Execution success status */
  success: boolean;
  /** Exit code (0 = success) */
  exitCode: number;
  /** Standard output */
  stdout?: string;
  /** Standard error */
  stderr?: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Result data */
  data?: any;
  /** Error information if failed */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  /** Files created/modified during execution */
  files?: {
    created: string[];
    modified: string[];
    deleted: string[];
  };
}

export interface Job {
  /** Job metadata */
  meta: JobMeta;
  /** Execution context */
  ctx: JobCtx;
  /** Execution result */
  result?: JobResult;
  /** Job execution function */
  execute?: (ctx: JobCtx) => Promise<JobResult> | JobResult;
  /** Pre-execution hooks */
  beforeExecute?: (ctx: JobCtx) => Promise<void> | void;
  /** Post-execution hooks */
  afterExecute?: (ctx: JobCtx, result: JobResult) => Promise<void> | void;
}

export interface DefineJob {
  /** Job metadata */
  meta: Omit<JobMeta, 'id' | 'createdAt' | 'updatedAt'>;
  /** Job execution function */
  execute: (ctx: JobCtx) => Promise<JobResult> | JobResult;
  /** Pre-execution hooks */
  beforeExecute?: (ctx: JobCtx) => Promise<void> | void;
  /** Post-execution hooks */
  afterExecute?: (ctx: JobCtx, result: JobResult) => Promise<void> | void;
}