/**
 * @fileoverview GitVan v2 - Comprehensive TypeScript Definitions
 *
 * This file provides complete type definitions for the GitVan development automation platform.
 * GitVan uses Git as a runtime environment for development workflows, knowledge hooks, and
 * intelligent automation.
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/// <reference types="node" />

/**
 * JSON value type definition
 *
 * @typedef Json
 * @description Represents any valid JSON value
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/**
 * Execution type enumeration
 *
 * @typedef Exec
 * @description Supported execution types in GitVan
 */
export type Exec = "cli" | "js" | "llm" | "job" | "tmpl";

/**
 * Execution specification union type
 *
 * @typedef ExecSpec
 * @description All supported execution specification types
 */
export type ExecSpec =
  | {
      exec: "cli";
      cmd: string;
      args?: string[];
      env?: Record<string, string>;
      timeoutMs?: number;
    }
  | {
      exec: "js";
      module: string;
      export?: string;
      input?: Json;
      timeoutMs?: number;
    }
  | {
      exec: "llm";
      model: string;
      prompt?: string;
      input?: Json;
      options?: Record<string, Json>;
      timeoutMs?: number;
    }
  | { exec: "job"; name: string }
  | {
      exec: "tmpl";
      /** path to .njk file, relative to repo root or absolute */
      template: string;
      /** data object merged with { git: GitContext, nowISO: string } */
      data?: Json;
      /** optional output file path; if omitted return string only */
      out?: string;
      /** autoescape html; default false */
      autoescape?: boolean;
      /** additional search paths for includes/extends */
      paths?: string[];
    };

/**
 * Job execution result interface
 *
 * @interface JobResult
 * @description Result returned from job execution
 */
export interface JobResult {
  /** Whether the job completed successfully */
  ok: boolean;
  /** Standard output from job execution */
  stdout?: string;
  /** Standard error from job execution */
  stderr?: string;
  /** Optional artifact path created by the job */
  artifact?: string;
  /** Additional metadata */
  meta?: Record<string, any>;
}

/**
 * Job execution context interface
 *
 * @interface JobContext
 * @description Context provided to job execution functions
 */
export interface JobContext {
  /** Repository root directory path */
  root: string;
  /** Environment variables */
  env: Record<string, string>;
  /** Current HEAD commit SHA */
  head?: string;
  /** Current branch name */
  branch?: string;
  /** Timestamp function for consistent time handling */
  now?: () => string;
}

/**
 * Job definition interface
 *
 * @interface JobDef
 * @description Defines a job with its metadata and execution logic
 */
export interface JobDef {
  /** Job type classification */
  kind: "atomic" | "composite";
  /** Job metadata */
  meta?: {
    /** Job description */
    desc?: string;
    /** Schedule expression */
    schedule?: string;
    /** Job tags */
    tags?: string[];
    /** Additional metadata */
    [key: string]: any;
  };
  /** Job execution function */
  run?: (params: { payload?: any; ctx?: JobContext }) => Promise<JobResult>;
  /** Alternative execution specification */
  action?: ExecSpec;
}

/**
 * Define a job with type safety
 *
 * @function defineJob
 * @template T - Job definition type
 * @param {T} def - Job definition
 * @returns {T} Job definition
 */
export function defineJob<T extends JobDef>(def: T): T;

// ============================================================================
// COMPOSABLE INTERFACES
// ============================================================================

/**
 * Git operations composable interface
 *
 * @interface GitComposable
 * @description Provides access to Git operations within GitVan context
 */
export interface GitComposable {
  /** Repository root directory */
  root: string;
  /** Get current HEAD commit SHA */
  head(): string;
  /** Get current branch name */
  branch(): string;
  /** Run arbitrary Git command */
  run(args: string): string;
  /** Add note to Git object */
  note(ref: string, msg: string, sha?: string): string;
  /** Append note to Git object */
  appendNote(ref: string, msg: string, sha?: string): string;
  /** Set Git reference */
  setRef(ref: string, sha: string): string;
  /** Delete Git reference */
  delRef(ref: string): string;
  /** List Git references with prefix */
  listRefs(prefix: string): string[];
}

