export default {
  name: "lint",
  description: "Lint Next.js application code",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🧹 Linting Next.js application...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Next.js project root.');
      }

      // Run ESLint
      execSync('npm run lint', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log('✅ Linting completed successfully!');

      return {
        ok: true,
        message: 'Code linting completed successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};