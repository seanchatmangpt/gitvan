import * as z from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';

// Simple pack manifest schema for testing
export const SimplePackManifestSchema = z.object({
  abi: z.literal('1.0'),
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string()
});

export function loadSimplePackManifest(packPath) {
  const manifestPath = join(packPath, 'pack.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Pack manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const data = JSON.parse(raw);
  return SimplePackManifestSchema.parse(data);
}