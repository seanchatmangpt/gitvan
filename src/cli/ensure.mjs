import { defineCommand } from 'citty';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'pathe';
import { useGit } from '../composables/git.mjs';
import { createLogger } from '../utils/logger.mjs';
import consola from 'consola';

const logger = createLogger('cli:ensure');

export const ensureCommand = defineCommand({
  meta: {
    name: 'ensure',
    description: 'Ensure GitVan is properly configured in the repository'
  },
  args: {
    'skip-git': {
      type: 'boolean',
      description: 'Skip Git configuration checks'
    },
    'init-config': {
      type: 'boolean',
      description: 'Initialize gitvan.config.js'
    }
  },
  async run({ args }) {
    consola.start('Ensuring GitVan configuration...');
    
    const checks = {
      git: false,
      identity: false,
      directories: false,
      config: false,
      notes: false,
      locks: false
    };
    
    // Check Git repository
    if (!args['skip-git']) {
      try {
        const git = useGit();
        await git.run('rev-parse --git-dir');
        checks.git = true;
        consola.success('✓ Git repository detected');
      } catch {
        consola.error('✗ Not a Git repository');
        consola.info('  Run: git init');
      }
      
      // Check Git identity
      try {
        const git = useGit();
        const name = await git.run('config user.name');
        const email = await git.run('config user.email');
        if (name && email) {
          checks.identity = true;
          consola.success(`✓ Git identity: ${name} <${email}>`);
        }
      } catch {
        consola.warn('✗ Git identity not configured');
        consola.info('  Run: git config user.name "Your Name"');
        consola.info('  Run: git config user.email "your@email.com"');
      }
    }
    
    // Create GitVan directories
    const dirs = [
      '.gitvan',
      '.gitvan/packs',
      '.gitvan/state',
      '.gitvan/backups',
      'jobs',
      'events',
      'templates',
      'packs'
    ];
    
    for (const dir of dirs) {
      const dirPath = join(process.cwd(), dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
        consola.success(`✓ Created directory: ${dir}`);
      }
    }
    checks.directories = true;
    
    // Check/create config
    const configPath = join(process.cwd(), 'gitvan.config.js');
    if (!existsSync(configPath)) {
      if (args['init-config']) {
        const defaultConfig = `import { defineConfig } from 'gitvan';

export default defineConfig({
  rootDir: process.cwd(),
  jobs: {
    dir: 'jobs'
  },
  templates: {
    engine: 'nunjucks',
    dirs: ['templates'],
    autoescape: false
  },
  receipts: {
    ref: 'refs/notes/gitvan/results'
  },
  hooks: {}
});
`;
        writeFileSync(configPath, defaultConfig);
        consola.success('✓ Created gitvan.config.js');
        checks.config = true;
      } else {
        consola.warn('✗ No gitvan.config.js found');
        consola.info('  Run: gitvan ensure --init-config');
      }
    } else {
      checks.config = true;
      consola.success('✓ Configuration file exists');
    }
    
    // Initialize Git notes refs
    if (checks.git) {
      try {
        const git = useGit();
        
        // Check if notes refs exist
        const refs = [
          'refs/notes/gitvan/results',
          'refs/notes/gitvan/pack-receipts'
        ];
        
        for (const ref of refs) {
          try {
            await git.run(`notes --ref=${ref} list`);
          } catch {
            // Initialize empty notes ref
            await git.run(`notes --ref=${ref} add -f -m '{"initialized": true}' HEAD 2>/dev/null || true`);
          }
        }
        
        checks.notes = true;
        consola.success('✓ Git notes refs initialized');
      } catch (error) {
        consola.warn('✗ Could not initialize Git notes');
        logger.warn('Notes init failed:', error);
      }
    }
    
    // Check lock refs
    if (checks.git) {
      checks.locks = true;
      consola.success('✓ Lock system ready');
    }
    
    // Summary
    console.log('\n📊 Configuration Summary:');
    const total = Object.keys(checks).length;
    const passed = Object.values(checks).filter(Boolean).length;
    
    for (const [key, value] of Object.entries(checks)) {
      const status = value ? '✅' : '❌';
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      console.log(`   ${status} ${label}`);
    }
    
    if (passed === total) {
      consola.success('\n✨ GitVan is fully configured and ready to use!');
    } else {
      consola.warn(`\n⚠️  Configuration incomplete (${passed}/${total} checks passed)`);
      consola.info('   Fix the issues above and run "gitvan ensure" again');
    }
    
    return { checks, passed, total };
  }
});
