export default {
  name: "build",
  description: "Build Node.js application for production",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🔨 Building Node.js application...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Node.js project root.');
      }

      // Run type checking first if TypeScript is used
      if (existsSync('tsconfig.json')) {
        console.log('🔍 Running type check...');
        execSync('npm run type-check', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Run linting
      console.log('🧹 Running linter...');
      try {
        execSync('npm run lint', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch (error) {
        console.log('⚠️  Linting issues found, continuing...');
      }

      // Build application (TypeScript compilation)
      console.log('📦 Building application...');
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      console.log('✅ Build completed successfully!');

      return {
        ok: true,
        message: 'Application built successfully',
        artifacts: ['dist']
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};