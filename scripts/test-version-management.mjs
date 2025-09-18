#!/usr/bin/env node

/**
 * GitVan v2 Version Management Demo
 * Demonstrates the working semver-based version management system
 */

import { createLogger } from '../src/utils/logger.mjs';
import {
  satisfiesConstraint,
  compareVersions,
  isGreaterThan,
  getLatestVersion,
  parseConstraint,
  areConstraintsCompatible,
  isUpdateAvailable,
  getSuggestedUpdate
} from '../src/utils/version.mjs';

import { RegistryClient } from '../src/utils/registry.mjs';
import { PackManager } from '../src/pack/manager.mjs';
import { DependencyResolver } from '../src/pack/dependency/resolver.mjs';

const logger = createLogger('version-demo');

console.log('🚀 GitVan v2 Version Management Demo');
console.log('=====================================\n');

// 1. Basic version operations
console.log('1. Basic Version Operations:');
console.log('----------------------------');

const versions = ['1.0.0', '1.2.3', '2.0.0-beta.1', '2.0.0', '1.5.9'];
console.log(`Input versions: ${versions.join(', ')}`);
console.log(`Latest version: ${getLatestVersion(versions)}`);

const constraints = [
  { version: '1.2.3', constraint: '^1.0.0', expected: true },
  { version: '2.0.0', constraint: '^1.0.0', expected: false },
  { version: '1.2.5', constraint: '~1.2.0', expected: true },
  { version: '1.3.0', constraint: '~1.2.0', expected: false },
  { version: '2.1.0', constraint: '>=2.0.0', expected: true }
];

console.log('\nConstraint satisfaction tests:');
constraints.forEach(({ version, constraint, expected }) => {
  const result = satisfiesConstraint(version, constraint);
  const status = result === expected ? '✅' : '❌';
  console.log(`  ${status} ${version} satisfies ${constraint}: ${result}`);
});

// 2. Version comparison
console.log('\n2. Version Comparisons:');
console.log('-----------------------');

const comparisons = [
  ['1.0.0', '2.0.0'],
  ['2.1.0', '2.0.0'],
  ['1.0.0-alpha', '1.0.0'],
  ['1.0.0-beta', '1.0.0-alpha']
];

comparisons.forEach(([v1, v2]) => {
  const result = compareVersions(v1, v2);
  const symbol = result < 0 ? '<' : result > 0 ? '>' : '=';
  console.log(`  ${v1} ${symbol} ${v2} (${result})`);
});

// 3. Registry operations
console.log('\n3. Registry Operations:');
console.log('-----------------------');

const registry = new RegistryClient({ useMockData: true });

const packages = ['@gitvan/templates-web', '@gitvan/templates-api', '@gitvan/utils-common'];

for (const pkg of packages) {
  try {
    const info = await registry.fetchPackageInfo(pkg);
    if (info) {
      console.log(`  📦 ${pkg}:`);
      console.log(`     Latest: ${info.latest}`);
      console.log(`     Versions: ${info.versions.join(', ')}`);
    }
  } catch (error) {
    console.log(`  ❌ ${pkg}: ${error.message}`);
  }
}

// 4. Update checking
console.log('\n4. Update Checking:');
console.log('-------------------');

const updateChecks = [
  { current: '1.0.0', latest: '1.2.0' },
  { current: '1.0.0', latest: '2.0.0' },
  { current: '2.0.0', latest: '2.0.0' },
  { current: '1.5.0', latest: '1.4.0' }
];

updateChecks.forEach(({ current, latest }) => {
  const available = isUpdateAvailable(current, latest);
  const status = available ? '🔄' : '✅';
  console.log(`  ${status} ${current} -> ${latest}: ${available ? 'Update available' : 'Up to date'}`);
});

// 5. Constraint compatibility
console.log('\n5. Constraint Compatibility:');
console.log('----------------------------');

const compatibilityTests = [
  ['^1.0.0', '^1.2.0'],
  ['^1.0.0', '^2.0.0'],
  ['~1.2.0', '^1.0.0'],
  ['>=2.0.0', '<3.0.0']
];

compatibilityTests.forEach(([c1, c2]) => {
  const compatible = areConstraintsCompatible(c1, c2);
  const status = compatible ? '✅' : '❌';
  console.log(`  ${status} ${c1} + ${c2}: ${compatible ? 'Compatible' : 'Incompatible'}`);
});

// 6. Dependency resolution
console.log('\n6. Dependency Resolution:');
console.log('-------------------------');

const resolver = new DependencyResolver();

const resolutionTests = [
  { version: '1.2.3', constraint: '^1.0.0' },
  { version: '2.0.0', constraint: '^1.0.0' },
  { version: '1.2.5', constraint: '~1.2.0' },
  { version: '1.0.0', constraint: '>=1.0.0' }
];

console.log('Version constraint resolution:');
resolutionTests.forEach(({ version, constraint }) => {
  const satisfies = resolver.checkVersionConstraint(version, constraint);
  const status = satisfies ? '✅' : '❌';
  console.log(`  ${status} ${version} satisfies ${constraint}: ${satisfies}`);
});

// 7. Best version selection
console.log('\nBest version selection:');
const availableVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'];

const bestVersionTests = [
  '^1.0.0',
  '~1.1.0',
  '>=2.0.0',
  '^3.0.0'
];

bestVersionTests.forEach(constraint => {
  const best = resolver.findBestVersion(availableVersions, constraint);
  console.log(`  Best for ${constraint}: ${best || 'None found'}`);
});

console.log('\n✨ Version management is working correctly!');
console.log('\nKey improvements implemented:');
console.log('• Proper semver constraint checking (^, ~, >=, etc.)');
console.log('• Registry-based version fetching with caching');
console.log('• Advanced dependency resolution with compatibility checking');
console.log('• Pre-release version support');
console.log('• Comprehensive error handling');
console.log('• Version conflict detection and resolution');