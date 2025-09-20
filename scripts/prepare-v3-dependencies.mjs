#!/usr/bin/env node
/**
 * GitVan v3.0.0 Dependency Preparation Script
 * Installs missing AI SDK dependencies and validates setup
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const log = (message) => console.log(`🚀 [V3 Prep] ${message}`);

async function installMissingDependencies() {
  log('Installing missing AI SDK dependencies...');
  
  try {
    // Install missing AI SDK packages
    execSync('pnpm install @ai-sdk/anthropic @ai-sdk/openai', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log('✅ Successfully installed @ai-sdk/anthropic and @ai-sdk/openai');
    
    // Verify installation
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies['@ai-sdk/anthropic'] && dependencies['@ai-sdk/openai']) {
      log('✅ Dependencies verified in package.json');
    } else {
      log('⚠️  Dependencies may not be properly installed');
    }
    
  } catch (error) {
    log(`❌ Failed to install dependencies: ${error.message}`);
    throw error;
  }
}

async function validateAIIntegration() {
  log('Validating AI integration...');
  
  try {
    // Test if AI providers can be imported
    const { AnthropicProvider } = await import('@ai-sdk/anthropic');
    const { OpenAIProvider } = await import('@ai-sdk/openai');
    
    log('✅ AI SDK providers can be imported successfully');
    
    // Check if GitVan AI provider factory supports these
    const providerFactoryPath = 'src/ai/provider-factory.mjs';
    try {
      const providerFactory = await import(`../${providerFactoryPath}`);
      log('✅ AI provider factory found');
      
      // TODO: Validate that provider factory supports new providers
      log('⚠️  Need to update provider factory to support new AI providers');
      
    } catch (error) {
      log(`⚠️  AI provider factory not found or has issues: ${error.message}`);
    }
    
  } catch (error) {
    log(`❌ AI integration validation failed: ${error.message}`);
    throw error;
  }
}

async function checkContextIssues() {
  log('Checking GitVan context initialization...');
  
  try {
    // Test context initialization
    const { withGitVan, useGitVan } = await import('../src/composables/ctx.mjs');
    
    // Test basic context usage
    await withGitVan({ cwd: process.cwd() }, async () => {
      const ctx = useGitVan();
      if (ctx && ctx.cwd) {
        log('✅ GitVan context initialization working');
      } else {
        log('⚠️  GitVan context may have issues');
      }
    });
    
  } catch (error) {
    log(`❌ Context initialization test failed: ${error.message}`);
    throw error;
  }
}

async function identifyOversizedFiles() {
  log('Identifying oversized files for refactoring...');
  
  try {
    const { execSync } = await import('node:child_process');
    const output = execSync('find src -name "*.mjs" -exec wc -l {} + | sort -nr | head -10', { 
      encoding: 'utf8' 
    });
    
    log('📊 Top 10 largest files:');
    console.log(output);
    
    // Check for files over 500 lines
    const lines = output.split('\n').filter(line => line.trim());
    const oversizedFiles = lines.filter(line => {
      const match = line.match(/^\s*(\d+)\s+(.+)$/);
      return match && parseInt(match[1]) > 500;
    });
    
    if (oversizedFiles.length > 0) {
      log(`⚠️  Found ${oversizedFiles.length} files over 500 lines that need refactoring:`);
      oversizedFiles.forEach(file => log(`   - ${file}`));
    } else {
      log('✅ No files exceed 500 lines');
    }
    
  } catch (error) {
    log(`❌ Failed to identify oversized files: ${error.message}`);
  }
}

async function identifyStubFiles() {
  log('Identifying stub files (under 50 lines)...');
  
  try {
    const { execSync } = await import('node:child_process');
    const output = execSync('find src -name "*.mjs" -exec wc -l {} + | sort -n | head -20', { 
      encoding: 'utf8' 
    });
    
    log('📊 Smallest files (potential stubs):');
    console.log(output);
    
    // Check for files under 50 lines
    const lines = output.split('\n').filter(line => line.trim());
    const stubFiles = lines.filter(line => {
      const match = line.match(/^\s*(\d+)\s+(.+)$/);
      return match && parseInt(match[1]) < 50;
    });
    
    if (stubFiles.length > 0) {
      log(`⚠️  Found ${stubFiles.length} potential stub files (under 50 lines):`);
      stubFiles.forEach(file => log(`   - ${file}`));
    } else {
      log('✅ No obvious stub files found');
    }
    
  } catch (error) {
    log(`❌ Failed to identify stub files: ${error.message}`);
  }
}

async function runTests() {
  log('Running test suite to check current status...');
  
  try {
    execSync('pnpm test --run', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('✅ Tests completed successfully');
  } catch (error) {
    log(`⚠️  Tests had issues: ${error.message}`);
    log('This is expected - we need to fix test coverage as part of v3 prep');
  }
}

async function main() {
  log('Starting GitVan v3.0.0 preparation...');
  
  try {
    await installMissingDependencies();
    await validateAIIntegration();
    await checkContextIssues();
    await identifyOversizedFiles();
    await identifyStubFiles();
    await runTests();
    
    log('🎉 GitVan v3.0.0 preparation completed successfully!');
    log('Next steps:');
    log('1. Refactor oversized files');
    log('2. Complete stub implementations');
    log('3. Fix failing tests');
    log('4. Implement missing CLI commands');
    log('5. Begin autonomous intelligence engine development');
    
  } catch (error) {
    log(`❌ Preparation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}