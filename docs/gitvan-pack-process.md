# GitVan Pack Process Documentation

## Overview

GitVan packs are distributed via GitHub and pulled using [giget](https://github.com/unjs/giget). The process demonstrates job-only architecture where packs contain only jobs and configuration, not actual application files.

## Pack Structure

A GitVan pack should contain exactly 4 files:

```
pack-name/
├── pack.json              # Pack manifest
├── README.md              # Documentation
├── create-next-app.job.mjs # Job to create project structure
└── start-next-app.job.mjs  # Job to start development server
```

## Process Flow

### 1. Pack Creation & Distribution

1. **Create Pack**: Developer creates a pack with jobs only
2. **Push to GitHub**: Pack is pushed to a GitHub repository
3. **Pack Manifest**: `pack.json` defines the jobs and their capabilities

### 2. Pack Consumption

1. **Pull with Giget**: User pulls pack using `npx giget@latest github:owner/repo`
2. **GitVan Init**: User runs `gitvan init` in the pulled directory
3. **Job Execution**: User runs jobs with arguments: `gitvan run create-next-app --projectName my-app`

### 3. Job Architecture

#### Job Definition
```javascript
export default defineJob({
  meta: {
    name: "create-next-app",
    description: "Creates a new Next.js project structure",
    version: "1.0.0",
    category: "scaffolding",
    tags: ["nextjs", "project", "structure"],
  },
  hooks: ["post-commit", "post-merge"],
  async run(context) {
    // Job logic here
    const projectName = context.inputs?.projectName || "my-nextjs-app";
    // ... create project structure
  },
});
```

#### Job Arguments
- Jobs accept arguments via `context.inputs`
- Example: `gitvan run create-next-app --projectName my-app`
- Jobs can run in headless mode (no user interaction required)

### 4. Expected Workflow

```bash
# 1. Pull pack from GitHub
npx giget@latest github:seanchatmangpt/gitvan-nextjs-pack

# 2. Initialize GitVan
cd gitvan-nextjs-pack
gitvan init

# 3. Run creation job
gitvan run create-next-app --projectName my-nextjs-app

# 4. Run startup job
gitvan run start-next-app --projectName my-nextjs-app
```

## Key Principles

1. **Job-Only Architecture**: Packs contain only jobs, not application files
2. **GitHub Distribution**: Packs are distributed via GitHub repositories
3. **Giget Integration**: Use giget to pull packs from GitHub
4. **Headless Execution**: Jobs should run without user interaction
5. **Argument Support**: Jobs accept command-line arguments
6. **Minimal Files**: Packs should be minimal (4 files max)

## Current Issues

1. **Import Paths**: Job files need correct relative paths to GitVan modules
2. **Job Registration**: Jobs need to be properly registered in GitVan's job system
3. **Context Handling**: Jobs need proper GitVan context for execution
4. **Error Handling**: Jobs need robust error handling for headless execution

## Next Steps

1. Fix import paths in job files
2. Ensure jobs can run in headless mode
3. Test the complete workflow end-to-end
4. Document the working process
5. Create a working example that demonstrates the full flow
