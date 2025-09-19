#!/bin/bash

# GitVan Next.js CMS Development Environment Setup
# This script sets up a complete development environment using Docker Compose

echo "🚀 GitVan Next.js CMS Development Environment Setup"
echo "=================================================="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create project directory if it doesn't exist
PROJECT_NAME=${1:-"my-cms-project"}
echo "📁 Creating project: $PROJECT_NAME"

if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  Directory $PROJECT_NAME already exists. Using existing directory."
else
    mkdir -p "$PROJECT_NAME"
fi

cd "$PROJECT_NAME"

# Copy Docker Compose files
echo "📦 Setting up Docker Compose configuration..."
cp ../packs/nextjs-cms-pack/docker-compose.yml .
cp ../packs/nextjs-cms-pack/Dockerfile.dev .

# Create a basic package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "📄 Creating package.json..."
    cat > package.json << 'EOF'
{
  "name": "nextjs-cms-dev",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@next/mdx": "^14.0.0",
    "@mdx-js/loader": "^3.0.0",
    "@mdx-js/react": "^3.0.0",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-autolink-headings": "^7.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
fi

# Create basic Next.js configuration
if [ ! -f "next.config.mjs" ]; then
    echo "⚙️  Creating Next.js configuration..."
    cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '',
  images: {
    unoptimized: true,
  },
  experimental: {
    mdxRs: true,
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  trailingSlash: false,
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '',
};

export default nextConfig;
EOF
fi

# Create basic app structure
echo "🏗️  Creating app structure..."
mkdir -p src/app src/components src/lib content/pages content/components public

# Create basic layout
if [ ! -f "src/app/layout.tsx" ]; then
    cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js CMS',
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
}
EOF
fi

# Create basic page
if [ ! -f "src/app/page.tsx" ]; then
    cat > src/app/page.tsx << 'EOF'
import { promises as fs } from 'fs'
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
              {frontmatter.title || 'Welcome to Next.js CMS'}
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Next.js CMS</h1>
        <p className="text-xl text-gray-600">A static CMS built with Next.js and GitVan</p>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
          <p>Create a file at <code>content/pages/index.md</code> to get started!</p>
        </div>
      </main>
    )
  }
}
EOF
fi

# Create basic CSS
if [ ! -f "src/app/globals.css" ]; then
    cat > src/app/globals.css << 'EOF'
@tailwind base;
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
}
EOF
fi

# Create sample content
if [ ! -f "content/pages/index.md" ]; then
    cat > content/pages/index.md << 'EOF'
---
title: "Welcome to Next.js CMS"
description: "A static CMS built with Next.js and GitVan"
date: "2025-09-18"
---

# Welcome to Next.js CMS

This is a **static CMS** built with Next.js and GitVan that allows you to embed React components directly in your markdown content.

## Features

- 📝 **Markdown-first content management**
- ⚛️ **React components embedded in markdown**
- 🚀 **Static site generation for GitHub Pages**
- 🎨 **Tailwind CSS for styling**
- 🔧 **GitVan-powered automation**
- 🐳 **Docker development environment**

## Getting Started

This CMS allows you to create rich content by combining markdown with React components.

### Basic Markdown

You can write regular markdown content like this paragraph, with **bold text**, *italic text*, and [links](https://example.com).

## Development

This development environment includes:

- **Hot reloading** for instant updates
- **Docker containerization** for consistent environments
- **Volume mounting** for live editing
- **Port forwarding** for easy access

## Next Steps

1. **Edit this file** to customize your content
2. **Add components** to the `content/components/` directory
3. **Create new pages** in `content/pages/`
4. **Customize styling** in the CSS files
5. **Deploy to GitHub Pages** when ready

---

*Built with ❤️ using Next.js and GitVan*
EOF
fi

# Create Tailwind config
if [ ! -f "tailwind.config.js" ]; then
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
}
EOF
fi

# Create PostCSS config
if [ ! -f "postcss.config.js" ]; then
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
fi

# Create TypeScript config
if [ ! -f "tsconfig.json" ]; then
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
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
}
EOF
fi

# Create .gitignore
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/

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

# Docker
.dockerignore
EOF
fi

# Create .dockerignore
if [ ! -f ".dockerignore" ]; then
    cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.next
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
EOF
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   docker-compose up"
echo ""
echo "🌐 Your site will be available at:"
echo "   http://localhost:3000"
echo ""
echo "📁 Project structure:"
echo "   - src/app/          # Next.js App Router"
echo "   - content/pages/     # Markdown content"
echo "   - content/components/ # React components"
echo "   - public/           # Static assets"
echo ""
echo "🔧 Development commands:"
echo "   docker-compose up                    # Start development server"
echo "   docker-compose up -d                 # Start in background"
echo "   docker-compose down                  # Stop server"
echo "   docker-compose logs -f               # View logs"
echo "   docker-compose exec nextjs-cms bash  # Access container shell"
echo ""
echo "📦 Optional services:"
echo "   docker-compose --profile database up  # Include PostgreSQL"
echo "   docker-compose --profile cache up     # Include Redis"
echo ""
echo "🎯 Ready to develop! Run 'docker-compose up' to start."

