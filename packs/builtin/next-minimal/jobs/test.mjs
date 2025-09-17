export default {
  name: "test",
  description: "Run tests for Next.js application",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🧪 Running tests...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Next.js project root.');
      }

      // Check if test script exists
      const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
      if (!pkg.scripts?.test) {
        console.log('⚠️  No test script found in package.json');
        console.log('💡 Consider adding a test framework like Jest or Vitest');
        return {
          ok: true,
          warning: 'No test script configured'
        };
      }

      // Run tests
      execSync('npm test', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log('✅ Tests completed successfully!');

      return {
        ok: true,
        message: 'Tests completed successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};