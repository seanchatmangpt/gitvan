/**
 * GitVan v2 Front-matter Schema Validation
 * Zod schemas for validating front-matter structure
 */

import { z } from "zod";

// Helper schemas
const StringOrArray = z.union([z.string(), z.array(z.string())]);

const ForcePolicy = z
  .enum(["error", "overwrite", "append", "skip"])
  .default("error");

const InjectSpec = z.object({
  into: z.string(),
  snippet: z.string().optional(),
  where: z.enum(["before", "after", "at_line", "between"]).default("after"),
  find: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  line: z.number().optional(),
  once: z.boolean().default(true),
});

const CopySpec = z.object({
  from: z.string(),
  to: z.string(),
});

const ShellSpec = z.object({
  before: StringOrArray.optional(),
  after: StringOrArray.optional(),
});

const PerFileSpec = z.object({
  to: z.string(),
  data: z.record(z.any()).optional(),
});

// Main front-matter schema
export const FrontmatterSchema = z.object({
  to: StringOrArray.optional(),
  inject: z.union([InjectSpec, z.array(InjectSpec)]).optional(),
  copy: z.array(CopySpec).optional(),
  perFile: z.array(PerFileSpec).optional(),
  sh: ShellSpec.optional(),
  when: z.union([z.string(), z.boolean()]).default(true),
  force: ForcePolicy,
  data: z.record(z.any()).default({}),
});

// Type exports for TypeScript
export type FrontmatterData = z.infer<typeof FrontmatterSchema>;
export type InjectSpec = z.infer<typeof InjectSpec>;
export type CopySpec = z.infer<typeof CopySpec>;
export type ShellSpec = z.infer<typeof ShellSpec>;
export type PerFileSpec = z.infer<typeof PerFileSpec>;
