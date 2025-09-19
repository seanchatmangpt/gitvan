---
title: "Welcome to {{ project_name }}"
description: "A static CMS built with Next.js and GitVan"
date: "{{ nowISO }}"
---

# Welcome to {{ project_name }}

This is a **static CMS** built with Next.js and GitVan that allows you to embed React components directly in your markdown content.

## Features

- 📝 **Markdown-first content management**
- ⚛️ **React components embedded in markdown**
- 🚀 **Static site generation for GitHub Pages**
- 🎨 **Tailwind CSS for styling**
- 🔧 **GitVan-powered automation**

## Getting Started

This CMS allows you to create rich content by combining markdown with React components. Here's how it works:

### Basic Markdown

You can write regular markdown content like this paragraph, with **bold text**, *italic text*, and [links](https://example.com).

### Embedded React Components

You can embed React components directly in your markdown using this syntax:

<Button variant="primary" size="lg">Click Me!</Button>

<Card title="Sample Card" description="This is a card component embedded in markdown">

This card contains some content and demonstrates how React components can be embedded directly in markdown files.

</Card>

### Code Examples

```javascript
// You can include code blocks
function greet(name) {
  return `Hello, ${name}!`;
}

greet('World');
```

## Next Steps

1. **Create new pages** using the `cms:create-page` job
2. **Add components** to the `content/components/` directory
3. **Customize styling** in the CSS files
4. **Deploy to GitHub Pages** using the `cms:deploy` job

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [GitVan Documentation](https://gitvan.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

*Built with ❤️ using Next.js and GitVan*

