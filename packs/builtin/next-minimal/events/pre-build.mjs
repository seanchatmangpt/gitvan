export default {
  name: "pre-build",
  description: "Pre-build checks and setup for Next.js project",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🔍 Running pre-build checks...');

      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 18) {
        console.log('⚠️  Warning: Next.js 14 requires Node.js 18 or higher');
        console.log(`   Current version: ${nodeVersion}`);
      }

      // Check if dependencies are installed
      if (!existsSync('node_modules')) {
        console.log('📦 Installing dependencies...');
        execSync('npm install', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Run type checking if TypeScript is used
      if (existsSync('tsconfig.json')) {
        console.log('🔍 Running type check...');
        try {
          execSync('npx tsc --noEmit', {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch (error) {
          console.log('❌ Type checking failed');
          throw error;
        }
      }

      // Run linting
      console.log('🧹 Running linter...');
      try {
        execSync('npm run lint', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch (error) {
        console.log('⚠️  Linting issues found');
        // Don't fail the build for linting issues
      }

      console.log('✅ Pre-build checks completed!');

      return {
        ok: true,
        message: 'Pre-build checks completed successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};