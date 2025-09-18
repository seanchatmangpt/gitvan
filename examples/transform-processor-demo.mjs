#!/usr/bin/env node

import { TransformProcessor } from '../src/pack/operations/transform-processor.mjs';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

console.log('🚀 Enhanced Transform Processor Demo\n');

const processor = new TransformProcessor();
const tempFiles = [];

function createTempFile(content, ext = 'json') {
  const filename = join(tmpdir(), `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`);
  writeFileSync(filename, content);
  tempFiles.push(filename);
  return filename;
}

function cleanup() {
  tempFiles.forEach(file => {
    try { unlinkSync(file); } catch {}
  });
}

// Demo functions
async function demoJsonOperations() {
  console.log('📄 JSON Operations Demo');
  console.log('========================\n');

  // JSON Merge with strategy
  const packageJson = {
    name: 'my-app',
    version: '1.0.0',
    dependencies: {
      express: '^4.18.0'
    },
    scripts: {
      start: 'node index.js'
    }
  };

  const target = createTempFile(JSON.stringify(packageJson, null, 2));
  console.log('Original package.json:');
  console.log(readFileSync(target, 'utf8'));

  await processor.apply({
    target,
    kind: 'json-merge',
    spec: {
      strategy: 'merge',
      data: {
        author: 'Demo Author',
        dependencies: {
          lodash: '^4.17.21',
          cors: '^2.8.5'
        },
        scripts: {
          dev: 'nodemon index.js',
          test: 'jest'
        }
      }
    }
  });

  console.log('\nAfter merge:');
  console.log(readFileSync(target, 'utf8'));

  // JSON Patch operations
  await processor.apply({
    target,
    kind: 'json-patch',
    spec: {
      operations: [
        { op: 'replace', path: '/version', value: '2.0.0' },
        { op: 'add', path: '/repository', value: { type: 'git', url: 'https://github.com/user/repo.git' } },
        { op: 'remove', path: '/dependencies/express' }
      ]
    }
  });

  console.log('\nAfter patch operations:');
  console.log(readFileSync(target, 'utf8'));
  console.log('\n');
}

async function demoYamlOperations() {
  console.log('📝 YAML Operations Demo');
  console.log('========================\n');

  const yamlConfig = `name: microservice-app
version: 1.0.0
services:
  api:
    port: 3000
    replicas: 2
  database:
    type: postgresql
    port: 5432
environment:
  NODE_ENV: development`;

  const target = createTempFile(yamlConfig, 'yaml');
  console.log('Original config.yaml:');
  console.log(readFileSync(target, 'utf8'));

  await processor.apply({
    target,
    kind: 'yaml-merge',
    spec: {
      data: {
        author: 'DevOps Team',
        services: {
          redis: {
            port: 6379,
            replicas: 1
          },
          api: {
            memory: '512Mi'
          }
        },
        monitoring: {
          enabled: true,
          endpoint: '/metrics'
        }
      }
    }
  });

  console.log('\nAfter YAML merge:');
  console.log(readFileSync(target, 'utf8'));
  console.log('\n');
}

async function demoTomlOperations() {
  console.log('⚙️ TOML Operations Demo');
  console.log('========================\n');

  const tomlConfig = `[package]
name = "rust-app"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1.0"
tokio = "1.0"

[build]
target = "x86_64-unknown-linux-gnu"`;

  const target = createTempFile(tomlConfig, 'toml');
  console.log('Original Cargo.toml:');
  console.log(readFileSync(target, 'utf8'));

  await processor.apply({
    target,
    kind: 'toml-merge',
    spec: {
      data: {
        package: {
          author: 'Rust Developer',
          description: 'A sample Rust application'
        },
        dependencies: {
          reqwest: '0.11',
          clap: '4.0'
        },
        features: {
          default: ['json-support'],
          'json-support': ['serde/derive']
        }
      }
    }
  });

  console.log('\nAfter TOML merge:');
  console.log(readFileSync(target, 'utf8'));
  console.log('\n');
}

