/**
 * GitVan v2 Config Schema - Zod validation for configuration
 * Defines the structure and validation rules for GitVan configuration
 */

import { z } from "zod";

// Configuration schema
export const ConfigSchema = z.object({
  rootDir: z.string().default(process.cwd()),
  
  // Job configuration
  jobs: z.object({ 
    dir: z.string().default("jobs"),
    scan: z.object({
      patterns: z.array(z.string()).default(["**/*.mjs", "**/*.cron.mjs", "**/*.evt.mjs"]),
      ignore: z.array(z.string()).default(["node_modules/**", ".git/**"]),
    }).default({}),
  }).default({}),
  
  // Template configuration
  templates: z.object({
    engine: z.literal("nunjucks").default("nunjucks"),
    dirs: z.array(z.string()).default(["templates"]),
    autoescape: z.boolean().default(false),
    noCache: z.boolean().default(false),
    filters: z.array(z.string()).default(["inflection", "json"]),
  }).default({}),
  
  // Receipt configuration
  receipts: z.object({
    ref: z.string().default("refs/notes/gitvan/results"),
    enabled: z.boolean().default(true),
    compress: z.boolean().default(false),
  }).default({}),
  
  // Lock configuration
  locks: z.object({
    ref: z.string().default("refs/gitvan/locks"),
    timeout: z.number().positive().default(30000),
    retries: z.number().min(0).max(5).default(3),
  }).default({}),
  
  // AI configuration
  ai: z.object({
    provider: z.enum(["ollama", "openai", "anthropic"]).default("ollama"),
    model: z.string().default("qwen3-coder:30b"),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().positive().default(4096),
  }).default({}),
  
  // Hooks configuration
  hooks: z.record(z.string(), z.any()).default({}),
  
  // Runtime configuration
  runtime: z.object({
    timezone: z.string().default("UTC"),
    locale: z.string().default("en-US"),
    deterministic: z.boolean().default(true),
    sandbox: z.boolean().default(true),
  }).default({}),
});
