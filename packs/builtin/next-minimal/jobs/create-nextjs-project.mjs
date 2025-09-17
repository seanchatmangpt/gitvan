export default {
  meta: {
    desc: "Create a new Next.js project with TypeScript and modern setup",
    tags: ["nextjs", "scaffold", "project-creation"],
    author: "GitVan",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    try {
      console.log("🚀 Creating Next.js project...");

      const projectName = payload.project_name || "my-nextjs-app";
      const useTypeScript = payload.use_typescript !== false;
      const port = payload.port || "3000";

      console.log(`📦 Project name: ${projectName}`);
      console.log(`🔧 TypeScript: ${useTypeScript ? 'Yes' : 'No'}`);
      console.log(`🌐 Port: ${port}`);

      // Create package.json
      const packageJson = {
        name: projectName,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: `next dev --port ${port}`,
          build: "next build",
          start: "next start",
          lint: "next lint"
        },
        dependencies: {
          next: "14.0.0",
          react: "^18.0.0",
          react-dom: "^18.0.0"
        },
        devDependencies: {
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0",
          "eslint": "^8.0.0",
          "eslint-config-next": "14.0.0",
          ...(useTypeScript && { "typescript": "^5.0.0" })
        }
      };

      // Write package.json
      const fs = await import('node:fs/promises');
      const path = await import('pathe');
      
      await fs.writeFile(
        path.join(process.cwd(), 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      console.log("✅ Created package.json");

      // Create app directory structure
      const appDir = path.join(process.cwd(), 'app');
      await fs.mkdir(appDir, { recursive: true });

      // Create main page
      const pageContent = `import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Get started by editing&nbsp;
          <code className="font-mono font-bold">app/page.${useTypeScript ? 'tsx' : 'jsx'}</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{' '}
            <span className="font-semibold">GitVan</span>
          </a>
        </div>
      </div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">
        <h1 className="text-6xl font-bold">
          Welcome to ${projectName}!
        </h1>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <a
          href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Docs{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Find in-depth information about Next.js features and API.
          </p>
        </a>

        <a
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Learn{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Learn about Next.js in an interactive course with&nbsp;quizzes!
          </p>
        </a>

        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Templates{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Explore starter templates for Next.js.
          </p>
        </a>

        <a
          href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Deploy{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50 text-balance">
            Instantly deploy your Next.js site to a shareable URL with Vercel.
          </p>
        </a>
      </div>
    </main>
  );
}`;

      await fs.writeFile(
        path.join(appDir, `page.${useTypeScript ? 'tsx' : 'jsx'}`),
        pageContent
      );
      console.log(`✅ Created app/page.${useTypeScript ? 'tsx' : 'jsx'}`);

      // Create layout
      const layoutContent = `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Generated by GitVan Next.js pack',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`;

      await fs.writeFile(
        path.join(appDir, `layout.${useTypeScript ? 'tsx' : 'jsx'}`),
        layoutContent
      );
      console.log(`✅ Created app/layout.${useTypeScript ? 'tsx' : 'jsx'}`);

      // Create globals.css
      const cssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`;

      await fs.writeFile(
        path.join(appDir, 'globals.css'),
        cssContent
      );
      console.log("✅ Created app/globals.css");

      // Create next.config.js
      const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`;

      await fs.writeFile(
        path.join(process.cwd(), 'next.config.js'),
        nextConfigContent
      );
      console.log("✅ Created next.config.js");

      // Create tailwind.config.js
      const tailwindConfigContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}`;

      await fs.writeFile(
        path.join(process.cwd(), 'tailwind.config.js'),
        tailwindConfigContent
      );
      console.log("✅ Created tailwind.config.js");

      // Create postcss.config.js
      const postcssConfigContent = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

      await fs.writeFile(
        path.join(process.cwd(), 'postcss.config.js'),
        postcssConfigContent
      );
      console.log("✅ Created postcss.config.js");

      // Add Tailwind CSS to dependencies
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        tailwindcss: "^3.3.0",
        autoprefixer: "^10.4.0",
        postcss: "^8.4.0"
      };

      // Update package.json with Tailwind
      await fs.writeFile(
        path.join(process.cwd(), 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      console.log("🎉 Next.js project created successfully!");
      console.log("");
      console.log("Next steps:");
      console.log("1. Run: npm install");
      console.log("2. Run: npm run dev");
      console.log(`3. Open: http://localhost:${port}`);

      return {
        ok: true,
        artifacts: [
          'package.json',
          'app/page.tsx',
          'app/layout.tsx', 
          'app/globals.css',
          'next.config.js',
          'tailwind.config.js',
          'postcss.config.js'
        ],
        summary: `Created Next.js project "${projectName}" with TypeScript and Tailwind CSS`
      };

    } catch (error) {
      console.error('❌ Failed to create Next.js project:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
}`;
