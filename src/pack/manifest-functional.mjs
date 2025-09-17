import { readFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';

// Functional validation without Zod for immediate testing
export function loadPackManifest(packPath) {
  const manifestPath = join(packPath, 'pack.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Pack manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);

  // Basic validation
  if (!data.abi || data.abi !== '1.0') {
    throw new Error('Invalid or missing ABI version');
  }

  if (!data.id || !data.name || !data.version) {
    throw new Error('Missing required fields: id, name, or version');
  }

  // Set defaults
  const manifest = {
    abi: data.abi,
    id: data.id,
    name: data.name,
    version: data.version,
    description: data.description || '',
    tags: data.tags || [],
    license: data.license || 'MIT',
    requires: data.requires || {},
    modes: data.modes || ['existing-repo'],
    inputs: data.inputs || [],
    capabilities: data.capabilities || [],
    dependencies: data.dependencies || {},
    provides: {
      templates: (data.provides?.templates || []).map(t => ({
        ...t,
        mode: t.mode || 'write'
      })),
      files: (data.provides?.files || []).map(f => ({
        ...f,
        mode: f.mode || 'write'
      })),
      jobs: data.provides?.jobs || []
    },
    postInstall: data.postInstall || [],
    idempotency: {
      fingerprint: data.idempotency?.fingerprint || ['files', 'deps', 'templates', 'jobs'],
      conflict: data.idempotency?.conflict || 'skip'
    }
  };

  return manifest;
}

export function validateManifest(manifest) {
  try {
    // Simple validation - just check if parsing would work
    const temp = loadPackManifest('/tmp/nonexistent');
    return { success: false, error: 'Path not found' };
  } catch (e) {
    try {
      // Try to validate the manifest object directly
      if (!manifest.abi || !manifest.id || !manifest.name || !manifest.version) {
        return { success: false, error: 'Missing required fields' };
      }
      return { success: true, data: manifest };
    } catch (validationError) {
      return { success: false, error: validationError.message };
    }
  }
}

// Dummy export for compatibility
export const PackManifestSchema = {
  parse: loadPackManifest,
  safeParse: validateManifest
};