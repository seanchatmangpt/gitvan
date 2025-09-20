// GitVan v3.0.0 - Pack Registry Schemas
// Input validation schemas for pack registry operations

import { z } from "zod";

// Input validation schemas
const PackInfoSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_.\/]+$/),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  source: z
    .object({
      url: z.string().url(),
      hash: z.string().length(64).optional(),
      signature: z.string().optional(),
    })
    .optional(),
});

const SearchFiltersSchema = z.object({
  capability: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
});

export { PackInfoSchema, SearchFiltersSchema };