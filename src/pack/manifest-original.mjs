import * as z from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'pathe';

// Pack manifest schema based on ABI v1
export const PackManifestSchema = z.object({
  abi: z.literal('1.0'),
  id: z.string(),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  license: z.string().default('MIT'),
  source: z.object({
    url: z.string().optional(),
    hash: z.string().optional(),
    signature: z.string().optional()
  }).optional(),
  requires: z.object({
    gitvan: z.string().optional(),
    node: z.string().optional(),
    git: z.string().optional()
  }).default({}),
  detects: z.array(z.object({
    kind: z.enum(['file', 'glob', 'pkg']),
    pattern: z.string(),
    negate: z.boolean().optional()
  })).default([]),
  modes: z.array(z.enum(['existing-repo', 'new-repo'])).default(['existing-repo']),
  inputs: z.array(z.object({
    key: z.string(),
    type: z.enum(['string', 'boolean', 'enum', 'path']),
    default: z.any().optional(),
    enum: z.array(z.string()).optional(),
    prompt: z.string().optional(),
    secret: z.boolean().optional()
  })).default([]),
  capabilities: z.array(z.string()).default([]),
  dependencies: z.object({
    npm: z.object({
      dependencies: z.record(z.string()).optional(),
      devDependencies: z.record(z.string()).optional(),
      scripts: z.record(z.string()).optional()
    }).optional()
  }).default({}),
  provides: z.object({
    templates: z.array(z.object({
      src: z.string(),
      target: z.string(),
      when: z.any().optional(),
      mode: z.enum(['write', 'merge', 'skip']).default('write'),
      executable: z.boolean().optional()
    })).default([]),
    files: z.array(z.object({
      src: z.string(),
      target: z.string(),
      when: z.any().optional(),
      mode: z.enum(['write', 'merge', 'skip']).default('write')
    })).default([]),
    jobs: z.array(z.object({
      src: z.string(),
      id: z.string().optional(),
      targetDir: z.string().optional()
    })).default([]),
    events: z.array(z.object({
      src: z.string(),
      id: z.string().optional(),
      targetDir: z.string().optional()
    })).default([]),
    schedules: z.array(z.object({
      job: z.string(),
      cron: z.string(),
      when: z.any().optional()
    })).default([]),
    scaffolds: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      inputs: z.array(z.any()).optional(),
      templates: z.array(z.object({
        src: z.string(),
        target: z.string()
      })),
      post: z.array(z.object({
        action: z.enum(['run', 'git', 'note']),
        args: z.array(z.string())
      })).optional()
    })).default([]),
    transforms: z.array(z.object({
      target: z.string(),
      kind: z.enum(['json-merge', 'json-patch', 'yaml-merge', 'text-insert', 'text-replace']),
      spec: z.any(),
      anchor: z.object({
        pattern: z.string(),
        position: z.enum(['before', 'after', 'replace'])
      }).optional()
    })).default([])
  }).default({}),
  postInstall: z.array(z.object({
    action: z.enum(['run', 'git', 'job']),
    args: z.array(z.string())
  })).default([]),
  uninstall: z.object({
    reverseTransforms: z.boolean().optional(),
    paths: z.array(z.string()).optional()
  }).optional(),
  compose: z.object({
    dependsOn: z.array(z.string()).optional(),
    conflictsWith: z.array(z.string()).optional(),
    order: z.number().optional()
  }).optional(),
  idempotency: z.object({
    fingerprint: z.array(z.string()).default(['files', 'deps', 'templates', 'jobs']),
    conflict: z.enum(['skip', 'overwrite', 'ask']).default('skip')
  }).default({}),
  audit: z.object({
    receiptsRef: z.string().optional(),
    categories: z.array(z.string()).optional()
  }).optional(),
  ai: z.object({
    prompts: z.object({
      scaffold: z.string().optional(),
      job: z.string().optional(),
      event: z.string().optional()
    }).optional(),
    schemas: z.object({
      job: z.any().optional(),
      event: z.any().optional()
    }).optional()
  }).optional()
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