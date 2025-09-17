#!/usr/bin/env node
/**
 * Manual demonstration of GitVan prompting system
 * Run this to interactively test the prompting functionality
 */

import { Pack } from '../src/pack/pack.mjs';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'pathe';

const DEMO_PACK_DIR = '/tmp/demo-pack';
const DEMO_TARGET_DIR = '/tmp/demo-target';

async function setupDemoPack() {
  // Clean up
  if (existsSync(DEMO_PACK_DIR)) {
    rmSync(DEMO_PACK_DIR, { recursive: true });
  }
  if (existsSync(DEMO_TARGET_DIR)) {
    rmSync(DEMO_TARGET_DIR, { recursive: true });
  }

  // Create directories
  mkdirSync(DEMO_PACK_DIR, { recursive: true });
  mkdirSync(DEMO_TARGET_DIR, { recursive: true });

  // Create comprehensive pack manifest for testing
  const manifest = {
    id: 'demo-pack',
    version: '1.0.0',
    description: 'Demo pack for testing prompting system',
    inputs: [
      {
        key: 'projectName',
        type: 'text',
        description: 'What is your project name?',
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: '^[a-zA-Z0-9-_]+$',
        patternMessage: 'Project name can only contain letters, numbers, hyphens, and underscores'
      },
      {
        key: 'framework',
        type: 'select',
        description: 'Choose your framework',
        enum: ['react', 'vue', 'angular', 'svelte'],
        default: 'react'
      },
      {
        key: 'features',
        type: 'multiselect',
        description: 'Select features to include',
        enum: ['typescript', 'eslint', 'prettier', 'jest', 'husky', 'tailwind'],
        required: false
      },
      {
        key: 'port',
        type: 'number',
        description: 'Development server port',
        min: 1000,
        max: 9999,
        default: 3000
      },
      {
        key: 'enableSSR',
        type: 'boolean',
        description: 'Enable Server-Side Rendering?',
        default: false
      },
      {
        key: 'apiKey',
        type: 'password',
        description: 'Enter your API key (optional)',
        required: false
      },
      {
        key: 'repositoryUrl',
        type: 'text',
        description: 'Git repository URL (optional)',
        required: false,
        pattern: '^https?://.*\\.git$',
        patternMessage: 'Must be a valid Git repository URL ending with .git'
      }
    ]
  };

  writeFileSync(join(DEMO_PACK_DIR, 'pack.json'), JSON.stringify(manifest, null, 2));

  console.log('✅ Demo pack created at:', DEMO_PACK_DIR);
  console.log('📋 Pack manifest has 7 different input types to test');
  return DEMO_PACK_DIR;
}

async function runInteractiveDemo() {
  console.log('🚀 GitVan Prompting System Demo\n');

  const packPath = await setupDemoPack();
  const pack = new Pack(packPath);
  await pack.load();

  console.log('📝 This will prompt you for various input types:');
  console.log('   - Text with validation (project name)');
  console.log('   - Select dropdown (framework)');
  console.log('   - Multiselect checkboxes (features)');
  console.log('   - Number with range (port)');
  console.log('   - Boolean confirmation (SSR)');
  console.log('   - Password input (API key)');
  console.log('   - Optional text with pattern (repo URL)\n');

  try {
    // Test interactive prompting
    console.log('🎯 Testing INTERACTIVE mode (will prompt for missing inputs):\n');
    const resolved = await pack.resolveInputs({}, {
      // Enable prompting
      noPrompt: false,
      nonInteractive: false
    });

    console.log('\n✅ Resolved inputs:');
    console.log(JSON.stringify(resolved, null, 2));

  } catch (error) {
    console.error('❌ Error during prompting:', error.message);
  }
}

async function runNonInteractiveDemo() {
  console.log('\n🤖 Testing NON-INTERACTIVE mode with defaults:\n');

  // Ensure pack is set up
  await setupDemoPack();

  const pack = new Pack(DEMO_PACK_DIR);
  await pack.load();

  try {
    const resolved = await pack.resolveInputs({}, {
      noPrompt: true,
      defaults: {
        projectName: 'my-awesome-project',
        framework: 'vue',
        features: ['typescript', 'eslint'],
        port: 8080,
        enableSSR: true
      }
    });

    console.log('✅ Resolved inputs with defaults:');
    console.log(JSON.stringify(resolved, null, 2));

  } catch (error) {
    console.error('❌ Error in non-interactive mode:', error.message);
  }
}

async function runMixedDemo() {
  console.log('\n🔀 Testing MIXED mode (some provided, some defaults, some prompts):\n');

  // Ensure pack is set up
  await setupDemoPack();

  const pack = new Pack(DEMO_PACK_DIR);
  await pack.load();

  try {
    const resolved = await pack.resolveInputs({
      // Provide some inputs directly
      projectName: 'provided-project',
      port: 4000
    }, {
      noPrompt: false,
      defaults: {
        // Provide defaults for some others
        framework: 'angular',
        enableSSR: true
      }
      // Will prompt for: features, apiKey, repositoryUrl
    });

    console.log('✅ Resolved inputs (mixed mode):');
    console.log(JSON.stringify(resolved, null, 2));

  } catch (error) {
    console.error('❌ Error in mixed mode:', error.message);
  }
}

// Main demo runner
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'interactive';

  switch (mode) {
    case 'interactive':
      await runInteractiveDemo();
      break;
    case 'non-interactive':
      await runNonInteractiveDemo();
      break;
    case 'mixed':
      await runMixedDemo();
      break;
    case 'all':
      await runInteractiveDemo();
      await runNonInteractiveDemo();
      await runMixedDemo();
      break;
    default:
      console.log('Usage: node manual-prompt-demo.mjs [interactive|non-interactive|mixed|all]');
      console.log('Default: interactive');
  }

  console.log('\n🎉 Demo completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}