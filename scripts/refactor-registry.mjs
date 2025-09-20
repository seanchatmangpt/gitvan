#!/usr/bin/env node
/**
 * GitVan v3.0.0 Registry Refactoring Script
 * Breaks down the oversized registry.mjs file into focused modules
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const log = (message) => console.log(`🔧 [Registry Refactor] ${message}`);

// Read the current registry.mjs file
const registryPath = 'src/pack/registry.mjs';
const registryContent = readFileSync(registryPath, 'utf8');

log('Analyzing registry.mjs structure...');

// Split the file into logical sections
const sections = {
  imports: [],
  schemas: [],
  PackRegistry: [],
  PackCache: [],
  PackRegistryManager: [],
  exports: []
};

let currentSection = 'imports';
let braceCount = 0;
let inClass = false;
let currentClass = '';

const lines = registryContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track imports
  if (line.startsWith('import ') && currentSection === 'imports') {
    sections.imports.push(line);
    continue;
  }
  
  // Track schemas
  if (line.includes('Schema = z.object') || line.includes('Schema = z.') && !inClass) {
    currentSection = 'schemas';
    sections.schemas.push(line);
    continue;
  }
  
  // Track class definitions
  if (line.includes('export class PackRegistry')) {
    currentSection = 'PackRegistry';
    currentClass = 'PackRegistry';
    inClass = true;
    sections.PackRegistry.push(line);
    continue;
  }
  
  if (line.includes('export class PackCache')) {
    currentSection = 'PackCache';
    currentClass = 'PackCache';
    inClass = true;
    sections.PackCache.push(line);
    continue;
  }
  
  if (line.includes('export class PackRegistryManager')) {
    currentSection = 'PackRegistryManager';
    currentClass = 'PackRegistryManager';
    inClass = true;
    sections.PackRegistryManager.push(line);
    continue;
  }
  
  // Track exports
  if (line.startsWith('export ') && !inClass) {
    currentSection = 'exports';
    sections.exports.push(line);
    continue;
  }
  
  // Track class content
  if (inClass) {
    sections[currentSection].push(line);
    
    // Count braces to track class boundaries
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    
    if (braceCount === 0 && line.includes('}')) {
      inClass = false;
      currentClass = '';
    }
  }
}

log(`Found sections:`);
log(`- Imports: ${sections.imports.length} lines`);
log(`- Schemas: ${sections.schemas.length} lines`);
log(`- PackRegistry: ${sections.PackRegistry.length} lines`);
log(`- PackCache: ${sections.PackCache.length} lines`);
log(`- PackRegistryManager: ${sections.PackRegistryManager.length} lines`);
log(`- Exports: ${sections.exports.length} lines`);

// Create refactored files
const createSchemasFile = () => {
  const content = [
    '// GitVan v3.0.0 - Pack Registry Schemas',
    '// Input validation schemas for pack registry operations',
    '',
    ...sections.imports.filter(line => line.includes('zod')),
    '',
    '// Input validation schemas',
    ...sections.schemas,
    '',
    'export { PackInfoSchema, SearchFiltersSchema };'
  ].join('\n');
  
  writeFileSync('src/pack/schemas.mjs', content);
  log('✅ Created src/pack/schemas.mjs');
};

const createPackRegistryFile = () => {
  const content = [
    '// GitVan v3.0.0 - Pack Registry Core',
    '// Core pack registry functionality',
    '',
    ...sections.imports,
    'import { PackInfoSchema, SearchFiltersSchema } from "./schemas.mjs";',
    '',
    ...sections.PackRegistry,
    '',
    'export { PackRegistry };'
  ].join('\n');
  
  writeFileSync('src/pack/pack-registry.mjs', content);
  log('✅ Created src/pack/pack-registry.mjs');
};

const createPackCacheFile = () => {
  const content = [
    '// GitVan v3.0.0 - Pack Cache',
    '// Pack caching and optimization functionality',
    '',
    ...sections.imports.filter(line => 
      line.includes('PackCache') || 
      line.includes('cache') || 
      line.includes('optimization')
    ),
    '',
    ...sections.PackCache,
    '',
    'export { PackCache };'
  ].join('\n');
  
  writeFileSync('src/pack/pack-cache.mjs', content);
  log('✅ Created src/pack/pack-cache.mjs');
};

const createPackRegistryManagerFile = () => {
  const content = [
    '// GitVan v3.0.0 - Pack Registry Manager',
    '// High-level pack registry management functionality',
    '',
    ...sections.imports,
    'import { PackRegistry } from "./pack-registry.mjs";',
    'import { PackCache } from "./pack-cache.mjs";',
    'import { PackInfoSchema, SearchFiltersSchema } from "./schemas.mjs";',
    '',
    ...sections.PackRegistryManager,
    '',
    'export { PackRegistryManager };'
  ].join('\n');
  
  writeFileSync('src/pack/pack-registry-manager.mjs', content);
  log('✅ Created src/pack/pack-registry-manager.mjs');
};

const createNewRegistryFile = () => {
  const content = [
    '// GitVan v3.0.0 - Pack Registry (Refactored)',
    '// Main registry file that exports all registry functionality',
    '',
    '// Re-export all registry components',
    'export { PackRegistry } from "./pack-registry.mjs";',
    'export { PackCache } from "./pack-cache.mjs";',
    'export { PackRegistryManager } from "./pack-registry-manager.mjs";',
    'export { PackInfoSchema, SearchFiltersSchema } from "./schemas.mjs";',
    '',
    '// Default export for backward compatibility',
    'export { PackRegistryManager as default } from "./pack-registry-manager.mjs";'
  ].join('\n');
  
  writeFileSync('src/pack/registry-new.mjs', content);
  log('✅ Created src/pack/registry-new.mjs');
};

// Create the refactored files
log('Creating refactored files...');
createSchemasFile();
createPackRegistryFile();
createPackCacheFile();
createPackRegistryManagerFile();
createNewRegistryFile();

log('🎉 Registry refactoring completed!');
log('Next steps:');
log('1. Test the refactored files');
log('2. Update imports in other files');
log('3. Replace registry.mjs with registry-new.mjs');
log('4. Remove the original registry.mjs file');