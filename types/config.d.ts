/**
 * GitVan v2 Configuration Type Definitions
 * Frozen interfaces for configuration system
 */

import type { JobKind } from './job.d.ts';

export interface GitVanConfig {
  /** Configuration version */
  version: '2.0';

  /** Tracer configuration */
  tracer: {
    /** Enable/disable tracer */
    enabled: boolean;
    /** Output directory for receipts */
    outputDir: string;
    /** Receipt file naming pattern */
    receiptPattern: string;
    /** Maximum receipt file size in bytes */
    maxReceiptSize: number;
    /** Retention policy for receipts */
    retention: {
      /** Maximum number of receipts to keep */
      maxCount: number;
      /** Maximum age in days */
      maxAge: number;
    };
  };

  /** Job configuration */
  jobs: {
    /** Job discovery patterns */
    patterns: string[];
    /** Excluded patterns */
    exclude: string[];
    /** Job execution timeout in milliseconds */
    timeout: number;
    /** Retry configuration */
    retry: {
      /** Maximum retry attempts */
      maxAttempts: number;
      /** Retry delay in milliseconds */
      delay: number;
      /** Exponential backoff factor */
      backoffFactor: number;
    };
    /** Job filtering */
    filter: {
      /** Include only these job kinds */
      include?: JobKind[];
      /** Exclude these job kinds */
      exclude?: JobKind[];
      /** Include only jobs with these tags */
      tags?: string[];
    };
  };

  /** Git configuration */
  git: {
    /** Track git operations */
    trackOperations: boolean;
    /** Include git hooks */
    includeHooks: boolean;
    /** Git command timeout in milliseconds */
    timeout: number;
    /** Ignore patterns for git status */
    ignore: string[];
  };

  /** Template configuration */
  templates: {
    /** Template directory */
    directory: string;
    /** Template file extension */
    extension: string;
    /** Template engine options */
    options: {
      /** Auto-escape variables */
      autoescape: boolean;
      /** Throw on undefined variables */
      throwOnUndefined: boolean;
      /** Trim blocks */
      trimBlocks: boolean;
      /** Left strip blocks */
      lstripBlocks: boolean;
    };
  };

  /** Logging configuration */
  logging: {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Log format */
    format: 'text' | 'json';
    /** Log output */
    output: 'console' | 'file' | 'both';
    /** Log file path (when output includes 'file') */
    file?: string;
    /** Enable timestamp in logs */
    timestamp: boolean;
    /** Enable colors in console output */
    colors: boolean;
  };

  /** Performance monitoring */
  performance: {
    /** Enable performance tracking */
    enabled: boolean;
    /** Memory sampling interval in milliseconds */
    memorySampleInterval: number;
    /** CPU sampling interval in milliseconds */
    cpuSampleInterval: number;
    /** Disk I/O tracking */
    trackDiskIO: boolean;
  };

  /** Security configuration */
  security: {
    /** Enable receipt signing */
    signing: boolean;
    /** Private key path for signing */
    privateKeyPath?: string;
    /** Public key path for verification */
    publicKeyPath?: string;
    /** Hash algorithm for integrity */
    hashAlgorithm: 'sha256' | 'sha512';
  };

  /** Plugin configuration */
  plugins: {
    /** Plugin directory */
    directory: string;
    /** Auto-load plugins */
    autoload: boolean;
    /** Enabled plugins */
    enabled: string[];
    /** Plugin-specific configuration */
    config: Record<string, any>;
  };

  /** CLI configuration */
  cli: {
    /** Default command */
    defaultCommand: string;
    /** Show help on no command */
    showHelpOnNoCommand: boolean;
    /** CLI theme */
    theme: 'default' | 'minimal' | 'colorful';
    /** Progress bar configuration */
    progress: {
      /** Show progress bars */
      enabled: boolean;
      /** Progress bar style */
      style: 'bar' | 'spinner' | 'dots';
    };
  };

  /** Environment-specific overrides */
  environments: {
    development?: Partial<GitVanConfig>;
    testing?: Partial<GitVanConfig>;
    production?: Partial<GitVanConfig>;
  };
}