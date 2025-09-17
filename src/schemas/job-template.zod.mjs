/**
 * GitVan Job Template Schema - Zod validation for job generation
 * Defines the structure and validation for AI-generated jobs
 */

import { z } from "zod";

// Job metadata schema
export const JobMetaSchema = z.object({
  desc: z.string().describe("Job description"),
  tags: z.array(z.string()).default([]).describe("Job tags"),
  author: z.string().default("GitVan AI").describe("Job author"),
  version: z.string().default("1.0.0").describe("Job version"),
});

// Job configuration schema
export const JobConfigSchema = z.object({
  cron: z.string().optional().describe("Cron schedule expression"),
  on: z.any().optional().describe("Event triggers"),
  schedule: z.string().optional().describe("Schedule expression"),
});

// Job implementation schema
export const JobImplementationSchema = z.object({
  type: z.enum(["simple", "file-operation", "git-operation", "template-operation", "pack-operation"]).describe("Job implementation type"),
  description: z.string().describe("What the job does"),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
    required: z.boolean().optional(),
    default: z.any().optional(),
  })).optional().describe("Job parameters"),
  operations: z.array(z.object({
    type: z.enum(["log", "file-read", "file-write", "file-copy", "file-move", "git-commit", "git-note", "template-render", "pack-apply"]),
    description: z.string(),
    parameters: z.record(z.any()).optional(),
  })).describe("List of operations to perform"),
  errorHandling: z.enum(["strict", "graceful", "continue"]).default("graceful").describe("Error handling strategy"),
  returnValue: z.object({
    success: z.string().describe("Success message"),
    artifacts: z.array(z.string()).default([]).describe("Artifacts to return"),
  }).describe("Return value structure"),
});

// Complete job template schema
export const JobTemplateSchema = z.object({
  meta: JobMetaSchema,
  config: JobConfigSchema.optional(),
  implementation: JobImplementationSchema,
});

// Job template with values filled in
export const JobWithValuesSchema = z.object({
  meta: JobMetaSchema,
  config: JobConfigSchema.optional(),
  implementation: JobImplementationSchema,
  values: z.record(z.any()).describe("Filled-in values for the template"),
});

// Type exports removed - this is a .mjs file, not TypeScript
