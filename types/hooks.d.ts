/**
 * GitVan v2 Hooks Type Definitions
 * Frozen interfaces for hookable system
 */

import type { Job, JobCtx, JobResult } from './job.d.ts';
import type { ReceiptV1 } from './receipt.d.ts';

export interface GitVanHooks {
  /** Called before tracer initialization */
  'tracer:init': () => void | Promise<void>;

  /** Called after tracer is ready */
  'tracer:ready': () => void | Promise<void>;

  /** Called before tracer shutdown */
  'tracer:shutdown': () => void | Promise<void>;

  /** Called when job is discovered */
  'job:discovered': (job: Job) => void | Promise<void>;

  /** Called before job validation */
  'job:validate': (job: Job) => void | Promise<void>;

  /** Called before job execution */
  'job:before': (job: Job, ctx: JobCtx) => void | Promise<void>;

  /** Called during job execution for progress updates */
  'job:progress': (job: Job, progress: {
    stage: string;
    percentage: number;
    message?: string;
  }) => void | Promise<void>;

  /** Called after successful job execution */
  'job:success': (job: Job, result: JobResult) => void | Promise<void>;

  /** Called after failed job execution */
  'job:error': (job: Job, error: Error) => void | Promise<void>;

  /** Called after job execution (success or failure) */
  'job:after': (job: Job, result: JobResult) => void | Promise<void>;

  /** Called before receipt generation */
  'receipt:before': (job: Job, result: JobResult) => void | Promise<void>;

  /** Called after receipt generation */
  'receipt:after': (receipt: ReceiptV1) => void | Promise<void>;

  /** Called when receipt is written to file */
  'receipt:written': (receipt: ReceiptV1, filePath: string) => void | Promise<void>;

  /** Called before config loading */
  'config:load': (configPath?: string) => void | Promise<void>;

  /** Called after config is loaded */
  'config:loaded': (config: any) => void | Promise<void>;

  /** Called when config changes */
  'config:changed': (config: any, previousConfig: any) => void | Promise<void>;

  /** Called before git operations */
  'git:before': (operation: string, args: any[]) => void | Promise<void>;

  /** Called after git operations */
  'git:after': (operation: string, result: any) => void | Promise<void>;

  /** Called on git errors */
  'git:error': (operation: string, error: Error) => void | Promise<void>;

  /** Called before template rendering */
  'template:render': (templatePath: string, data: any) => void | Promise<void>;

  /** Called after template rendering */
  'template:rendered': (templatePath: string, output: string) => void | Promise<void>;

  /** Called on file system changes */
  'fs:change': (event: 'create' | 'modify' | 'delete', filePath: string) => void | Promise<void>;

  /** Called on CLI command execution */
  'cli:command': (command: string, args: string[]) => void | Promise<void>;

  /** Called on CLI errors */
  'cli:error': (command: string, error: Error) => void | Promise<void>;

  /** Called for debug logging */
  'debug': (message: string, data?: any) => void | Promise<void>;

  /** Called for info logging */
  'info': (message: string, data?: any) => void | Promise<void>;

  /** Called for warning logging */
  'warn': (message: string, data?: any) => void | Promise<void>;

  /** Called for error logging */
  'error': (message: string, error?: Error) => void | Promise<void>;
}