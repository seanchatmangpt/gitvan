export default {
  name: "dev",
  description: "Start Next.js development server",

  async run({ ctx }) {
    const { useGit } = await import('../../../src/composables/git.mjs');
    const { execSync } = await import('node:child_process');

    try {
      console.log('🚀 Starting Next.js development server...');

      // Check if package.json exists
      const { existsSync } = await import('node:fs');
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Next.js project root.');
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