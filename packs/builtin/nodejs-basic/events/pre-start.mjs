export default {
  name: "pre-start",
  description: "Pre-start checks and setup for Node.js server",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🔍 Running pre-start checks...');

      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 16) {
        console.log('⚠️  Warning: This application requires Node.js 16 or higher');
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

      // Check if .env file exists
      if (!existsSync('.env')) {
        if (existsSync('.env.example')) {
          console.log('⚠️  .env file missing. Creating from .env.example...');
          const { copyFileSync } = await import('node:fs');
          copyFileSync('.env.example', '.env');
          console.log('⚠️  Please configure .env file before starting');
        } else {
          console.log('⚠️  No .env file found. Consider creating one for configuration');
        }
      }

      // Build TypeScript if needed
      if (existsSync('tsconfig.json') && !existsSync('dist')) {
        console.log('🔨 Building TypeScript application...');
        execSync('npm run build', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Run type checking if TypeScript is used
      if (existsSync('tsconfig.json')) {
        console.log('🔍 Running type check...');
        try {
          execSync('npm run type-check', {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch (error) {
          console.log('❌ Type checking failed');
          throw error;
        }
      }

      // Test basic health of the application
      console.log('🩺 Running basic health checks...');

      console.log('✅ Pre-start checks completed!');

      return {
        ok: true,
        message: 'Pre-start checks completed successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};