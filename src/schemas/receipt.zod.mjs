/**
 * GitVan v2 Receipt Schema - Zod validation for execution receipts
 * Defines the structure and validation rules for GitVan receipts
 */

import { z } from "zod";

// Receipt schema for audit trail
export const Receipt = z.object({
  kind: z.literal("workflow-receipt"),
  id: z.string(),
  status: z.enum(["OK", "ERROR", "SKIP"]),
  ts: z.string(),
  commit: z.string().optional(),
  action: z.string(),
  env: z.record(z.string(), z.any()).optional(),
  outputHash: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
  artifacts: z.array(z.string()).default([]),
  fingerprint: z.string().optional(),

  // Additional metadata
  duration: z.number().optional(),
  worktree: z.string().optional(),
  branch: z.string().optional(),
  model: z.string().optional(), // For AI-generated content
  modelParams: z.record(z.string(), z.any()).optional(),
});

// Receipt collection schema
export const ReceiptCollection = z.object({
  kind: z.literal("receipt-collection"),
  timestamp: z.string(),
  count: z.number(),
  receipts: z.array(Receipt),
  summary: z
    .object({
      ok: z.number(),
      error: z.number(),
      skip: z.number(),
    })
    .optional(),
});

// Receipt query schema
export const ReceiptQuery = z.object({
  since: z.string().optional(),
  until: z.string().optional(),
  status: z.enum(["OK", "ERROR", "SKIP"]).optional(),
  action: z.string().optional(),
  commit: z.string().optional(),
  worktree: z.string().optional(),
  branch: z.string().optional(),
  limit: z.number().positive().optional(),
});
