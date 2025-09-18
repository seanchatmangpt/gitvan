/**
 * Example Hello Job - Remote Pack Demo
 * 
 * This is a simple example job that demonstrates remote pack functionality
 */

import { defineJob } from '../../src/core/job-registry.mjs';

export default defineJob({
  meta: {
    name: 'example:hello',
    description: 'Simple hello world job for remote pack demonstration',
    version: '1.0.0',
  },
  hooks: ['post-commit', 'post-merge'],
  async run(context) {
    console.log('🌐 Hello from remote pack!');
    console.log(`   Pack: ${context.pack?.name || 'Unknown'}`);
    console.log(`   Version: ${context.pack?.version || 'Unknown'}`);
    console.log(`   Source: ${context.pack?.source || 'local'}`);
    
    if (context.pack?.remoteSource) {
      console.log(`   Remote Provider: ${context.pack.remoteSource.provider}`);
      console.log(`   Installed: ${context.pack.remoteSource.installedAt}`);
    }
    
    return {
      success: true,
      message: 'Remote pack job executed successfully',
      timestamp: new Date().toISOString(),
    };
  },
});
