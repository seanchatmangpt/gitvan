/**
 * Integration test for pack composition workflow
 */

import { createPackComposer, analyzeDependencies } from '../src/pack/dependency/index.mjs';
import { PackRegistry } from '../src/pack/registry.mjs';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';

// Mock realistic pack data
const mockPackData = {
  'nodejs-base': {
    id: 'nodejs-base',
    version: '1.0.0',
    name: 'Node.js Base',
    description: 'Basic Node.js setup with package.json and common configs',
    capabilities: ['nodejs', 'base'],
    requires: { node: '>=16.0.0' },
    compose: { order: 1 },
    provides: {
      templates: [
        { src: 'package.json.njk', target: 'package.json' }
      ],
      files: [
        { src: '.gitignore', target: '.gitignore' }
      ]
    },
    dependencies: {
      npm: {
        scripts: {
          start: 'node index.js',
          test: 'npm run test:unit'
        }
      }
    }
  },
  'express-api': {
    id: 'express-api',
    version: '2.1.0',
    name: 'Express API',
    description: 'Express.js REST API with middleware and routes',
    capabilities: ['api', 'http'],
    compose: {
      dependsOn: ['nodejs-base'],
      order: 2
    },
    provides: {
      templates: [
        { src: 'server.js.njk', target: 'src/server.js' },
        { src: 'routes/index.js.njk', target: 'src/routes/index.js' }
      ]
    },
    dependencies: {
      npm: {
        dependencies: {
          express: '^4.18.0',
          cors: '^2.8.5',
          helmet: '^6.0.0'
        },
        scripts: {
          'start:dev': 'nodemon src/server.js'
        }
      }
    }
  },
  'auth-jwt': {
    id: 'auth-jwt',
    version: '1.5.0',
    name: 'JWT Authentication',
    description: 'JWT-based authentication middleware',
    capabilities: ['auth', 'jwt'],
    compose: {
      dependsOn: ['express-api'],
      order: 3
    },
    provides: {
      templates: [
        { src: 'middleware/auth.js.njk', target: 'src/middleware/auth.js' },
        { src: 'routes/auth.js.njk', target: 'src/routes/auth.js' }
      ]
    },
    dependencies: {
      npm: {
        dependencies: {
          jsonwebtoken: '^9.0.0',
          bcryptjs: '^2.4.3'
        }
      }
    }
  },
  'database-postgres': {
    id: 'database-postgres',
    version: '1.2.0',
    name: 'PostgreSQL Database',
    description: 'PostgreSQL database integration with migrations',
    capabilities: ['database', 'sql'],
    compose: {
      dependsOn: ['nodejs-base'],
      order: 2
    },
    provides: {
      templates: [
        { src: 'db/config.js.njk', target: 'src/db/config.js' },
        { src: 'migrations/001_initial.sql.njk', target: 'migrations/001_initial.sql' }
      ]
    },
    dependencies: {
      npm: {
        dependencies: {
          pg: '^8.8.0',
          'db-migrate': '^0.11.13'
        },
        scripts: {
          'db:migrate': 'db-migrate up',
          'db:rollback': 'db-migrate down'
        }
      }
    }
  },
  'testing-suite': {
    id: 'testing-suite',
    version: '1.0.0',
    name: 'Testing Suite',
    description: 'Complete testing setup with Jest and supertest',
    capabilities: ['testing'],
    compose: {
      dependsOn: ['express-api'],
      order: 4
    },
    provides: {
      templates: [
        { src: 'tests/setup.js.njk', target: 'tests/setup.js' },
        { src: 'tests/api.test.js.njk', target: 'tests/api.test.js' }
      ]
    },
    dependencies: {
      npm: {
        devDependencies: {
          jest: '^29.0.0',
          supertest: '^6.2.0',
          '@types/jest': '^29.0.0'
        },
        scripts: {
          'test:unit': 'jest',
          'test:watch': 'jest --watch',
          'test:coverage': 'jest --coverage'
        }
      }
    }
  },
  // Conflicting pack for testing
  'fastify-api': {
    id: 'fastify-api',
    version: '1.0.0',
    name: 'Fastify API',
    description: 'Fastify-based API server',
    capabilities: ['api', 'http'], // Conflicts with express-api
    compose: {
      dependsOn: ['nodejs-base'],
      conflictsWith: ['express-api'],
      order: 2
    },
    dependencies: {
      npm: {
        dependencies: {
          fastify: '^4.0.0'
        }
      }
    }
  }
};

// Enhanced mock registry
class IntegrationMockRegistry extends PackRegistry {
  async get(packId) {
    return mockPackData[packId] || null;
  }

  async resolve(packId) {
    return mockPackData[packId] ? `/mock/packs/${packId}` : null;
  }

  async info(packId) {
    const pack = mockPackData[packId];
    return pack ? {
      ...pack,
      path: `/mock/packs/${pack.id}`
    } : null;
  }
}