/**
 * Template rendering composable interface
 *
 * @interface TemplateComposable
 * @description Provides access to template rendering within GitVan context
 */
export interface TemplateComposable {
  /** Render template string with data */
  render(template: string, data?: Record<string, any>): string;
  /** Render template to file */
  renderToFile(
    template: string,
    out: string,
    data?: Record<string, any>
  ): { path: string; bytes: number };
  /** Template environment */
  env: any;
}

/**
 * Execution composable interface
 *
 * @interface ExecComposable
 * @description Provides access to execution capabilities within GitVan context
 */
export interface ExecComposable {
  /** Execute CLI command */
  cli(cmd: string, args?: string[], env?: Record<string, string>): JobResult;
  /** Execute JavaScript module */
  js(modulePath: string, exportName?: string, input?: any): Promise<JobResult>;
  /** Execute template rendering */
  tmpl(spec: {
    template: string;
    out?: string;
    data?: any;
    autoescape?: boolean;
    paths?: string[];
  }): JobResult;
}

// ============================================================================
// COMPOSABLE FUNCTIONS
// ============================================================================

/**
 * Get GitVan runtime context
 *
 * @function useGitVan
 * @returns {JobContext} GitVan runtime context
 */
export function useGitVan(): JobContext;

/**
 * Execute function within GitVan context
 *
 * @function withGitVan
 * @template T - Return type
 * @param {JobContext} ctx - GitVan context
 * @param {Function} fn - Function to execute
 * @returns {T} Function result
 */
export function withGitVan<T>(ctx: JobContext, fn: () => T): T;

/**
 * Get Git operations composable
 *
 * @function useGit
 * @returns {GitComposable} Git operations interface
 */
export function useGit(): GitComposable;

/**
 * Get template rendering composable
 *
 * @function useTemplate
 * @param {Object} opts - Template options
 * @param {boolean} [opts.autoescape] - Enable HTML auto-escape
 * @param {string[]} [opts.paths] - Additional template search paths
 * @returns {TemplateComposable} Template operations interface
 */
export function useTemplate(opts?: {
  autoescape?: boolean;
  paths?: string[];
}): TemplateComposable;

/**
 * Get execution composable
 *
 * @function useExec
 * @returns {ExecComposable} Execution operations interface
 */
export function useExec(): ExecComposable;

// ============================================================================
// DAEMON AND LOCK MANAGEMENT
// ============================================================================

/**
 * GitVan daemon class
 *
 * @class GitVanDaemon
 * @description Manages the GitVan daemon process
 */
export class GitVanDaemon {
  /**
   * Create GitVan daemon instance
   *
   * @constructor
   * @param {string} worktreePath - Path to worktree
   */
  constructor(worktreePath: string);

  /** Start the daemon */
  start(): void;

  /** Stop the daemon */
  stop(): void;

  /** Check if daemon is running */
  isRunning(): boolean;

  /** Get lock by name */
  getLock(name: string): any;
}

/**
 * Lock manager class
 *
 * @class LockManager
 * @description Manages distributed locks using Git refs
 */
export class LockManager {
  /**
   * Create lock manager instance
   *
   * @constructor
   * @param {string} worktreePath - Path to worktree
   */
  constructor(worktreePath: string);

  /**
   * Acquire lock with optional timeout
   *
   * @param {string} name - Lock name
   * @param {number} [timeoutMs] - Timeout in milliseconds
   * @returns {any} Lock result
   */
  acquireLock(name: string, timeoutMs?: number): any;

  /** Check if lock is held */
  isLocked(name: string): boolean;

  /** Cleanup expired locks */
  cleanup(): void;
}

// ============================================================================
// RUNTIME FUNCTIONS
// ============================================================================

/**
 * Run job with context
 *
 * @function runJobWithContext
 * @param {JobContext} ctx - Job execution context
 * @param {any} jobMod - Job module
 * @param {any} [payload] - Optional payload data
 * @returns {Promise<JobResult>} Job execution result
 */
export function runJobWithContext(
  ctx: JobContext,
  jobMod: any,
  payload?: any
): Promise<JobResult>;
