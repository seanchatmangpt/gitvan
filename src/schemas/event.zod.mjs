/**
 * GitVan v2 Event Schema - Zod validation for event predicates
 * Defines the structure and validation rules for event predicates
 */

import { z } from "zod";

// Base event predicate schema with recursive support for any/all
export const EventPredicate = z.object({
  // Logical operators
  any: z.lazy(() => z.array(EventPredicate)).optional(),
  all: z.lazy(() => z.array(EventPredicate)).optional(),

  // Tag-based predicates
  tagCreate: z.string().optional(),
  semverTag: z.boolean().optional(),
  tagPrefix: z.string().optional(),
  tagSuffix: z.string().optional(),

  // Merge/branch predicates
  mergeTo: z.string().optional(),
  branchCreate: z.string().optional(),
  mergeFrom: z.string().optional(),
  pullRequest: z.boolean().optional(),

  // Path-based predicates
  pathChanged: z.array(z.string()).optional(),
  pathAdded: z.array(z.string()).optional(),
  pathModified: z.array(z.string()).optional(),
  pathDeleted: z.array(z.string()).optional(),

  // Commit-based predicates
  message: z.string().optional(),
  authorEmail: z.string().optional(),
  authorName: z.string().optional(),
  signed: z.boolean().optional(),
  commitType: z.string().optional(),
  commitScope: z.string().optional(),
});

// Event metadata schema
export const EventMetadata = z.object({
  // Basic info
  timestamp: z.string().optional(),
  commit: z.string().optional(),
  branch: z.string().optional(),

  // File changes
  filesChanged: z.array(z.string()).optional(),
  filesAdded: z.array(z.string()).optional(),
  filesModified: z.array(z.string()).optional(),
  filesDeleted: z.array(z.string()).optional(),

  // Tags
  tagsCreated: z.array(z.string()).optional(),

  // Merge info
  mergedTo: z.string().optional(),
  mergedFrom: z.string().optional(),
  branchCreated: z.string().optional(),

  // Commit info
  message: z.string().optional(),
  authorEmail: z.string().optional(),
  authorName: z.string().optional(),
  signed: z.boolean().optional(),

  // Pull request info
  pullRequest: z
    .object({
      number: z.number(),
      title: z.string(),
      state: z.string(),
    })
    .optional(),
});

// Event definition schema
export const EventDefinition = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  on: EventPredicate,
  run: z.function(),
  meta: z
    .object({
      tags: z.array(z.string()).optional(),
      priority: z.number().optional(),
    })
    .optional(),
});
