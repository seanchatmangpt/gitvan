export default {
  name: "preview",
  description: "Preview built VitePress documentation site",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('👀 Starting VitePress preview server...');

      // Check if build exists
      if (!existsSync('docs/.vitepress/dist')) {
        console.log('⚠️  No build found. Building first...');
        execSync('npm run build', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Start preview server
      execSync('npm run preview', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      return {
        ok: true,
        message: 'Preview server started successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};