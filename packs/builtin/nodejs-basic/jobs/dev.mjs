export default {
  name: "dev",
  description: "Start Node.js development server with hot reload",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🚀 Starting Node.js development server...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Node.js project root.');
      }

      // Check if .env exists, create from example if not
      if (!existsSync('.env') && existsSync('.env.example')) {
        console.log('📝 Creating .env from .env.example...');
        const { copyFileSync } = await import('node:fs');
        copyFileSync('.env.example', '.env');
      }

      // Start development server
      execSync('npm run dev', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      return {
        ok: true,
        message: 'Development server started successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};