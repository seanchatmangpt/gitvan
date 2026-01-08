#!/usr/bin/env node

/**
 * Quick test analyzer to identify failing tests
 */

import { spawn } from 'child_process';

const failures = [];
const passes = [];
const timeouts = [];
let currentTest = '';
let testStartTime = Date.now();

console.log('Starting test analysis...\n');

const testProcess = spawn('npm', ['test'], {
  cwd: '/home/user/gitvan',
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

testProcess.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n');

  for (const line of lines) {
    // Check for test start
    if (line.includes('> [22m') && !line.includes('[2m')) {
      currentTest = line;
    }

    // Check for failures
    if (line.includes('×')) {
      failures.push(currentTest || line);
    }

    // Check for passes
    if (line.includes('✓')) {
      passes.push(currentTest || line);
    }

    // Check for timeouts
    if (line.includes('timed out')) {
      timeouts.push(currentTest || line);
    }
  }
});

testProcess.stderr.on('data', (data) => {
  // Just consume stderr
});

// Kill after 2 minutes
setTimeout(() => {
  testProcess.kill();

  console.log('='.repeat(80));
  console.log('TEST ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nPassed: ${passes.length}`);
  console.log(`Failed: ${failures.length}`);
  console.log(`Timeouts: ${timeouts.length}`);
  console.log(`\nTime elapsed: ${((Date.now() - testStartTime) / 1000).toFixed(1)}s`);

  if (failures.length > 0) {
    console.log('\n\nFAILED TESTS:');
    console.log('-'.repeat(80));
    failures.slice(0, 20).forEach((f, i) => {
      console.log(`${i + 1}. ${f.trim()}`);
    });
    if (failures.length > 20) {
      console.log(`... and ${failures.length - 20} more failures`);
    }
  }

  if (timeouts.length > 0) {
    console.log('\n\nTIMED OUT TESTS:');
    console.log('-'.repeat(80));
    timeouts.forEach((t, i) => {
      console.log(`${i + 1}. ${t.trim()}`);
    });
  }

  process.exit(0);
}, 120000);
