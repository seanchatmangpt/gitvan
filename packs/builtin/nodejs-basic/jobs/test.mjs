export default {
  name: "test",
  description: "Run tests for Node.js application",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🧪 Running tests...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Node.js project root.');
      }

      // Check if test directory exists
      if (!existsSync('src') && !existsSync('test') && !existsSync('tests')) {
        console.log('⚠️  No test files found');
        console.log('💡 Create test files in src/, test/, or tests/ directory');
        return {
          ok: true,
          warning: 'No test files found'
        };
      }

      // Set test environment
      const testEnv = {
        ...process.env,
        NODE_ENV: 'test'
      };

      // Run tests
      execSync('npm test', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: testEnv
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