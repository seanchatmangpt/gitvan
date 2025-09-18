# GitVan Pack Process - Correct Implementation

## How GitVan Jobs Actually Work

### 1. Job Structure
Jobs should use the correct import pattern:

```javascript
import { defineJob } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: { 
    name: 'create-next-app', 
    desc: 'Creates a new Next.js project structure' 
  },
  hooks: ["post-commit", "post-merge"], // Optional: Git hooks to trigger on
  async run(ctx) {
    const { inputs } = ctx;
    const projectName = inputs?.projectName || 'my-nextjs-app';
    
    // Job logic here
    console.log(`Creating project: ${projectName}`);
    
    return {
      status: 'success',
      message: `Created project: ${projectName}`,
      data: { projectName }
    };
  }
});
```

### 2. Job Loading Process
GitVan automatically loads jobs from the `jobs/` directory:

1. **Job Discovery**: `JobLoader` scans `jobs/*.mjs` files
2. **Job Registration**: Jobs are registered in `JobRegistry`
3. **Hook Mapping**: Jobs with `hooks` array are mapped to Git hooks
4. **Execution**: Jobs can be run via `gitvan run <job-name>`

### 3. Correct Workflow

```bash
# 1. Pull pack from GitHub
npx giget@latest github:seanchatmangpt/gitvan-nextjs-pack
cd gitvan-nextjs-pack

# 2. Initialize GitVan
gitvan init

# 3. Copy job files to jobs directory
cp create-next-app.job.mjs jobs/
cp start-next-app.job.mjs jobs/

# 4. Run jobs with arguments
gitvan run create-next-app --projectName my-app
gitvan run start-next-app --projectName my-app
```

### 4. Key Requirements

1. **Import Path**: Use `file:///Users/sac/gitvan/src/index.mjs` for `defineJob`
2. **Job Location**: Jobs must be in `jobs/` directory
3. **Context Access**: Use `ctx.inputs` for command-line arguments
4. **Return Value**: Jobs should return status/message/data object
5. **Hooks**: Optional `hooks` array for Git hook triggers

### 5. Current Issues to Fix

1. **Wrong Import Path**: Jobs use `../../../src/core/job-registry.mjs` instead of correct path
2. **Missing Job Copy**: Jobs need to be copied to `jobs/` directory
3. **Argument Passing**: Need to ensure `--projectName` gets to `ctx.inputs`

### 6. Fixed Job Template

```javascript
import { defineJob } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: { 
    name: 'create-next-app', 
    desc: 'Creates a new Next.js project structure' 
  },
  hooks: ["post-commit", "post-merge"],
  async run(ctx) {
    const { inputs } = ctx;
    const projectName = inputs?.projectName || 'my-nextjs-app';
    
    // Create project structure
    // ... implementation
    
    return {
      status: 'success',
      message: `Created Next.js project: ${projectName}`,
      data: { projectName, files: 6 }
    };
  }
});
```

This is the correct pattern for GitVan jobs in packs.
