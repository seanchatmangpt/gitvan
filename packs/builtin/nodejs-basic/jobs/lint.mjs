export default {
  name: "lint",
  description: "Lint Node.js application code",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🧹 Linting Node.js application...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Node.js project root.');
      }

      // Check if ESLint config exists
      const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'];
      const hasEslintConfig = eslintConfigs.some(config => existsSync(config));

      if (!hasEslintConfig) {
        console.log('⚠️  No ESLint configuration found');
        console.log('💡 Consider adding an ESLint configuration file');
        return {
          ok: true,
          warning: 'No ESLint configuration found'
        };
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
      // Try to run lint:fix if available
      try {
        console.log('🔧 Attempting to fix linting issues...');
        execSync('npm run lint:fix', {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        console.log('✅ Linting issues fixed automatically!');
        return {
          ok: true,
          message: 'Linting issues fixed automatically'
        };
      } catch (fixError) {
        return {
          ok: false,
          error: error.message
        };
      }
    }
  }
};