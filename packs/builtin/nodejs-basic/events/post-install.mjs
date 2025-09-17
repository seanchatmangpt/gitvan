export default {
  name: "post-install",
  description: "Post-installation setup for Node.js project",

  async run({ ctx }) {
    const { execSync } = await import('node:child_process');
    const { existsSync, copyFileSync, writeFileSync } = await import('node:fs');

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

      // Create .env from example if it doesn't exist
      if (!existsSync('.env') && existsSync('.env.example')) {
        console.log('📝 Creating .env from .env.example...');
        copyFileSync('.env.example', '.env');
        console.log('⚠️  Please configure .env file with your settings');
      }

      // Create basic ESLint config if none exists
      const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'];
      const hasEslintConfig = eslintConfigs.some(config => existsSync(config));

      if (!hasEslintConfig && existsSync('tsconfig.json')) {
        console.log('📝 Creating basic ESLint configuration for TypeScript...');
        const eslintConfig = {
          "env": {
            "node": true,
            "es2021": true
          },
          "extends": [
            "eslint:recommended",
            "@typescript-eslint/recommended"
          ],
          "parser": "@typescript-eslint/parser",
          "parserOptions": {
            "ecmaVersion": "latest",
            "sourceType": "module"
          },
          "plugins": [
            "@typescript-eslint"
          ],
          "rules": {
            "indent": ["error", 2],
            "linebreak-style": ["error", "unix"],
            "quotes": ["error", "single"],
            "semi": ["error", "always"]
          }
        };

        writeFileSync('.eslintrc.json', JSON.stringify(eslintConfig, null, 2));
      }

      // Run initial build for TypeScript projects
      if (existsSync('tsconfig.json')) {
        console.log('🔨 Running initial build...');
        try {
          execSync('npm run build', {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch (error) {
          console.log('⚠️  Build failed, you may need to fix TypeScript issues');
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