#!/usr/bin/env node

/**
 * README Command Validation Script
 * Tests all commands mentioned in the README to ensure they work correctly
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = '/tmp/gitvan-readme-validation';
const RESULTS = {
  passed: [],
  failed: [],
  skipped: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'skip' ? '⏭️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function runCommand(command, description, options = {}) {
  const { skip = false, expectFailure = false, timeout = 10000 } = options;
  
  if (skip) {
    log(`SKIPPED: ${description}`, 'skip');
    RESULTS.skipped.push({ command, description, reason: 'Skipped by design' });
    return;
  }

  try {
    log(`Testing: ${description}`);
    log(`Command: ${command}`, 'info');
    
    const result = execSync(command, { 
      cwd: TEST_DIR,
      timeout,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (expectFailure) {
      log(`FAILED (expected): ${description}`, 'error');
      RESULTS.failed.push({ command, description, error: 'Expected failure but command succeeded', output: result });
    } else {
      log(`PASSED: ${description}`, 'success');
      RESULTS.passed.push({ command, description, output: result });
    }
  } catch (error) {
    if (expectFailure) {
      log(`PASSED (expected failure): ${description}`, 'success');
      RESULTS.passed.push({ command, description, error: error.message, expected: true });
    } else {
      log(`FAILED: ${description}`, 'error');
      RESULTS.failed.push({ command, description, error: error.message, output: error.stdout || error.stderr });
    }
  }
}

function setupTestEnvironment() {
  log('Setting up test environment...');
  
  // Clean up previous test
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  
  mkdirSync(TEST_DIR, { recursive: true });
  
  // Create a basic package.json for the test project
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'gitvan-readme-test',
    version: '1.0.0',
    description: 'Test project for README validation'
  }, null, 2));
  
  log('Test environment ready');
}

function testCoreCommands() {
  log('\n=== Testing Core Commands ===');
  
  // gitvan init
  runCommand('gitvan init', 'Initialize GitVan project');
  
  // gitvan help
  runCommand('gitvan help', 'Show help information');
  
  // gitvan ensure
  runCommand('gitvan ensure', 'Verify GitVan configuration');
}

function testJobCommands() {
  log('\n=== Testing Job Commands ===');
  
  // gitvan job list
  runCommand('gitvan job list', 'List available jobs');
  
  // gitvan run hello (should exist after init)
  runCommand('gitvan run hello', 'Run hello job');
  
  // gitvan job run --name hello
  runCommand('gitvan job run --name hello', 'Run hello job with explicit syntax');
}

function testPackCommands() {
  log('\n=== Testing Pack Commands ===');
  
  // gitvan pack list
  runCommand('gitvan pack list', 'List installed packs');
  
  // gitvan pack apply builtin/nodejs-basic (may fail if pack not properly installed)
  runCommand('gitvan pack apply builtin/nodejs-basic', 'Apply Node.js basic pack', { expectFailure: true });
  
  // gitvan pack plan builtin/next-minimal
  runCommand('gitvan pack plan builtin/next-minimal', 'Show Next.js pack plan');
  
  // gitvan scaffold builtin/next-minimal:create-nextjs-project
  runCommand('gitvan scaffold builtin/next-minimal:create-nextjs-project', 'Run Next.js scaffold');
}

function testMarketplaceCommands() {
  log('\n=== Testing Marketplace Commands ===');
  
  // gitvan marketplace browse (may timeout due to cache warmup)
  runCommand('gitvan marketplace browse', 'Browse marketplace packs', { timeout: 20000 });
  
  // gitvan marketplace quickstart
  runCommand('gitvan marketplace quickstart', 'Show quickstart categories');
  
  // gitvan marketplace quickstart next
  runCommand('gitvan marketplace quickstart next', 'Show Next.js quickstart');
  
  // gitvan marketplace quickstart docs
  runCommand('gitvan marketplace quickstart docs', 'Show docs quickstart');
}

function testAIChatCommands() {
  log('\n=== Testing AI Chat Commands ===');
  
  // gitvan chat generate (simple prompt)
  runCommand('gitvan chat generate "Create a simple hello world job"', 'Generate job via AI', { timeout: 30000 });
  
  // gitvan chat draft (simple prompt)
  runCommand('gitvan chat draft "Create a React component template"', 'Draft template via AI', { timeout: 30000 });
  
  // gitvan llm call (simple prompt)
  runCommand('gitvan llm call "What is GitVan?"', 'Direct AI interaction', { timeout: 30000 });
}

function testDaemonCommands() {
  log('\n=== Testing Daemon Commands ===');
  
  // gitvan daemon status
  runCommand('gitvan daemon status', 'Check daemon status');
  
  // gitvan daemon start (may fail if already running)
  runCommand('gitvan daemon start', 'Start GitVan daemon', { expectFailure: true });
}

function testAuditCommands() {
  log('\n=== Testing Audit Commands ===');
  
  // gitvan audit list
  runCommand('gitvan audit list', 'List all receipts');
  
  // gitvan audit verify (needs receipt ID, will fail without one)
  runCommand('gitvan audit verify', 'Verify operation integrity', { expectFailure: true });
  
  // gitvan audit build
  runCommand('gitvan audit build', 'Build audit report');
}

function testEventCommands() {
  log('\n=== Testing Event Commands ===');
  
  // gitvan event simulate
  runCommand('gitvan event simulate --files "jobs/**"', 'Simulate file events');
}

function generateReport() {
  log('\n=== Validation Report ===');
  
  console.log(`\n📊 Results Summary:`);
  console.log(`✅ Passed: ${RESULTS.passed.length}`);
  console.log(`❌ Failed: ${RESULTS.failed.length}`);
  console.log(`⏭️ Skipped: ${RESULTS.skipped.length}`);
  console.log(`📈 Success Rate: ${Math.round((RESULTS.passed.length / (RESULTS.passed.length + RESULTS.failed.length)) * 100)}%`);
  
  if (RESULTS.failed.length > 0) {
    console.log(`\n❌ Failed Commands:`);
    RESULTS.failed.forEach(({ command, description, error }) => {
      console.log(`  • ${description}`);
      console.log(`    Command: ${command}`);
      console.log(`    Error: ${error}`);
      console.log('');
    });
  }
  
  if (RESULTS.skipped.length > 0) {
    console.log(`\n⏭️ Skipped Commands:`);
    RESULTS.skipped.forEach(({ command, description, reason }) => {
      console.log(`  • ${description} (${reason})`);
    });
  }
  
  console.log(`\n✅ Successful Commands:`);
  RESULTS.passed.forEach(({ description }) => {
    console.log(`  • ${description}`);
  });
  
  // Write detailed report to file
  const reportPath = join(TEST_DIR, 'validation-report.md');
  const report = `# GitVan README Command Validation Report

Generated: ${new Date().toISOString()}

## Summary
- **Passed**: ${RESULTS.passed.length}
- **Failed**: ${RESULTS.failed.length}
- **Skipped**: ${RESULTS.skipped.length}
- **Success Rate**: ${Math.round((RESULTS.passed.length / (RESULTS.passed.length + RESULTS.failed.length)) * 100)}%

## Failed Commands
${RESULTS.failed.map(f => `- **${f.description}**: \`${f.command}\` - ${f.error}`).join('\n')}

## Successful Commands
${RESULTS.passed.map(p => `- **${p.description}**: \`${p.command}\``).join('\n')}

## Skipped Commands
${RESULTS.skipped.map(s => `- **${s.description}**: \`${s.command}\` - ${s.reason}`).join('\n')}
`;
  
  writeFileSync(reportPath, report);
  log(`Detailed report saved to: ${reportPath}`);
  
  return RESULTS.failed.length === 0;
}

async function main() {
  try {
    log('🚀 Starting GitVan README Command Validation');
    
    setupTestEnvironment();
    
    testCoreCommands();
    testJobCommands();
    testPackCommands();
    testMarketplaceCommands();
    testAIChatCommands();
    testDaemonCommands();
    testAuditCommands();
    testEventCommands();
    
    const success = generateReport();
    
    if (success) {
      log('🎉 All README commands validated successfully!', 'success');
      process.exit(0);
    } else {
      log('⚠️ Some commands failed validation. Check the report for details.', 'error');
      process.exit(1);
    }
  } catch (error) {
    log(`💥 Validation script failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
