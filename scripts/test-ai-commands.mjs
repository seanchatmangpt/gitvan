#!/usr/bin/env node
/**
 * GitVan AI Commands Test Runner
 * Runs AI command tests with proper setup and reporting
 */

import { execSync } from 'node:child_process';
import { join } from 'pathe';
import { existsSync } from 'node:fs';

const testFile = 'tests/ai-commands.test.mjs';
const configFile = 'vitest.config.mjs';

console.log('🧪 GitVan AI Commands Test Runner');
console.log('==================================');

// Check if test files exist
if (!existsSync(testFile)) {
  console.error(`❌ Test file not found: ${testFile}`);
  process.exit(1);
}

if (!existsSync(configFile)) {
  console.error(`❌ Config file not found: ${configFile}`);
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'run';

console.log(`📋 Running AI command tests...`);
console.log(`📁 Test file: ${testFile}`);
console.log(`⚙️  Config: ${configFile}`);
console.log(`🎯 Command: ${command}`);
console.log('');

try {
  let vitestCommand;
  
  switch (command) {
    case 'watch':
      vitestCommand = `vitest ${testFile} --watch`;
      break;
    case 'coverage':
      vitestCommand = `vitest ${testFile} --coverage`;
      break;
    case 'ui':
      vitestCommand = `vitest ${testFile} --ui`;
      break;
    case 'run':
    default:
      vitestCommand = `vitest ${testFile}`;
      break;
  }

  console.log(`🚀 Executing: ${vitestCommand}`);
  console.log('');

  // Run the tests
  execSync(vitestCommand, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('');
  console.log('✅ AI command tests completed successfully!');

} catch (error) {
  console.error('');
  console.error('❌ AI command tests failed:');
  console.error(error.message);
  process.exit(1);
}
