export default {
  meta: {
    desc: "Create React markdown components server with SSR and custom components",
    tags: ["react", "markdown", "ssr", "components"],
    author: "GitVan",
    version: "1.0.0",
  },
  async run({ ctx, payload, meta }) {
    try {
      console.log("🚀 Creating React markdown components server...");

      const projectName = payload.project_name || "markdown-server";
      const useTypeScript = payload.use_typescript !== false;
      const includeSSR = payload.include_ssr !== false;
      const port = payload.port || "3000";

      console.log("📦 Project name: " + projectName);
      console.log("🔧 TypeScript: " + (useTypeScript ? "Yes" : "No"));
      console.log("🌐 SSR: " + (includeSSR ? "Yes" : "No"));
      console.log("🔌 Port: " + port);

      // Create package.json
      const packageJson = {
        name: projectName,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev --port " + port,
          build: "next build",
          start: "next start",
          lint: "next lint",
          "markdown:build": "node scripts/build-markdown.js",
          "markdown:watch": "node scripts/watch-markdown.js",
        },
        dependencies: {
          next: "14.0.0",
          react: "18.0.0",
          "react-dom": "18.0.0",
          "react-markdown": "9.0.1",
          "remark-gfm": "4.0.0",
          "remark-prism": "1.3.0",
          "rehype-highlight": "7.0.0",
          "rehype-raw": "7.0.0",
          "gray-matter": "4.0.3",
          "glob": "10.3.10",
          "chokidar": "3.5.3",
        },
        devDependencies: {
          "@types/node": "20.0.0",
          "@types/react": "18.0.0",
          "@types/react-dom": "18.0.0",
          "@types/glob": "8.1.0",
          eslint: "8.0.0",
          "eslint-config-next": "14.0.0",
          tailwindcss: "3.3.0",
          autoprefixer: "10.4.0",
          postcss: "8.4.0",
        },
      };

      if (useTypeScript) {
        packageJson.devDependencies.typescript = "5.0.0";
      }

      // Write package.json
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      await fs.writeFile(
        path.join(process.cwd(), "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      console.log("✅ Created package.json");

      // Create app directory structure
      const appDir = path.join(process.cwd(), "app");
      await fs.mkdir(appDir, { recursive: true });

      // Create components directory
      const componentsDir = path.join(process.cwd(), "components");
      await fs.mkdir(componentsDir, { recursive: true });

      // Create lib directory
      const libDir = path.join(process.cwd(), "lib");
      await fs.mkdir(libDir, { recursive: true });

      // Create content directory
      const contentDir = path.join(process.cwd(), "content");
      await fs.mkdir(contentDir, { recursive: true });

      // Create scripts directory
      const scriptsDir = path.join(process.cwd(), "scripts");
      await fs.mkdir(scriptsDir, { recursive: true });

      const pageExtension = useTypeScript ? "tsx" : "jsx";

      // Create main page
      const pageContent =
        "import React from 'react';\n" +
        "import MarkdownRenderer from '../components/MarkdownRenderer';\n" +
        "import { getMarkdownFiles } from '../lib/markdown';\n\n" +
        "export default function Home() {\n" +
        "  const files = getMarkdownFiles();\n\n" +
        "  return (\n" +
        '    <main className="container mx-auto px-4 py-8">\n' +
        '      <div className="max-w-4xl mx-auto">\n' +
        '        <h1 className="text-4xl font-bold mb-8 text-center">\n' +
        "          " +
        projectName +
        "\n" +
        "        </h1>\n" +
        '        <div className="grid gap-6">\n' +
        "          {files.map((file) => (\n" +
        '            <div key={file.slug} className="border rounded-lg p-6 shadow-sm">\n' +
        '              <h2 className="text-2xl font-semibold mb-2">{file.title}</h2>\n' +
        '              <p className="text-gray-600 mb-4">{file.excerpt}</p>\n' +
        '              <MarkdownRenderer content={file.content} />\n' +
        "            </div>\n" +
        "          ))}\n" +
        "        </div>\n" +
        "      </div>\n" +
        "    </main>\n" +
        "  );\n" +
        "}";

      await fs.writeFile(
        path.join(appDir, "page." + pageExtension),
        pageContent
      );
      console.log("✅ Created app/page." + pageExtension);

      // Create layout
      const layoutContent =
        "import type { Metadata } from 'next'\n" +
        "import { Inter } from 'next/font/google'\n" +
        "import './globals.css'\n\n" +
        "const inter = Inter({ subsets: ['latin'] })\n\n" +
        "export const metadata: Metadata = {\n" +
        "  title: '" +
        projectName +
        "',\n" +
        "  description: 'React markdown components server with SSR',\n" +
        "}\n\n" +
        "export default function RootLayout({\n" +
        "  children,\n" +
        "}: {\n" +
        "  children: React.ReactNode\n" +
        "}) {\n" +
        "  return (\n" +
        '    <html lang="en">\n' +
        "      <body className={inter.className}>{children}</body>\n" +
        "    </html>\n" +
        "  )\n" +
        "}";

      await fs.writeFile(
        path.join(appDir, "layout." + pageExtension),
        layoutContent
      );
      console.log("✅ Created app/layout." + pageExtension);

      // Create MarkdownRenderer component
      const markdownRendererContent =
        "import React from 'react';\n" +
        "import ReactMarkdown from 'react-markdown';\n" +
        "import remarkGfm from 'remark-gfm';\n" +
        "import remarkPrism from 'remark-prism';\n" +
        "import rehypeHighlight from 'rehype-highlight';\n" +
        "import rehypeRaw from 'rehype-raw';\n" +
        "import { CustomComponents } from './CustomComponents';\n\n" +
        "interface MarkdownRendererProps {\n" +
        "  content: string;\n" +
        "  className?: string;\n" +
        "}\n\n" +
        "export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {\n" +
        "  return (\n" +
        '    <div className={`prose prose-lg max-w-none ${className}`}>\n' +
        "      <ReactMarkdown\n" +
        "        remarkPlugins={[remarkGfm, remarkPrism]}\n" +
        "        rehypePlugins={[rehypeHighlight, rehypeRaw]}\n" +
        "        components={CustomComponents}\n" +
        "      >\n" +
        "        {content}\n" +
        "      </ReactMarkdown>\n" +
        "    </div>\n" +
        "  );\n" +
        "}";

      await fs.writeFile(
        path.join(componentsDir, "MarkdownRenderer." + pageExtension),
        markdownRendererContent
      );
      console.log("✅ Created components/MarkdownRenderer." + pageExtension);

      // Create CustomComponents
      const customComponentsContent =
        "import React from 'react';\n" +
        "import { Alert } from './Alert';\n" +
        "import { CodeBlock } from './CodeBlock';\n" +
        "import { Callout } from './Callout';\n" +
        "import { Tabs, Tab } from './Tabs';\n\n" +
        "export const CustomComponents = {\n" +
        "  // Custom heading with anchor links\n" +
        "  h1: ({ children, ...props }) => (\n" +
        '    <h1 className="text-3xl font-bold mb-4 mt-8 scroll-mt-20" {...props}>\n' +
        "      {children}\n" +
        "    </h1>\n" +
        "  ),\n" +
        "  h2: ({ children, ...props }) => (\n" +
        '    <h2 className="text-2xl font-semibold mb-3 mt-6 scroll-mt-20" {...props}>\n' +
        "      {children}\n" +
        "    </h2>\n" +
        "  ),\n" +
        "  h3: ({ children, ...props }) => (\n" +
        '    <h3 className="text-xl font-medium mb-2 mt-4 scroll-mt-20" {...props}>\n' +
        "      {children}\n" +
        "    </h3>\n" +
        "  ),\n\n" +
        "  // Custom code blocks\n" +
        "  code: ({ node, inline, className, children, ...props }) => {\n" +
        "    const match = /language-(\\w+)/.exec(className || '');\n" +
        "    const language = match ? match[1] : '';\n\n" +
        "    if (!inline && language) {\n" +
        "      return (\n" +
        "        <CodeBlock language={language} {...props}>\n" +
        "          {children}\n" +
        "        </CodeBlock>\n" +
        "      );\n" +
        "    }\n\n" +
        "    return (\n" +
        '      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>\n' +
        "        {children}\n" +
        "      </code>\n" +
        "    );\n" +
        "  },\n\n" +
        "  // Custom blockquotes\n" +
        "  blockquote: ({ children, ...props }) => (\n" +
        '    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 rounded-r" {...props}>\n' +
        "      {children}\n" +
        "    </blockquote>\n" +
        "  ),\n\n" +
        "  // Custom tables\n" +
        "  table: ({ children, ...props }) => (\n" +
        '    <div className="overflow-x-auto my-4">\n' +
        '      <table className="min-w-full border-collapse border border-gray-300" {...props}>\n' +
        "        {children}\n" +
        "      </table>\n" +
        "    </div>\n" +
        "  ),\n" +
        "  th: ({ children, ...props }) => (\n" +
        '    <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left" {...props}>\n' +
        "      {children}\n" +
        "    </th>\n" +
        "  ),\n" +
        "  td: ({ children, ...props }) => (\n" +
        '    <td className="border border-gray-300 px-4 py-2" {...props}>\n' +
        "      {children}\n" +
        "    </td>\n" +
        "  ),\n\n" +
        "  // Custom links\n" +
        "  a: ({ href, children, ...props }) => (\n" +
        '    <a href={href} className="text-blue-600 hover:text-blue-800 underline" {...props}>\n' +
        "      {children}\n" +
        "    </a>\n" +
        "  ),\n\n" +
        "  // Custom images\n" +
        "  img: ({ src, alt, ...props }) => (\n" +
        '    <img src={src} alt={alt} className="max-w-full h-auto rounded-lg shadow-sm my-4" {...props} />\n' +
        "  ),\n" +
        "};";

      await fs.writeFile(
        path.join(componentsDir, "CustomComponents." + pageExtension),
        customComponentsContent
      );
      console.log("✅ Created components/CustomComponents." + pageExtension);

      // Create Alert component
      const alertContent =
        "import React from 'react';\n\n" +
        "interface AlertProps {\n" +
        "  type?: 'info' | 'warning' | 'error' | 'success';\n" +
        "  children: React.ReactNode;\n" +
        "}\n\n" +
        "export function Alert({ type = 'info', children }: AlertProps) {\n" +
        "  const styles = {\n" +
        "    info: 'bg-blue-50 border-blue-200 text-blue-800',\n" +
        "    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',\n" +
        "    error: 'bg-red-50 border-red-200 text-red-800',\n" +
        "    success: 'bg-green-50 border-green-200 text-green-800',\n" +
        "  };\n\n" +
        "  return (\n" +
        '    <div className={`border-l-4 p-4 my-4 rounded ${styles[type]}`}>\n' +
        "      {children}\n" +
        "    </div>\n" +
        "  );\n" +
        "}";

      await fs.writeFile(
        path.join(componentsDir, "Alert." + pageExtension),
        alertContent
      );
      console.log("✅ Created components/Alert." + pageExtension);

      // Create CodeBlock component
      const codeBlockContent =
        "import React from 'react';\n\n" +
        "interface CodeBlockProps {\n" +
        "  language: string;\n" +
        "  children: React.ReactNode;\n" +
        "}\n\n" +
        "export function CodeBlock({ language, children }: CodeBlockProps) {\n" +
        "  return (\n" +
        '    <div className="my-4">\n' +
        '      <div className="bg-gray-800 text-gray-100 px-4 py-2 text-sm font-mono rounded-t">\n' +
        "        {language}\n" +
        "      </div>\n" +
        '      <pre className="bg-gray-900 text-gray-100 p-4 rounded-b overflow-x-auto">\n' +
        '        <code className={`language-${language}`}>{children}</code>\n' +
        "      </pre>\n" +
        "    </div>\n" +
        "  );\n" +
        "}";

      await fs.writeFile(
        path.join(componentsDir, "CodeBlock." + pageExtension),
        codeBlockContent
      );
      console.log("✅ Created components/CodeBlock." + pageExtension);

      // Create markdown utility
      const markdownUtilContent =
        "import fs from 'fs';\n" +
        "import path from 'path';\n" +
        "import matter from 'gray-matter';\n" +
        "import { glob } from 'glob';\n\n" +
        "export interface MarkdownFile {\n" +
        "  slug: string;\n" +
        "  title: string;\n" +
        "  excerpt: string;\n" +
        "  content: string;\n" +
        "  frontMatter: Record<string, any>;\n" +
        "  date: string;\n" +
        "}\n\n" +
        "export function getMarkdownFiles(): MarkdownFile[] {\n" +
        "  const contentDir = path.join(process.cwd(), 'content');\n" +
        "  \n" +
        "  if (!fs.existsSync(contentDir)) {\n" +
        "    return [];\n" +
        "  }\n\n" +
        "  const files = glob.sync('**/*.md', { cwd: contentDir });\n" +
        "  \n" +
        "  return files.map((file) => {\n" +
        "    const filePath = path.join(contentDir, file);\n" +
        "    const fileContent = fs.readFileSync(filePath, 'utf8');\n" +
        "    const { data, content } = matter(fileContent);\n" +
        "    \n" +
        "    return {\n" +
        "      slug: file.replace(/\\.md$/, ''),\n" +
        "      title: data.title || path.basename(file, '.md'),\n" +
        "      excerpt: data.excerpt || content.substring(0, 150) + '...',\n" +
        "      content,\n" +
        "      frontMatter: data,\n" +
        "      date: data.date || new Date().toISOString(),\n" +
        "    };\n" +
        "  });\n" +
        "}\n\n" +
        "export function getMarkdownFile(slug: string): MarkdownFile | null {\n" +
        "  const files = getMarkdownFiles();\n" +
        "  return files.find((file) => file.slug === slug) || null;\n" +
        "}";

      await fs.writeFile(
        path.join(libDir, "markdown." + (useTypeScript ? "ts" : "js")),
        markdownUtilContent
      );
      console.log("✅ Created lib/markdown." + (useTypeScript ? "ts" : "js"));

      // Create sample markdown content
      const sampleContent =
        "# Welcome to " +
        projectName +
        "\n\n" +
        "This is a sample markdown file demonstrating the React markdown components server.\n\n" +
        "## Features\n\n" +
        "- **Server-side rendering** with Next.js\n" +
        "- **Custom React components** for markdown elements\n" +
        "- **Syntax highlighting** for code blocks\n" +
        "- **GitHub Flavored Markdown** support\n" +
        "- **TypeScript support** (optional)\n\n" +
        "## Code Example\n\n" +
        "```javascript\n" +
        "import React from 'react';\n" +
        "import MarkdownRenderer from './components/MarkdownRenderer';\n\n" +
        "function App() {\n" +
        "  const markdown = `# Hello World\\n\\nThis is **markdown**!`;\n" +
        "  return <MarkdownRenderer content={markdown} />;\n" +
        "}\n" +
        "```\n\n" +
        "## Table Example\n\n" +
        "| Feature | Status | Description |\n" +
        "|---------|--------|-------------|\n" +
        "| SSR | ✅ | Server-side rendering |\n" +
        "| Components | ✅ | Custom React components |\n" +
        "| Syntax Highlighting | ✅ | Code block highlighting |\n" +
        "| GFM | ✅ | GitHub Flavored Markdown |\n\n" +
        "> **Note**: This is a blockquote example with custom styling.\n\n" +
        "## Getting Started\n\n" +
        "1. Install dependencies: `npm install`\n" +
        "2. Start development server: `npm run dev`\n" +
        "3. Add markdown files to the `content/` directory\n" +
        "4. View your rendered content at `http://localhost:" +
        port +
        "`\n";

      await fs.writeFile(
        path.join(contentDir, "welcome.md"),
        sampleContent
      );
      console.log("✅ Created content/welcome.md");

      // Create globals.css
      const cssContent =
        "@tailwind base;\n" +
        "@tailwind components;\n" +
        "@tailwind utilities;\n\n" +
        "/* Custom prose styles */\n" +
        ".prose {\n" +
        "  @apply text-gray-800;\n" +
        "}\n\n" +
        ".prose h1,\n" +
        ".prose h2,\n" +
        ".prose h3,\n" +
        ".prose h4,\n" +
        ".prose h5,\n" +
        ".prose h6 {\n" +
        "  @apply text-gray-900 font-semibold;\n" +
        "}\n\n" +
        ".prose a {\n" +
        "  @apply text-blue-600 hover:text-blue-800;\n" +
        "}\n\n" +
        ".prose code {\n" +
        "  @apply bg-gray-100 px-1 py-0.5 rounded text-sm;\n" +
        "}\n\n" +
        ".prose pre {\n" +
        "  @apply bg-gray-900 text-gray-100 rounded-lg overflow-x-auto;\n" +
        "}\n\n" +
        ".prose blockquote {\n" +
        "  @apply border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r;\n" +
        "}\n\n" +
        ".prose table {\n" +
        "  @apply border-collapse border border-gray-300;\n" +
        "}\n\n" +
        ".prose th,\n" +
        ".prose td {\n" +
        "  @apply border border-gray-300 px-4 py-2;\n" +
        "}\n\n" +
        ".prose th {\n" +
        "  @apply bg-gray-100 font-semibold;\n" +
        "}";

      await fs.writeFile(path.join(appDir, "globals.css"), cssContent);
      console.log("✅ Created app/globals.css");

      // Create next.config.js
      const nextConfigContent =
        "/** @type {import('next').NextConfig} */\n" +
        "const nextConfig = {\n" +
        "  experimental: {\n" +
        "    appDir: true,\n" +
        "  },\n" +
        "};\n\n" +
        "module.exports = nextConfig;";

      await fs.writeFile(
        path.join(process.cwd(), "next.config.js"),
        nextConfigContent
      );
      console.log("✅ Created next.config.js");

      // Create tailwind.config.js
      const tailwindConfigContent =
        "/** @type {import('tailwindcss').Config} */\n" +
        "module.exports = {\n" +
        "  content: [\n" +
        "    './pages/**/*.{js,ts,jsx,tsx,mdx}',\n" +
        "    './components/**/*.{js,ts,jsx,tsx,mdx}',\n" +
        "    './app/**/*.{js,ts,jsx,tsx,mdx}',\n" +
        "  ],\n" +
        "  theme: {\n" +
        "    extend: {\n" +
        "      typography: {\n" +
        "        DEFAULT: {\n" +
        "          css: {\n" +
        "            maxWidth: 'none',\n" +
        "          },\n" +
        "        },\n" +
        "      },\n" +
        "    },\n" +
        "  },\n" +
        "  plugins: [require('@tailwindcss/typography')],\n" +
        "};";

      await fs.writeFile(
        path.join(process.cwd(), "tailwind.config.js"),
        tailwindConfigContent
      );
      console.log("✅ Created tailwind.config.js");

      // Add typography plugin to package.json
      packageJson.devDependencies["@tailwindcss/typography"] = "0.5.10";

      // Update package.json with typography plugin
      await fs.writeFile(
        path.join(process.cwd(), "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      console.log("🎉 React markdown components server created successfully!");
      console.log("");
      console.log("Next steps:");
      console.log("1. Run: npm install");
      console.log("2. Run: npm run dev");
      console.log("3. Open: http://localhost:" + port);
      console.log("4. Add markdown files to the content/ directory");

      return {
        ok: true,
        artifacts: [
          "package.json",
          "app/page." + pageExtension,
          "app/layout." + pageExtension,
          "app/globals.css",
          "components/MarkdownRenderer." + pageExtension,
          "components/CustomComponents." + pageExtension,
          "components/Alert." + pageExtension,
          "components/CodeBlock." + pageExtension,
          "lib/markdown." + (useTypeScript ? "ts" : "js"),
          "content/welcome.md",
          "next.config.js",
          "tailwind.config.js",
        ],
        summary:
          'Created React markdown components server "' +
          projectName +
          '" with SSR and custom components',
      };
    } catch (error) {
      console.error("❌ Failed to create markdown server:", error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: [],
      };
    }
  },
};
