# Getting Started

Welcome to {{ site_title }}! This guide will help you get up and running quickly.

## Overview

{{ site_title }} is an enterprise-grade documentation platform built with:

- **VitePress** - Fast static site generator
- **Vue 3** - Modern reactive framework
- **GitVan** - Automated workflows and build processes

## Quick Start

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Git for version control
- A text editor or IDE

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd {{ project_name }}
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or use GitVan
   gitvan run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see your documentation site.

## Project Structure

```
{{ project_name }}/
├── docs/                    # Documentation content
│   ├── .vitepress/         # VitePress configuration
│   │   ├── config.ts       # Site configuration
│   │   └── theme/          # Custom theme
│   ├── guide/              # Guide pages
│   ├── api/                # API documentation
│   └── examples/           # Example pages
├── jobs/                   # GitVan jobs
├── package.json
└── README.md
```

## Writing Content

### Creating Pages

Create new Markdown files in the `docs/` directory:

```markdown
---
title: My Page
description: Page description
---

# My Page

Content goes here...
```

### Using Components

VitePress supports Vue components in Markdown:

```markdown
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<button @click="count++">Count: {{ count }}</button>
```

## Next Steps

- [Learn about installation](/guide/installation)
- [Explore the API](/api/)
- [See examples](/examples/basic)
- [Contribute to the project](/contributing)