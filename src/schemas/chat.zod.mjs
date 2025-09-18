/**
 * GitVan v2 Chat Schema - Zod validation for chat/AI interactions
 * Defines the structure and validation rules for conversational job generation
 */

import { z } from "zod";

// Chat input schema
export const ChatInput = z.object({
  prompt: z.string().min(1),
  kind: z.enum(["job", "event", "template", "config"]).default("job"),
  id: z.string().optional(),
  path: z.string().optional(),

  // Generation options
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().positive().optional(),
      model: z.string().optional(),
      stream: z.boolean().default(false),
    })
    .optional(),

  // Context options
  context: z
    .object({
      includeExamples: z.boolean().default(true),
      includeSchema: z.boolean().default(true),
      includeDocs: z.boolean().default(false),
    })
    .optional(),
});

// Chat output schema
export const ChatOutput = z.object({
  ok: z.boolean().default(true),
  id: z.string(),
  mode: z.enum(["on-demand", "cron", "event"]).default("on-demand"),
  filePath: z.string(),
  source: z.string(), // Generated module text
  summary: z.string().optional(),

  // Generation metadata
  model: z.string().optional(),
  modelParams: z.record(z.string(), z.any()).optional(),
  duration: z.number().optional(),
  tokens: z
    .object({
      prompt: z.number().optional(),
      completion: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),

  // Validation results
  validation: z
    .object({
      isValid: z.boolean(),
      errors: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    })
    .optional(),
});

// Chat conversation schema
export const ChatConversation = z.object({
  id: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      timestamp: z.string(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  ),
  context: z.record(z.string(), z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Chat receipt schema for AI-generated content
export const ChatReceipt = z.object({
  kind: z.literal("chat-receipt"),
  id: z.string(),
  prompt: z.string(),
  model: z.string(),
  modelParams: z.record(z.string(), z.any()),
  generatedContent: z.string(),
  validation: z.object({
    isValid: z.boolean(),
    errors: z.array(z.string()).optional(),
  }),
  timestamp: z.string(),
  fingerprint: z.string(),
});
