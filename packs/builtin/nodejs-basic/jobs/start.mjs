export default {
  name: "start",
  description: "Start Node.js production server",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🚀 Starting Node.js production server...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Node.js project root.');
      }

      // Check if build exists for TypeScript projects
      if (existsSync('tsconfig.json') && !existsSync('dist')) {
        console.log('⚠️  No build found. Running build first...');
        execSync('npm run build', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Check if .env exists
      if (!existsSync('.env') && existsSync('.env.example')) {
        console.log('📝 Creating .env from .env.example...');
        const { copyFileSync } = await import('node:fs');
        copyFileSync('.env.example', '.env');
        console.log('⚠️  Please configure .env file before production deployment');
      }

      // Start production server
      execSync('npm start', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      return {
        ok: true,
        message: 'Production server started successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};