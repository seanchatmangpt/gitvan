/**
 * GitVan v2 Receipt Type Definitions
 * Frozen interfaces for receipt system
 */

import type { Job, JobResult } from './job.d.ts';

export interface ReceiptV1 {
  /** Receipt format version */
  version: '1.0';
  /** Receipt metadata */
  meta: {
    /** Unique receipt identifier */
    id: string;
    /** Receipt creation timestamp */
    timestamp: Date;
    /** GitVan tracer version */
    tracerVersion: string;
    /** Receipt format schema */
    schema: 'gitvan-receipt-v1';
  };
  /** Execution context information */
  context: {
    /** Working directory */
    cwd: string;
    /** Git repository information */
    git: {
      /** Current branch */
      branch: string;
      /** Current commit hash */
      commit: string;
      /** Remote URL */
      remote?: string;
      /** Working directory status */
      isDirty: boolean;
      /** Repository root */
      root: string;
    };
    /** User information */
    user: {
      /** Git user name */
      name?: string;
      /** Git user email */
      email?: string;
    };
    /** Environment information */
    env: {
      /** Node.js version */
      nodeVersion: string;
      /** Operating system */
      platform: string;
      /** CPU architecture */
      arch: string;
      /** Environment variables (filtered) */
      vars: Record<string, string>;
    };
    /** Session information */
    session: {
      /** Session identifier */
      id: string;
      /** Session start time */
      startTime: Date;
    };
  };
  /** Job execution information */
  execution: {
    /** Executed job */
    job: Job;
    /** Execution result */
    result: JobResult;
    /** Execution start time */
    startTime: Date;
    /** Execution end time */
    endTime: Date;
    /** Total execution duration */
    duration: number;
  };
  /** File system changes */
  changes: {
    /** Files created during execution */
    created: Array<{
      path: string;
      size: number;
      checksum?: string;
    }>;
    /** Files modified during execution */
    modified: Array<{
      path: string;
      sizeBefore: number;
      sizeAfter: number;
      checksumBefore?: string;
      checksumAfter?: string;
    }>;
    /** Files deleted during execution */
    deleted: Array<{
      path: string;
      sizeBefore: number;
      checksumBefore?: string;
    }>;
  };
  /** Performance metrics */
  performance: {
    /** Memory usage in bytes */
    memory: {
      peak: number;
      average: number;
    };
    /** CPU usage percentage */
    cpu: {
      peak: number;
      average: number;
    };
    /** Disk I/O statistics */
    disk: {
      bytesRead: number;
      bytesWritten: number;
    };
  };
  /** Audit trail */
  audit: {
    /** Receipt integrity hash */
    hash: string;
    /** Digital signature (optional) */
    signature?: string;
    /** Verification status */
    verified: boolean;
  };
}