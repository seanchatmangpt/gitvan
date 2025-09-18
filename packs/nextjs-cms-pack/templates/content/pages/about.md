---
title: "About {{ project_name }}"
description: "Learn more about this static CMS"
date: "{{ nowISO }}"
---

# About {{ project_name }}

This static CMS is built using modern web technologies to provide a powerful, flexible content management system that's perfect for developers who want to combine the simplicity of markdown with the power of React components.

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **MDX** - Markdown with JSX components
- **GitVan** - Git-native automation platform

## Architecture

The CMS is designed with a clean separation of concerns:

- **Content** - Markdown files in the `content/pages/` directory
- **Components** - React components in the `content/components/` directory
- **Styling** - Tailwind CSS classes and custom CSS
- **Build** - Static site generation for GitHub Pages deployment

## Key Features

### 1. Component Embedding

Embed React components directly in markdown:

<Button variant="secondary">Learn More</Button>

### 2. Static Generation

The entire site is pre-rendered as static HTML, making it:
- ⚡ **Fast** - No server-side rendering needed
- 🔒 **Secure** - No server vulnerabilities
- 💰 **Cost-effective** - Host on GitHub Pages for free

### 3. GitVan Integration

Leverage GitVan's powerful automation:
- **Job-based workflows** for content creation
- **Template system** for consistent structure
- **Git integration** for version control

## Getting Started

1. **Install dependencies**: `pnpm install`
2. **Start development**: `pnpm run dev`
3. **Create content**: Use the GitVan jobs to create new pages
4. **Deploy**: Push to GitHub and let GitHub Actions handle deployment

## Customization

### Adding New Components

Create new React components in `content/components/` and they'll be automatically available in your markdown files.

### Styling

Customize the appearance by modifying:
- `src/app/globals.css` - Global styles
- `tailwind.config.js` - Tailwind configuration
- Component-specific styles

### Content Structure

Organize your content in the `content/pages/` directory. Each markdown file becomes a page on your site.

---

*Ready to build something amazing? Start creating content!*
