# Next.js Static CMS Pack

A GitVan pack for creating Next.js static CMS with React components embedded in markdown pages, designed for GitHub Pages deployment.

## Features

- 📝 **Markdown-first content management**
- ⚛️ **React components embedded in markdown**
- 🚀 **Static site generation for GitHub Pages**
- 🎨 **Tailwind CSS for styling**
- 🔧 **GitVan-powered automation**
- 📱 **Responsive design**
- 🔍 **SEO optimized**

## Quick Start

### 1. Create a New CMS Project

```bash
# Run the GitVan job to create a new CMS project
gitvan run cms:create-project
```

This will prompt you for:
- Project name
- GitHub repository name (for GitHub Pages base path)
- TypeScript usage
- Tailwind CSS usage

### 2. Install Dependencies

```bash
cd your-project-name
pnpm install
```

### 3. Start Development Server

```bash
pnpm run dev
```

Visit `http://localhost:3000` to see your CMS in action.

## Available Jobs

### `cms:create-project`
Creates a complete Next.js CMS project structure with all necessary files and configurations.

### `cms:build`
Builds the static CMS site for production deployment.

### `cms:dev`
Starts the CMS development server with hot reloading.

### `cms:deploy`
Deploys the built site to GitHub Pages.

### `cms:create-page`
Creates a new markdown page with optional React component examples.

## Project Structure

```
your-project/
├── content/
│   ├── pages/           # Markdown content files
│   │   ├── index.md
│   │   └── about.md
│   └── components/     # React components for embedding
│       ├── Button.tsx
│       └── Card.tsx
├── src/
│   ├── app/            # Next.js App Router
│   ├── components/     # Core CMS components
│   └── lib/            # Utilities and helpers
├── public/             # Static assets
├── .github/
│   └── workflows/      # GitHub Actions
└── next.config.mjs     # Next.js configuration
```

## Writing Content

### Basic Markdown

Create `.md` files in the `content/pages/` directory with frontmatter:

```markdown
---
title: "My Page"
description: "Page description"
date: "2024-01-01"
---

# My Page Title

This is regular markdown content with **bold text** and *italic text*.
```

### Embedding React Components

Embed React components directly in your markdown:

```markdown
<Button variant="primary" size="lg">Click Me!</Button>

<Card title="Sample Card" description="This is a card component">

This card contains some content and demonstrates how React components can be embedded directly in markdown files.

</Card>
```

### Available Components

The pack includes several pre-built components:

- **Button** - Interactive buttons with variants and sizes
- **Card** - Content cards with titles and descriptions

You can create additional components in the `content/components/` directory.

## Customization

### Adding New Components

1. Create a new `.tsx` file in `content/components/`
2. Export your component as default
3. The component will be automatically available in markdown files

Example:
```tsx
// content/components/Alert.tsx
import React from 'react'

interface AlertProps {
  type: 'info' | 'warning' | 'error'
  children: React.ReactNode
}

export default function Alert({ type, children }: AlertProps) {
  const colors = {
    info: 'bg-blue-100 border-blue-500 text-blue-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    error: 'bg-red-100 border-red-500 text-red-800'
  }
  
  return (
    <div className={`border-l-4 p-4 ${colors[type]}`}>
      {children}
    </div>
  )
}
```

Then use it in markdown:
```markdown
<Alert type="info">This is an informational alert!</Alert>
```

### Styling

- **Global styles**: Edit `src/app/globals.css`
- **Tailwind config**: Modify `tailwind.config.js`
- **Component styles**: Add Tailwind classes to your components

### Configuration

- **Next.js**: Edit `next.config.mjs` for build settings
- **TypeScript**: Modify `tsconfig.json` for type checking
- **GitHub Actions**: Update `.github/workflows/deploy.yml` for deployment

## Deployment

### GitHub Pages

1. Push your code to GitHub
2. Enable GitHub Pages in repository settings
3. Select "GitHub Actions" as the source
4. The workflow will automatically deploy on every push to main

### Custom Domain

Add your custom domain to `.github/workflows/deploy.yml`:

```yaml
with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  publish_dir: ./out
  cname: yourdomain.com
```

## Development Workflow

1. **Create content**: Use `cms:create-page` to add new pages
2. **Develop locally**: Run `pnpm run dev` for hot reloading
3. **Test components**: Add new components to `content/components/`
4. **Build**: Run `pnpm run build` to test production build
5. **Deploy**: Push to GitHub for automatic deployment

## Best Practices

### Content Organization
- Keep pages in `content/pages/`
- Organize components in `content/components/`
- Use descriptive filenames and frontmatter

### Component Design
- Make components reusable and configurable
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling

### Performance
- Optimize images and assets
- Use Next.js Image component for images
- Minimize bundle size
- Leverage static generation benefits

## Troubleshooting

### Common Issues

1. **Components not rendering**: Check component imports in `MDXComponents.tsx`
2. **Build errors**: Ensure all components are properly exported
3. **Styling issues**: Verify Tailwind classes and CSS imports
4. **Deployment failures**: Check GitHub Actions logs and repository settings

### Getting Help

- Check the [Next.js documentation](https://nextjs.org/docs)
- Review [GitVan documentation](https://gitvan.dev)
- Open an issue in the GitVan repository

## License

MIT License - see LICENSE file for details.

---

*Built with ❤️ using Next.js and GitVan*

