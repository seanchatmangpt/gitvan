export default {
  name: "post-install",
  description: "Post-installation setup for Next.js project",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync, writeFileSync } = await import('node:fs');

    try {
      console.log('🔧 Running post-installation setup...');

      // Install dependencies
      if (existsSync('package.json')) {
        console.log('📦 Installing dependencies...');
        execSync('npm install', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }

      // Create next-env.d.ts if TypeScript is used
      if (existsSync('tsconfig.json') && !existsSync('next-env.d.ts')) {
        console.log('📝 Creating next-env.d.ts...');
        writeFileSync('next-env.d.ts', '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
      }

      // Generate Tailwind config if used
      if (existsSync('tailwind.config.js')) {
        console.log('🎨 Initializing Tailwind CSS...');
        try {
          execSync('npx tailwindcss init -p', {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch (error) {
          console.log('⚠️  Tailwind already configured');
        }
      }

      console.log('✅ Post-installation setup completed!');

      return {
        ok: true,
        message: 'Post-installation setup completed successfully'
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }
};