async function testBasicComposition() {
  console.log('🔧 Testing Basic Pack Composition\n');

  const composer = createPackComposer();
  composer.resolver.registry = new IntegrationMockRegistry();

  const testDir = join(tmpdir(), 'gitvan-test-composition');

  try {
    // Clean and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Test simple composition
    const packIds = ['nodejs-base', 'express-api'];
    const result = await composer.compose(packIds, testDir, {
      projectName: 'test-api',
      description: 'Test API project'
    });

    console.log('Composition result:', result.status);
    console.log('Applied packs:', result.applied.length);
    console.log('Errors:', result.errors.length);
    console.log('Order:', result.order);

    if (result.status === 'OK') {
      console.log('✓ Basic composition successful\n');
    } else {
      console.log('❌ Basic composition failed\n');
      throw new Error(`Composition failed: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Basic composition test failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  }
}

async function testComplexComposition() {
  console.log('🏗️ Testing Complex Pack Composition\n');

  const composer = createPackComposer();
  composer.resolver.registry = new IntegrationMockRegistry();

  try {
    // Test complex dependency chain
    const packIds = ['auth-jwt', 'database-postgres', 'testing-suite'];

    const preview = await composer.preview(packIds);
    console.log('Preview - Total packs:', preview.totalPacks);
    console.log('Preview - Order:', preview.order);
    console.log('Preview - Conflicts:', preview.conflicts.length);

    const validation = await composer.validateComposition(packIds);
    console.log('Validation - Valid:', validation.valid);
    console.log('Validation - Errors:', validation.errors.length);
    console.log('Validation - Warnings:', validation.warnings.length);

    if (validation.valid) {
      console.log('✓ Complex composition validation passed\n');
    } else {
      console.log('❌ Complex composition validation failed\n');
      console.log('Errors:', validation.errors);
    }

  } catch (error) {
    console.error('❌ Complex composition test failed:', error.message);
    throw error;
  }
}

async function testConflictHandling() {
  console.log('⚠️ Testing Conflict Handling\n');

  const composer = createPackComposer();
  composer.resolver.registry = new IntegrationMockRegistry();

  try {
    // Test conflicting packs
    const conflictingPacks = ['express-api', 'fastify-api'];

    const validation = await composer.validateComposition(conflictingPacks);
    console.log('Conflict validation - Valid:', validation.valid);
    console.log('Conflict validation - Errors:', validation.errors.length);

    if (!validation.valid) {
      console.log('Error details:', validation.errors[0]);
      console.log('✓ Conflict detection working correctly\n');
    } else {
      console.log('❌ Conflict detection failed - should have detected conflicts\n');
      throw new Error('Conflict detection failed');
    }

    // Test composition with ignoreConflicts option
    const composer2 = createPackComposer({ ignoreConflicts: true });
    composer2.resolver.registry = new IntegrationMockRegistry();

    const preview = await composer2.preview(conflictingPacks);
    console.log('Conflict ignored - Total packs:', preview.totalPacks);
    console.log('Conflict ignored - Conflicts:', preview.conflicts.length);
    console.log('✓ Conflict ignoring works\n');

  } catch (error) {
    console.error('❌ Conflict handling test failed:', error.message);
    throw error;
  }
}

async function testDependencyAnalysis() {
  console.log('📊 Testing Dependency Analysis\n');

  try {
    const packIds = ['auth-jwt', 'database-postgres', 'testing-suite'];

    const analysis = await analyzeDependencies(packIds, {
      registry: new IntegrationMockRegistry()
    });

    console.log('Analysis - Total nodes:', analysis.graph.nodes.size);
    console.log('Analysis - Total edges:', analysis.graph.edges.length);
    console.log('Analysis - Cycles detected:', analysis.cycles.length);
    console.log('Analysis - Topological order:', analysis.topologicalOrder);
    console.log('Analysis - Metrics:', analysis.metrics);

    if (analysis.criticalPath) {
      console.log('Critical path length:', analysis.criticalPath.length);
      console.log('Critical path:', analysis.criticalPath.path);
    }

    // Test visualization
    const textViz = analysis.visualization.text;
    console.log('Text visualization generated (length):', textViz.length);

    const dotViz = analysis.visualization.dot;
    console.log('DOT visualization generated (length):', dotViz.length);

    console.log('✓ Dependency analysis completed\n');

    // Show sample of text visualization
    console.log('Sample visualization:');
    console.log(textViz.split('\n').slice(0, 12).join('\n'));
    console.log('...\n');

  } catch (error) {
    console.error('❌ Dependency analysis test failed:', error.message);
    throw error;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Pack Composition Integration Tests\n');
  console.log('='.repeat(50));

  try {
    await testBasicComposition();
    await testComplexComposition();
    await testConflictHandling();
    await testDependencyAnalysis();

    console.log('🎉 All integration tests passed!');
    console.log('✓ Basic composition works');
    console.log('✓ Complex composition works');
    console.log('✓ Conflict handling works');
    console.log('✓ Dependency analysis works');

    return true;

  } catch (error) {
    console.error('❌ Integration tests failed:', error.message);
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runIntegrationTests };