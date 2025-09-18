// Next.js CMS Project Creation Job
export default {
  meta: {
    name: "create-cms-project",
    desc: "Creates a complete Next.js CMS project structure",
  },
  async run(ctx) {
    const { payload } = ctx;

    const projectName = payload?.project_name || "my-cms-site";
    const githubRepo = payload?.github_repo || projectName;
    const useTypeScript = payload?.use_typescript !== false;
    const useTailwind = payload?.use_tailwind !== false;

    console.log(`🚀 Creating Next.js CMS project: ${projectName}`);
    console.log(`📁 GitHub repo: ${githubRepo}`);
    console.log(`📝 TypeScript: ${useTypeScript ? "Yes" : "No"}`);
    console.log(`🎨 Tailwind CSS: ${useTailwind ? "Yes" : "No"}`);

    // Create the project structure
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      // Create directories
      const dirs = [
        "src/app",
        "src/components",
        "src/lib",
        "content/pages",
        "content/components",
        "public",
        ".github/workflows",
      ];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Create Next.js config
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/${githubRepo}' : '',
  images: {
    unoptimized: true,
  },
  experimental: {
    mdxRs: true,
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  trailingSlash: false,
  assetPrefix: process.env.NODE_ENV === 'production' ? '/${githubRepo}/' : '',
};

export default nextConfig;`;

      await fs.writeFile("next.config.mjs", nextConfig);

      // Create package.json
      const packageJson = {
        name: projectName,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
        },
        dependencies: {
          next: "^14.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
          "@next/mdx": "^14.0.0",
          "@mdx-js/loader": "^3.0.0",
          "@mdx-js/react": "^3.0.0",
          "gray-matter": "^4.0.3",
          remark: "^15.0.0",
          "remark-gfm": "^4.0.0",
          "rehype-highlight": "^7.0.0",
          "rehype-slug": "^6.0.0",
          "rehype-autolink-headings": "^7.0.0",
          clsx: "^2.0.0",
          "tailwind-merge": "^2.0.0",
        },
        devDependencies: {
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0",
          eslint: "^8.0.0",
          "eslint-config-next": "^14.0.0",
        },
      };

      if (useTailwind) {
        packageJson.dependencies.tailwindcss = "^3.3.0";
        packageJson.dependencies.autoprefixer = "^10.4.0";
        packageJson.dependencies.postcss = "^8.4.0";
      }

      if (useTypeScript) {
        packageJson.devDependencies.typescript = "^5.0.0";
      }

      await fs.writeFile("package.json", JSON.stringify(packageJson, null, 2));

      // Create basic layout
      const layout = `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'A static CMS built with Next.js and GitVan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}`;

      await fs.writeFile("src/app/layout.tsx", layout);

      // Create home page
      const homePage = `import { promises as fs } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'

export default async function HomePage() {
  try {
    const contentPath = join(process.cwd(), 'content/pages/index.md')
    const fileContent = await fs.readFile(contentPath, 'utf8')
    const { data: frontmatter, content } = matter(fileContent)
    
    return (
      <main className="container mx-auto px-4 py-8">
        <article className="prose prose-lg max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {frontmatter.title || 'Welcome'}
            </h1>
            {frontmatter.description && (
              <p className="text-xl text-gray-600">
                {frontmatter.description}
              </p>
            )}
          </header>
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: content }} />
        </article>
      </main>
    )
  } catch (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ${projectName}</h1>
        <p className="text-xl text-gray-600">A static CMS built with Next.js and GitVan</p>
      </main>
    )
  }
}`;

      await fs.writeFile("src/app/page.tsx", homePage);

      // Create globals.css
      const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: system-ui, sans-serif;
  }
  
  body {
    @apply bg-white text-gray-900;
  }
}

@layer components {
  .prose {
    @apply max-w-none;
  }
  
  .prose h1 {
    @apply text-4xl font-bold text-gray-900 mb-6;
  }
  
  .prose h2 {
    @apply text-3xl font-semibold text-gray-800 mb-4 mt-8;
  }
  
  .prose p {
    @apply text-gray-700 mb-4 leading-relaxed;
  }
}`;

      await fs.writeFile("src/app/globals.css", globalsCss);

      // Create sample content
      const indexContent = `---
title: "Welcome to ${projectName}"
description: "A static CMS built with Next.js and GitVan"
date: "${new Date().toISOString()}"
---

# Welcome to ${projectName}

This is a **static CMS** built with Next.js and GitVan that allows you to embed React components directly in your markdown content.

## Features

- 📝 **Markdown-first content management**
- ⚛️ **React components embedded in markdown**
- 🚀 **Static site generation for GitHub Pages**
- 🎨 **Tailwind CSS for styling**
- 🔧 **GitVan-powered automation**

## Getting Started

This CMS allows you to create rich content by combining markdown with React components.

### Basic Markdown

You can write regular markdown content like this paragraph, with **bold text**, *italic text*, and [links](https://example.com).

## Next Steps

1. **Create new pages** using GitVan jobs
2. **Add components** to the \`content/components/\` directory
3. **Customize styling** in the CSS files
4. **Deploy to GitHub Pages** using GitHub Actions

---

*Built with ❤️ using Next.js and GitVan*`;

      await fs.writeFile("content/pages/index.md", indexContent);

      // Create GitHub Actions workflow
      const workflow = `name: Deploy Next.js CMS to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Build Next.js app
      run: pnpm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./out`;

      await fs.writeFile(".github/workflows/deploy.yml", workflow);

      // Create .nojekyll file
      await fs.writeFile(
        "public/.nojekyll",
        "# This file tells GitHub Pages to not use Jekyll\n# Next.js generates static files that don't need Jekyll processing\n"
      );

      console.log(`✅ Created Next.js CMS project: ${projectName}`);
      console.log(`📁 Files created:`);
      console.log(`   - next.config.mjs`);
      console.log(`   - package.json`);
      console.log(`   - src/app/layout.tsx`);
      console.log(`   - src/app/page.tsx`);
      console.log(`   - src/app/globals.css`);
      console.log(`   - content/pages/index.md`);
      console.log(`   - .github/workflows/deploy.yml`);
      console.log(`   - public/.nojekyll`);

      return {
        status: "success",
        message: `Created Next.js CMS project: ${projectName}`,
        data: {
          projectName,
          githubRepo,
          useTypeScript,
          useTailwind,
          filesCreated: 8,
        },
      };
    } catch (error) {
      console.error("❌ Error creating project:", error.message);
      return {
        status: "error",
        message: `Failed to create project: ${error.message}`,
        error: error.message,
      };
    }
  },
};
