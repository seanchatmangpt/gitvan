# Next.js GitHub Pack

A GitVan pack for creating Next.js projects with jobs only, designed for GitHub distribution.

## Jobs Provided

- `create-next-app`: Creates a new Next.js project structure.
- `start-next-app`: Starts the Next.js development server.

## Usage with GitVan

1. **Initialize GitVan**:
   ```bash
   gitvan init
   ```

2. **Install the pack from marketplace**:
   ```bash
   gitvan marketplace install nextjs-github-pack
   ```

3. **Create a Next.js project**:
   ```bash
   PROJECT_NAME=my-app gitvan run create-next-app
   ```

4. **Start the development server**:
   ```bash
   PROJECT_NAME=my-app gitvan run start-next-app
   ```

## Features

- **Framework**: Next.js ^14.0.0
- **Language**: TypeScript
- **Styling**: CSS Modules + Tailwind CSS
- **Linting**: ESLint + Next.js config
- **Architecture**: Job-only (4 files only)
- **Source**: GitHub (via giget)

## Pack Structure

```
nextjs-github-pack/
├── pack.json
├── README.md
├── create-next-app.job.mjs
└── start-next-app.job.mjs
```

This pack demonstrates GitVan's autonomous workflow where jobs create and manage Next.js projects automatically.
