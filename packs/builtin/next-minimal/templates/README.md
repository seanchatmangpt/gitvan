# {{ project_name }}

A Next.js application created with GitVan.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# or
gitvan run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- ⚡ Next.js 14 with Pages Router
{% if use_typescript %}- 🦾 TypeScript for type safety{% endif %}
{% if use_tailwind %}- 🎨 Tailwind CSS for styling{% endif %}
- 📦 ESLint for code quality
- 🚀 GitVan for workflow automation

## GitVan Jobs

This project includes GitVan jobs for common development tasks:

```bash
# Development server
gitvan run dev

# Build application
gitvan run build

# Start production server
gitvan run start

# Lint code
gitvan run lint

# Type checking (TypeScript)
gitvan run type-check
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [GitVan Documentation](https://github.com/ruvnet/gitvan)
{% if use_typescript %}- [TypeScript Documentation](https://www.typescriptlang.org/docs/){% endif %}
{% if use_tailwind %}- [Tailwind CSS Documentation](https://tailwindcss.com/docs){% endif %}