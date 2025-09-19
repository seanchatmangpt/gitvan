/**
 * @fileoverview GitVan v2 - Essential Type Definitions
 *
 * Core types for GitVan development automation platform.
 * GitVan uses Git as a runtime environment for development workflows.
 */

/// <reference types="node" />

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type Exec = "cli" | "js" | "llm" | "job" | "tmpl";

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
      template: string;
      data?: Json;
      out?: string;
      autoescape?: boolean;
      paths?: string[];
    };

export interface JobResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  artifact?: string;
  meta?: Record<string, any>;
}

export interface JobContext {
  root: string;
  env: Record<string, string>;
  head?: string;
  branch?: string;
  now?: () => string;
}

export interface JobDef {
  kind: "atomic" | "composite";
  meta?: {
    desc?: string;
    schedule?: string;
    tags?: string[];
    [key: string]: any;
  };
  run?: (params: { payload?: any; ctx?: JobContext }) => Promise<JobResult>;
  action?: ExecSpec;
}

export function defineJob<T extends JobDef>(def: T): T;

// Composables
export interface GitComposable {
  root: string;
  head(): string;
  branch(): string;
  run(args: string): string;
  note(ref: string, msg: string, sha?: string): string;
  appendNote(ref: string, msg: string, sha?: string): string;
  setRef(ref: string, sha: string): string;
  delRef(ref: string): string;
  listRefs(prefix: string): string[];
}

export interface TemplateComposable {
  render(template: string, data?: Record<string, any>): string;
  renderToFile(
    template: string,
    out: string,
    data?: Record<string, any>
  ): { path: string; bytes: number };
  env: any;
}

export interface ExecComposable {
  cli(cmd: string, args?: string[], env?: Record<string, string>): JobResult;
  js(modulePath: string, exportName?: string, input?: any): Promise<JobResult>;
  tmpl(spec: {
    template: string;
    out?: string;
    data?: any;
    autoescape?: boolean;
    paths?: string[];
  }): JobResult;
}

export function useGitVan(): JobContext;
export function withGitVan<T>(ctx: JobContext, fn: () => T): T;
export function useGit(): GitComposable;
export function useTemplate(opts?: {
  autoescape?: boolean;
  paths?: string[];
}): TemplateComposable;
export function useExec(): ExecComposable;

// Daemon and Locks
export class GitVanDaemon {
  constructor(worktreePath: string);
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getLock(name: string): any;
}

export class LockManager {
  constructor(worktreePath: string);
  acquireLock(name: string, timeoutMs?: number): any;
  isLocked(name: string): boolean;
  cleanup(): void;
}

// Runtime
export function runJobWithContext(
  ctx: JobContext,
  jobMod: any,
  payload?: any
): Promise<JobResult>;
