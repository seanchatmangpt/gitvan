export default {
  name: "deploy",
  description: "Deploy VitePress documentation site",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🚀 Deploying VitePress documentation...');

      // Build first
      console.log('🔨 Building for production...');
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Check if build was successful
      if (!existsSync('docs/.vitepress/dist')) {
        throw new Error('Build failed - no output directory found');
      }

      console.log('✅ Build completed successfully!');
      console.log('📁 Ready to deploy: docs/.vitepress/dist');
      console.log('');
      console.log('🔗 Deployment options:');
      console.log('   • GitHub Pages: Push to gh-pages branch');
      console.log('   • Netlify: Drag and drop dist folder');
      console.log('   • Vercel: Connect your repository');
      console.log('   • Custom server: Copy dist folder contents');

      return {
        ok: true,
        message: 'Documentation ready for deployment',
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