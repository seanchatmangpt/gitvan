import * as z from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';

// Working pack manifest schema that supports our test pack
export const PackManifestSchema = z.object({
  abi: z.literal('1.0'),
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional().default([]),
  license: z.string().optional().default('MIT'),
  requires: z.object({
    gitvan: z.string().optional(),
    node: z.string().optional(),
    git: z.string().optional()
  }).optional().default({}),
  modes: z.array(z.enum(['existing-repo', 'new-repo'])).optional().default(['existing-repo']),
  inputs: z.array(z.object({
    key: z.string(),
    type: z.enum(['string', 'boolean', 'enum', 'path']),
    default: z.any().optional(),
    enum: z.array(z.string()).optional(),
    prompt: z.string().optional(),
    secret: z.boolean().optional()
  })).optional().default([]),
  capabilities: z.array(z.string()).optional().default([]),
  dependencies: z.object({
    npm: z.object({
      dependencies: z.record(z.string()).optional(),
      devDependencies: z.record(z.string()).optional(),
      scripts: z.record(z.string()).optional()
    }).optional()
  }).optional().default({}),
  provides: z.object({
    templates: z.array(z.object({
      src: z.string(),
      target: z.string(),
      when: z.any().optional(),
      mode: z.enum(['write', 'merge', 'skip']).optional().default('write'),
      executable: z.boolean().optional()
    })).optional().default([]),
    files: z.array(z.object({
      src: z.string(),
      target: z.string(),
      when: z.any().optional(),
      mode: z.enum(['write', 'merge', 'skip']).optional().default('write')
    })).optional().default([]),
    jobs: z.array(z.object({
      src: z.string(),
      id: z.string().optional(),
      targetDir: z.string().optional()
    })).optional().default([])
  }).optional().default({}),
  postInstall: z.array(z.object({
    action: z.enum(['run', 'git', 'job']),
    args: z.array(z.string())
  })).optional().default([]),
  idempotency: z.object({
    fingerprint: z.array(z.string()).optional().default(['files', 'deps', 'templates', 'jobs']),
    conflict: z.enum(['skip', 'overwrite', 'ask']).optional().default('skip')
  }).optional().default({})
});

export function loadPackManifest(packPath) {
  const manifestPath = join(packPath, 'pack.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Pack manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);
  return PackManifestSchema.parse(data);
}

export function validateManifest(manifest) {
  return PackManifestSchema.safeParse(manifest);
}