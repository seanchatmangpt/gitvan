export default {
  name: "dev",
  description: "Start VitePress development server",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('📚 Starting VitePress development server...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a VitePress project root.');
      }

      // Check if docs directory exists
      if (!existsSync('docs')) {
        throw new Error('docs/ directory not found. This appears to be a VitePress project.');
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