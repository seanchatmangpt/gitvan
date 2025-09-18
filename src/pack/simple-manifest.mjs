/**
 * Simple Pack Manifest Loader without Zod validation
 * For testing purposes
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';

export function loadPackManifest(packPath) {
  const manifestPath = join(packPath, 'pack.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Pack manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);

  // Basic validation
  if (!data.id || !data.version) {
    throw new Error('Pack manifest missing required id or version');
  }

  // Set defaults
  return {
    abi: '1.0',
    ...data,
    tags: data.tags || [],
    license: data.license || 'MIT',
    requires: data.requires || {},
    detects: data.detects || [],
    modes: data.modes || ['existing-repo'],
    inputs: data.inputs || [],
    capabilities: data.capabilities || [],
    dependencies: data.dependencies || {},
    provides: {
      templates: [],
      files: [],
      jobs: [],
      events: [],
      schedules: [],
      scaffolds: [],
      transforms: [],
      ...data.provides
    },
    postInstall: data.postInstall || [],
    idempotency: {
      fingerprint: ['files', 'deps', 'templates', 'jobs'],
      conflict: 'skip',
      ...data.idempotency
    }
  };
}

export function validateManifest(manifest) {
  const errors = [];

  if (!manifest.id) errors.push('Missing id');
  if (!manifest.version) errors.push('Missing version');

  return {
    success: errors.length === 0,
    errors
  };
}