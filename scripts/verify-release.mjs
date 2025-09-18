#!/usr/bin/env node
/**
 * Release Verification Script
 * 
 * Verifies that the package is ready for release by checking:
 * 1. All required files are present
 * 2. Bin files are executable
 * 3. Version consistency
 * 4. Dependencies are properly declared
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Verifying GitVan release package...\n');

// Read package.json
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`📦 Package version: ${version}`);

// Check required files
const requiredFiles = [
  'bin/gitvan.mjs',
  'bin/git-hook-handler.mjs', 
  'bin/git-hooks-setup.mjs',
  'bin/gitvan-ensure.mjs',
  'bin/gitvan-event-simulate.mjs',
  'bin/gitvan-hook.mjs',
  'src/cli.mjs',
  'README.md',
  'LICENSE'
];

console.log('\n📁 Checking required files...');
let allFilesPresent = true;

for (const file of requiredFiles) {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesPresent = false;
  }
}

if (!allFilesPresent) {
  console.error('\n❌ Some required files are missing!');
  process.exit(1);
}

// Check bin files are executable
console.log('\n🔧 Checking bin files...');
const binFiles = [
  'bin/gitvan.mjs',
  'bin/git-hook-handler.mjs',
  'bin/git-hooks-setup.mjs',
  'bin/gitvan-ensure.mjs',
  'bin/gitvan-event-simulate.mjs',
  'bin/gitvan-hook.mjs'
];

let allExecutable = true;
for (const file of binFiles) {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    const stats = statSync(filePath);
    if (stats.mode & 0o111) { // Check if executable
      console.log(`   ✅ ${file} - executable`);
    } else {
      console.log(`   ❌ ${file} - not executable`);
      allExecutable = false;
    }
  }
}

if (!allExecutable) {
  console.error('\n❌ Some bin files are not executable!');
  process.exit(1);
}

// Check version consistency
console.log('\n🔢 Checking version consistency...');
try {
  const cliPath = join(projectRoot, 'src', 'cli.mjs');
  const cliContent = readFileSync(cliPath, 'utf8');
  
  // Check if CLI reads version from package.json
  if (cliContent.includes('join(__dirname, "..", "package.json")')) {
    console.log('   ✅ CLI reads version from package.json');
  } else {
    console.log('   ⚠️  CLI may not read version from package.json');
  }
} catch (error) {
  console.log('   ⚠️  Could not verify CLI version reading');
}

// Check dependencies
console.log('\n📋 Checking dependencies...');
const requiredDeps = [
  '@babel/parser',
  '@babel/traverse', 
  'ai',
  'c12',
  'cacache',
  'citty',
  'consola',
  'fuse.js',
  'giget',
  'gray-matter',
  'hookable',
  'inflection',
  'klona',
  'lru-cache',
  'minimatch',
  'node-cron',
  'nunjucks',
  'ollama',
  'pathe',
  'prompts',
  'semver',
  'toml',
  'unctx',
  'zod'
];

let allDepsPresent = true;
for (const dep of requiredDeps) {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`   ✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`   ❌ ${dep} - MISSING from dependencies`);
    allDepsPresent = false;
  }
}

if (!allDepsPresent) {
  console.error('\n❌ Some required dependencies are missing!');
  process.exit(1);
}

// Check hookable version
console.log('\n🔗 Checking hookable version...');
if (packageJson.dependencies.hookable === '^5.5.3') {
  console.log('   ✅ hookable@^5.5.3 - correct version');
} else {
  console.log(`   ⚠️  hookable version: ${packageJson.dependencies.hookable}`);
}

// Check files array
console.log('\n📦 Checking files array...');
const filesArray = packageJson.files || [];
const requiredInFiles = ['bin/', 'src/', 'jobs/', 'packs/', 'templates/'];

let filesArrayCorrect = true;
for (const required of requiredInFiles) {
  if (filesArray.includes(required)) {
    console.log(`   ✅ ${required} - included`);
  } else {
    console.log(`   ❌ ${required} - MISSING from files array`);
    filesArrayCorrect = false;
  }
}

if (!filesArrayCorrect) {
  console.error('\n❌ Some required directories are missing from files array!');
  process.exit(1);
}

// Check bin configuration
console.log('\n⚙️  Checking bin configuration...');
if (packageJson.bin && packageJson.bin.gitvan === './bin/gitvan.mjs') {
  console.log('   ✅ bin.gitvan points to correct file');
} else {
  console.log('   ❌ bin.gitvan configuration is incorrect');
  process.exit(1);
}

console.log('\n🎉 Release verification completed successfully!');
console.log(`📦 GitVan ${version} is ready for release!`);
