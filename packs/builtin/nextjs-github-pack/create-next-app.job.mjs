export default {
  name: "create-next-app",
  description: "Creates a new Next.js project structure",
  
  async run(ctx) {
    // Try to get project name from various sources
    const projectName = process.env.PROJECT_NAME || 
                       process.argv.find(arg => arg.startsWith('--projectName='))?.split('=')[1] ||
                       'my-nextjs-app';
    
    console.log(`🚀 Creating Next.js project: ${projectName}`);
    
    // Import Node.js modules
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    
    const projectPath = join(process.cwd(), projectName);
    
    // Create main directories
    const directories = [
      "src/app",
      "src/components", 
      "src/lib",
      "src/styles",
      "public",
      "config"
    ];
    
    for (const dir of directories) {
      mkdirSync(join(projectPath, dir), { recursive: true });
      console.log(`   📁 Created directory: ${dir}`);
    }
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint"
      },
      dependencies: {
        next: "^14.0.0",
        react: "^18.0.0",
        "react-dom": "^18.0.0"
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        eslint: "^8.0.0",
        "eslint-config-next": "^14.0.0",
        typescript: "^5.0.0"
      }
    };
    
    writeFileSync(
      join(projectPath, "package.json"), 
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create README.md
    const readmeContent = `# ${projectName}

A Next.js project created with GitVan from GitHub pack.

## Getting Started

This project was scaffolded using GitVan's job-only architecture, pulled from GitHub using giget.

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- **Framework**: Next.js ^14.0.0
- **Language**: TypeScript
- **Styling**: CSS Modules + Tailwind CSS
- **Linting**: ESLint + Next.js config
- **Created**: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}
- **GitVan Version**: 2.0.0
- **Pack Source**: GitHub (via giget)

## Quick Start

Run the startup job to automatically install dependencies and start the dev server:

\`\`\`bash
gitvan run start-next-app
\`\`\`
`;
    
    writeFileSync(join(projectPath, "README.md"), readmeContent);
    
    // Create next.config.js
    const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // GitVan generated config from GitHub pack
  env: {
    GITVAN_VERSION: '2.0.0',
    PROJECT_NAME: '${projectName}',
    PACK_SOURCE: 'github'
  }
};

module.exports = nextConfig;`;
    
    writeFileSync(join(projectPath, "next.config.js"), nextConfigContent);
    
    // Create tsconfig.json
    const tsConfigContent = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`;
    
    writeFileSync(join(projectPath, "tsconfig.json"), tsConfigContent);
    
    // Create .gitignore
    const gitignoreContent = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# GitVan
.gitvan/
`;
    
    writeFileSync(join(projectPath, ".gitignore"), gitignoreContent);
    
    // Create basic page.tsx
    const pageContent = `export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Welcome to Your Next.js App!
      </h1>
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <h2 className="font-bold">🎉 Success!</h2>
          <p>This Next.js project was created using GitVan's pack system, pulled from GitHub using giget!</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">📦 Pack Source</h3>
            <p className="text-blue-600">GitHub repository via giget</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded">
            <h3 className="font-semibold text-purple-800">🔧 Architecture</h3>
            <p className="text-purple-600">Job-only architecture (4 files only)</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded">
            <h3 className="font-semibold text-orange-800">⚡ Features</h3>
            <ul className="text-orange-600 list-disc list-inside">
              <li>Next.js 14 with App Router</li>
              <li>TypeScript support</li>
              <li>Tailwind CSS ready</li>
              <li>ESLint configured</li>
              <li>GitVan integration</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Check the README.md for more information about this project.
          </p>
        </div>
      </div>
    </div>
  );
}`;
    
    writeFileSync(join(projectPath, "src/app/page.tsx"), pageContent);
    
    console.log(`✅ Next.js project structure created successfully`);
    
    return {
      status: 'success',
      message: `Created Next.js project structure for ${projectName}`,
      data: {
        projectName,
        projectPath,
        directories: directories.length,
        files: 6
      }
    };
  }
};
