export default {
  name: "start",
  description: "Start Next.js production server",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync } = await import('node:fs');

    try {
      console.log('🚀 Starting Next.js production server...');

      // Check if package.json exists
      if (!existsSync('package.json')) {
        throw new Error('package.json not found. Run this from a Next.js project root.');
      }

      // Check if build exists
      if (!existsSync('.next')) {
        console.log('⚠️  No build found. Running build first...');
        execSync('npm run build', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Start production server
      execSync('npm start', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      return {
        ok: true,
        message: 'Production server started successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};