#!/usr/bin/env node

/**
 * Example demonstrating the GitVan Pack Dependency System
 */

import { analyzeDependencies, createDependencyResolver, createPackComposer } from '../src/pack/dependency/index.mjs';

// Create a mock registry for demonstration
class MockRegistry {
  async get(packId) {
    const mockPacks = {
      'auth-jwt': {
        id: 'auth-jwt',
        version: '1.0.0',
        capabilities: ['auth', 'jwt'],
        compose: {
          dependsOn: ['base-pack', 'express-api'],
          conflictsWith: ['auth-oauth'],
          order: 20
        }
      },
      'base-pack': {
        id: 'base-pack',
        version: '1.0.0',
        capabilities: ['base', 'config'],
        compose: {
          dependsOn: [],
          order: 10
        }
      },
      'express-api': {
        id: 'express-api',
        version: '1.0.0',
        capabilities: ['api', 'express'],
        compose: {
          dependsOn: ['base-pack'],
          order: 15
        }
      },
      'auth-oauth': {
        id: 'auth-oauth',
        version: '1.0.0',
        capabilities: ['auth', 'oauth'],
        compose: {
          dependsOn: ['base-pack', 'express-api'],
          conflictsWith: ['auth-jwt'],
          order: 20
        }
      }
    };

    return mockPacks[packId] || null;
  }

  async list() {
    return ['auth-jwt', 'base-pack', 'express-api', 'auth-oauth'];
  }
}

async function demonstrateDependencyResolution() {
  console.log('🔍 GitVan Pack Dependency System Demo\n');

  // Create resolver with mock registry
  const resolver = createDependencyResolver();
  resolver.registry = new MockRegistry();

  console.log('1️⃣ Resolving dependencies for auth-jwt pack...\n');

  const resolution = await resolver.resolve('auth-jwt');

  console.log('📦 Resolved order:');
  resolution.forEach((pack, idx) => {
    console.log(`   ${idx + 1}. ${pack.id}@${pack.version}`);
    if (pack.capabilities) {
      console.log(`      Capabilities: ${pack.capabilities.join(', ')}`);
    }
    if (pack.compose?.dependsOn?.length > 0) {
      console.log(`      Depends on: ${pack.compose.dependsOn.join(', ')}`);
    }
  });

  console.log('\n2️⃣ Checking compatibility between auth-jwt and auth-oauth...\n');

  const compatible = await resolver.checkCompatibility('auth-jwt', 'auth-oauth');
  console.log(`   Compatible: ${compatible.compatible ? '✅ Yes' : '❌ No'}`);
  if (!compatible.compatible) {
    console.log(`   Reason: ${compatible.reason}`);
  }

  console.log('\n3️⃣ Analyzing dependency graph for auth-jwt...\n');

  const analysis = await analyzeDependencies(['auth-jwt'], { registry: new MockRegistry() });

  console.log('📊 Analysis Results:');
  console.log('   Cycles detected:', analysis.cycles.length > 0 ? '❌ Yes' : '✅ No');
  console.log('   Topological order:', analysis.topologicalOrder.join(' → '));
  console.log('\n   Complexity metrics:');
  Object.entries(analysis.metrics).forEach(([key, value]) => {
    console.log(`     ${key}: ${value}`);
  });

  console.log('\n📈 Dependency Graph (Text):');
  console.log(analysis.visualization.text);

  console.log('\n✨ Demonstration complete!');
}

// Run demonstration
demonstrateDependencyResolution().catch(console.error);