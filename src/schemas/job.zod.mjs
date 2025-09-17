/**
 * GitVan v2 Job Schema - Zod validation for job definitions
 * Defines the structure and validation rules for GitVan jobs
 */

import { z } from "zod";
import { EventPredicate } from "./event.zod.mjs";

// Job metadata schema
export const JobMeta = z.object({
  id: z.string().optional(),
  desc: z.string().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  priority: z.number().min(0).max(10).optional(),
});

// Job definition schema
export const JobDef = z.object({
  id: z.string().optional(),
  kind: z.enum(["atomic", "batch", "daemon"]).default("atomic"),
  cron: z.string().optional(),
  meta: JobMeta.optional(),
  on: EventPredicate.optional(),
  run: z.function(),
  mode: z.enum(["on-demand", "cron", "event"]).optional(),
  filename: z.string().optional(),
  filePath: z.string().optional(),
  version: z.string().optional(),

  // Execution options
  timeout: z.number().positive().optional(),
  retries: z.number().min(0).max(5).optional(),
  parallel: z.boolean().optional(),

  // Environment options
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
});

// Job execution context schema
export const JobContext = z.object({
  id: z.string(),
  job: JobDef,
  startTime: z.string(),
  worktree: z.string(),
  branch: z.string(),
  commit: z.string().optional(),
  env: z.record(z.string(), z.any()).optional(),
});

// Job execution result schema
export const JobResult = z.object({
  success: z.boolean(),
  output: z.any().optional(),
  error: z.string().optional(),
  artifacts: z.array(z.string()).default([]),
  duration: z.number().optional(),
  exitCode: z.number().optional(),
});
