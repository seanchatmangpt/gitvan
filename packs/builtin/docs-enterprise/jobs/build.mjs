export default {
  name: "build",
  description: "Build VitePress documentation site",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🔨 Building VitePress documentation site...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a VitePress project root.');
      }

      // Check if docs directory exists
      if (!existsSync('docs')) {
        throw new Error('docs/ directory not found.');
      }

      // Clean previous build
      console.log('🧹 Cleaning previous build...');
      try {
        execSync('npm run clean', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch (error) {
        // Clean command might not exist, that's OK
        console.log('⚠️  No clean script found, continuing...');
      }

      // Build documentation
      console.log('📦 Building documentation...');
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Check if build was successful
      if (existsSync('docs/.vitepress/dist')) {
        console.log('✅ Documentation built successfully!');
        console.log('📁 Output: docs/.vitepress/dist');
      } else {
        throw new Error('Build completed but output directory not found');
      }

      return {
        ok: true,
        message: 'Documentation built successfully',
        artifacts: ['docs/.vitepress/dist']
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};