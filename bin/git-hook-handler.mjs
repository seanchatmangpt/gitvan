#!/usr/bin/env node
/**
 * GitVan Git Hooks Integration - Dark Matter 80/20
 * 
 * This provides surgical precision for AI swarms by:
 * 1. Only processing what actually changed (not entire repo)
 * 2. Immediate event detection via Git hooks
 * 3. Change-only context for AI systems
 * 4. Zero-overhead repository scanning
 */

import { gitvanHookable } from '../src/core/hookable.mjs';
import { withGitVan } from '../src/core/context.mjs';

/**
 * Git Hook Handler - Surgical Precision for AI Swarms
 * 
 * Dark Matter 80/20 Principles:
 * - Only process what changed (not entire repo)
 * - Immediate event detection
 * - Change-only context
 * - Zero-overhead scanning
 */
class GitHookHandler {
  constructor() {
    this.hookable = gitvanHookable;
    this.context = null; // Will be set in init()
  }

  async init() {
    this.context = await this.extractGitContext();
  }

  /**
   * Extract Git context from environment - Dark Matter 80/20
   * Only extracts what's needed, not entire Git state
   */
  async extractGitContext() {
    const context = {
      cwd: process.cwd(),
      hookName: process.argv[2] || 'unknown',
      timestamp: Date.now()
    };

    // Extract Git-specific context based on hook type
    switch (context.hookName) {
      case 'pre-commit':
        // Pre-commit: Only staged changes
        context.stagedFiles = await this.getStagedFiles();
        break;
      
      case 'post-commit':
        // Post-commit: Only last commit
        context.lastCommit = await this.getLastCommit();
        break;
      
      case 'pre-push':
        // Pre-push: Only push changes
        context.remote = process.env.GIT_REMOTE || 'origin';
        context.branch = await this.getCurrentBranch();
        break;
      
      case 'post-merge':
        // Post-merge: Only merged changes
        context.mergeCommit = await this.getMergeCommit();
        break;
      
      case 'post-checkout':
        // Post-checkout: Only checkout changes
        context.prevHead = process.env.GIT_PREV_HEAD;
        context.newHead = process.env.GIT_NEW_HEAD;
        break;
    }

    return context;
  }

  /**
   * Get staged files - Surgical precision
   */
  async getStagedFiles() {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      return output.trim().split('\n').filter(f => f.trim());
    } catch (error) {
      console.warn('⚠️  Could not get staged files:', error.message);
      return [];
    }
  }

  /**
   * Get last commit - Surgical precision
   */
  async getLastCommit() {
    try {
      const { execSync } = await import('child_process');
      const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
      return { sha, message };
    } catch (error) {
      console.warn('⚠️  Could not get last commit:', error.message);
      return { sha: null, message: null };
    }
  }

  /**
   * Get current branch - Surgical precision
   */
  async getCurrentBranch() {
    try {
      const { execSync } = await import('child_process');
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.warn('⚠️  Could not get current branch:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get merge commit - Surgical precision
   */
  async getMergeCommit() {
    try {
      const { execSync } = await import('child_process');
      const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      return { sha };
    } catch (error) {
      console.warn('⚠️  Could not get merge commit:', error.message);
      return { sha: null };
    }
  }

  /**
   * Handle Git hook with surgical precision
   */
  async handleHook() {
    const { hookName, cwd } = this.context;
    
    console.log(`🔍 GitVan: Processing ${hookName} hook (surgical precision)`);
    console.log(`   📁 Working directory: ${cwd}`);
    
    try {
      // Process hook with surgical precision
      const result = await this.hookable.callHook(hookName, this.context);
      
      console.log(`   ✅ ${hookName} processed successfully`);
      console.log(`   📊 Processed ${result.processed || 0} changes`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error processing ${hookName}:`, error.message);
      
      // For pre-commit and pre-push, exit with error to prevent operation
      if (hookName === 'pre-commit' || hookName === 'pre-push') {
        process.exit(1);
      }
      
      throw error;
    }
  }
}

/**
 * Main execution - Dark Matter 80/20
 */
async function main() {
  const handler = new GitHookHandler();
  await handler.init();
  
  try {
    await handler.handleHook();
  } catch (error) {
    console.error('❌ GitVan Git Hook Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GitHookHandler };
