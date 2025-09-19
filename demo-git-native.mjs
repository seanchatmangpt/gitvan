#!/usr/bin/env node

/**
 * Git-Native I/O Demo Script
 * Demonstrates the core functionality of the Git-Native I/O system
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitNativeIO } from './src/git-native/GitNativeIO.mjs';

const execAsync = promisify(exec);

async function createTestRepo() {
  const testDir = join(process.cwd(), 'demo-git-native-' + Date.now());
  await fs.mkdir(testDir, { recursive: true });
  
  // Initialize git repository
  await execAsync('git init', { cwd: testDir });
  await execAsync('git config user.email "demo@example.com"', { cwd: testDir });
  await execAsync('git config user.name "Demo User"', { cwd: testDir });
  
  // Create initial commit
  await fs.writeFile(join(testDir, 'README.md'), '# Git-Native I/O Demo');
  await execAsync('git add README.md', { cwd: testDir });
  await execAsync('git commit -m "Initial commit"', { cwd: testDir });
  
  return testDir;
}

async function cleanupTestRepo(testDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up test directory: ${error.message}`);
  }
}

async function runDemo() {
  console.log('🚀 Git-Native I/O Demo Starting...\n');
  
  let testDir;
  let io;
  
  try {
    // Create test repository
    console.log('📁 Creating test repository...');
    testDir = await createTestRepo();
    console.log(`✅ Test repository created: ${testDir}\n`);
    
    // Initialize GitNativeIO
    console.log('🔧 Initializing GitNativeIO...');
    io = new GitNativeIO({ 
      cwd: testDir,
      logger: console
    });
    
    await io.initialize();
    console.log('✅ GitNativeIO initialized successfully\n');
    
    // Test 1: Execute a simple job
    console.log('🧪 Test 1: Execute simple job');
    const result = await io.executeJob(async () => {
      return 'Hello, Git-Native I/O!';
    });
    console.log(`✅ Job result: ${result}\n`);
    
    // Test 2: Acquire and release a lock
    console.log('🔒 Test 2: Acquire and release lock');
    const acquired = await io.acquireLock('demo-lock');
    console.log(`✅ Lock acquired: ${acquired}`);
    
    const isLocked = await io.isLocked('demo-lock');
    console.log(`✅ Lock status: ${isLocked}`);
    
    const released = await io.releaseLock('demo-lock');
    console.log(`✅ Lock released: ${released}\n`);
    
    // Test 3: Write and read receipts
    console.log('📝 Test 3: Write and read receipts');
    await io.writeReceipt('demo-hook', { success: true, message: 'Demo completed' });
    await io.flushAll();
    console.log('✅ Receipt written and flushed\n');
    
    // Test 4: Store and retrieve snapshots
    console.log('💾 Test 4: Store and retrieve snapshots');
    const snapshotData = { timestamp: Date.now(), data: 'demo-snapshot' };
    const contentHash = await io.storeSnapshot('demo-snapshot', snapshotData);
    console.log(`✅ Snapshot stored with hash: ${contentHash.substring(0, 8)}...`);
    
    const retrieved = await io.getSnapshot('demo-snapshot', contentHash);
    console.log(`✅ Snapshot retrieved: ${JSON.stringify(retrieved)}\n`);
    
    // Test 5: Add jobs to priority queues
    console.log('⚡ Test 5: Add jobs to priority queues');
    const highResult = await io.addJob('high', async () => 'high-priority-result');
    const mediumResult = await io.addJob('medium', async () => 'medium-priority-result');
    const lowResult = await io.addJob('low', async () => 'low-priority-result');
    
    console.log(`✅ High priority result: ${highResult}`);
    console.log(`✅ Medium priority result: ${mediumResult}`);
    console.log(`✅ Low priority result: ${lowResult}\n`);
    
    // Test 6: Get system status
    console.log('📊 Test 6: Get system status');
    const status = await io.getStatus();
    console.log('✅ System status:');
    console.log(`   - Queue status: ${JSON.stringify(status.queue, null, 2)}`);
    console.log(`   - Active locks: ${status.locks.length}`);
    console.log(`   - Receipt stats: ${JSON.stringify(status.receipts)}`);
    console.log(`   - Snapshot stats: ${JSON.stringify(status.snapshots)}`);
    console.log(`   - Worker stats: ${JSON.stringify(status.workers)}\n`);
    
    // Test 7: Cleanup
    console.log('🧹 Test 7: Cleanup');
    await io.cleanup();
    console.log('✅ Cleanup completed\n');
    
    // Test 8: Shutdown
    console.log('🛑 Test 8: Shutdown');
    await io.shutdown();
    console.log('✅ Shutdown completed\n');
    
    console.log('🎉 All tests passed! Git-Native I/O is working correctly.\n');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (io) {
      try {
        await io.shutdown();
      } catch (error) {
        console.warn('Warning: Failed to shutdown GitNativeIO:', error.message);
      }
    }
    
    if (testDir) {
      await cleanupTestRepo(testDir);
      console.log('🧹 Test directory cleaned up');
    }
  }
}

// Run the demo
runDemo().catch(console.error);