async function demoXmlOperations() {
  console.log('🌐 XML Operations Demo');
  console.log('=======================\n');

  const xmlConfig = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <database>
    <host>localhost</host>
    <port>5432</port>
    <name>myapp</name>
  </database>
  <logging>
    <level>info</level>
  </logging>
</configuration>`;

  const target = createTempFile(xmlConfig, 'xml');
  console.log('Original config.xml:');
  console.log(readFileSync(target, 'utf8'));

  await processor.apply({
    target,
    kind: 'xml-merge',
    spec: {
      data: {
        configuration: {
          database: {
            username: 'admin',
            ssl: 'true'
          },
          cache: {
            type: 'redis',
            ttl: '3600'
          },
          logging: {
            format: 'json'
          }
        }
      }
    }
  });

  console.log('\nAfter XML merge:');
  console.log(readFileSync(target, 'utf8'));
  console.log('\n');
}

async function demoJsonPathOperations() {
  console.log('🔍 JSONPath Operations Demo');
  console.log('============================\n');

  const complexData = {
    users: [
      { id: 1, name: 'Alice', role: 'admin', active: true, profile: { email: 'alice@example.com', age: 30 } },
      { id: 2, name: 'Bob', role: 'user', active: false, profile: { email: 'bob@example.com', age: 25 } },
      { id: 3, name: 'Charlie', role: 'user', active: true, profile: { email: 'charlie@example.com', age: 35 } }
    ],
    settings: {
      theme: 'dark',
      notifications: true,
      version: '1.0.0'
    }
  };

  const target = createTempFile(JSON.stringify(complexData, null, 2));
  console.log('Original data:');
  console.log(readFileSync(target, 'utf8'));

  // JSONPath modifications
  await processor.apply({
    target,
    kind: 'jsonpath-modify',
    spec: {
      modifications: [
        {
          path: '$.users[?(@.active == false)].name',
          operation: 'transform',
          transform: 'uppercase'
        },
        {
          path: '$.users[*].profile.age',
          operation: 'transform',
          transform: 'increment',
          by: 1
        },
        {
          path: '$.settings.version',
          operation: 'set',
          value: '2.0.0'
        },
        {
          path: '$.settings.lastUpdated',
          operation: 'set',
          value: new Date().toISOString()
        }
      ]
    }
  });

  console.log('\nAfter JSONPath modifications:');
  console.log(readFileSync(target, 'utf8'));
  console.log('\n');
}

async function demoMergeStrategies() {
  console.log('🔀 Merge Strategies Demo');
  console.log('=========================\n');

  const baseConfig = {
    name: 'my-app',
    features: ['auth', 'logging'],
    database: {
      host: 'localhost',
      port: 5432
    }
  };

  // Test different merge strategies
  const strategies = ['merge', 'replace', 'append'];
  const newData = {
    features: ['monitoring', 'caching'],
    database: {
      ssl: true,
      timeout: 30
    },
    version: '1.0.0'
  };

  for (const strategy of strategies) {
    const target = createTempFile(JSON.stringify(baseConfig, null, 2));

    console.log(`\nUsing ${strategy} strategy:`);
    console.log('Original:', JSON.stringify(baseConfig, null, 2));

    await processor.apply({
      target,
      kind: 'json-merge',
      spec: {
        strategy,
        data: newData
      }
    });

    console.log('Result:', readFileSync(target, 'utf8'));
  }
  console.log('\n');
}

async function demoValidationAndSafety() {
  console.log('🛡️ Validation and Safety Demo');
  console.log('===============================\n');

  const validData = {
    name: 'test-app',
    version: '1.0.0',
    author: 'Test Author'
  };

  const target = createTempFile(JSON.stringify(validData, null, 2));

  // Schema validation
  const schema = {
    type: 'object',
    required: ['name', 'version'],
    properties: {
      name: { type: 'string', minLength: 1 },
      version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      author: { type: 'string' }
    }
  };

  console.log('Testing schema validation...');
  try {
    const result = await processor.apply({
      target,
      kind: 'json-merge',
      spec: {
        schema,
        outputSchema: schema,
        data: {
          description: 'A test application',
          license: 'MIT'
        }
      }
    });
    console.log('✅ Validation passed');
    console.log('Result size:', result.size);
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
  }

  // Dry run demo
  console.log('\nTesting dry run mode...');
  const dryRunProcessor = new TransformProcessor({ dryRun: true });
  const dryResult = await dryRunProcessor.apply({
    target,
    kind: 'json-merge',
    spec: {
      data: { newField: 'this is a preview' }
    }
  });

  console.log('Dry run result:', {
    dryRun: dryResult.dryRun,
    preview: dryResult.preview
  });
  console.log('\n');
}

// Run all demos
async function runDemo() {
  try {
    await demoJsonOperations();
    await demoYamlOperations();
    await demoTomlOperations();
    await demoXmlOperations();
    await demoJsonPathOperations();
    await demoMergeStrategies();
    await demoValidationAndSafety();

    console.log('🎉 All demos completed successfully!');
    console.log('\nTransform Processor Features:');
    console.log('✅ JSON/JSON5 support with merge and patch operations');
    console.log('✅ YAML support with js-yaml');
    console.log('✅ TOML support with @iarna/toml');
    console.log('✅ INI file support');
    console.log('✅ XML support with xml2js');
    console.log('✅ JSONPath queries and modifications');
    console.log('✅ Multiple merge strategies (merge, replace, append, prepend)');
    console.log('✅ Schema validation with AJV');
    console.log('✅ Safety checks and dry run mode');
    console.log('✅ Backup and rollback functionality');
    console.log('✅ Comprehensive error handling');
    console.log('✅ Format auto-detection');

  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    cleanup();
  }
}

// Handle cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

// Run the demo
runDemo();