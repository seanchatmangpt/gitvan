# GitVan Playground - Job Examples

## 📋 Complete Job Examples

This document provides complete, working examples of all job types in the GitVan playground.

## 1. On-Demand Jobs

### Changelog Generation Job

**File**: `jobs/docs/changelog.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";

export default defineJob({
  meta: { desc: "Render changelog from git log" },
  async run({ ctx }) {
    const git = useGit();
    const template = await useTemplate();
    
    // Get recent commits
    const logOutput = await git.log("%h%x09%s", ["-n", "30"]);
    const lines = logOutput.split("\n").filter(Boolean);
    
    const commits = lines.map((line) => {
      const [hash, subject] = line.split("\t");
      return { hash, subject };
    });

    // Render template to file
    const outputPath = await template.renderToFile(
      "changelog.njk", 
      "dist/CHANGELOG.md", 
      { 
        commits,
        generatedAt: ctx.nowISO,
        totalCommits: commits.length
      }
    );

    return { 
      ok: true, 
      artifacts: [outputPath],
      data: {
        commitsProcessed: commits.length,
        outputPath
      }
    };
  }
});
```

### Status Report Job

**File**: `jobs/test/simple.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Generate a simple status report",
    tags: ["report", "status"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    
    // Gather repository information
    const head = await git.currentHead();
    const branch = await git.currentBranch();
    const isClean = await git.isClean();
    const commitCount = await git.getCommitCount();
    
    const reportData = {
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        isClean,
        commitCount
      },
      payload: payload || {},
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    // Create JSON report
    const outputPath = join(ctx.root, "dist", "status-report.json");
    await fs.mkdir(join(ctx.root, "dist"), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(reportData, null, 2));

    return {
      ok: true,
      artifacts: [outputPath],
      data: reportData
    };
  }
});
```

## 2. Cron Jobs

### Cleanup Job

**File**: `jobs/test/cleanup.cron.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Clean up temporary files and old artifacts",
    tags: ["cleanup", "maintenance"]
  },
  cron: "0 2 * * *", // Run daily at 2 AM
  async run({ ctx }) {
    const git = useGit();
    const artifacts = [];
    
    // Clean up dist directory
    const distDir = join(ctx.root, "dist");
    try {
      const files = await fs.readdir(distDir);
      const oldFiles = files.filter((file) => {
        // Simple heuristic: files older than 7 days
        return (
          file.includes("old") ||
          file.includes("temp") ||
          file.includes("backup")
        );
      });
      
      for (const file of oldFiles) {
        const filePath = join(distDir, file);
        await fs.unlink(filePath);
        artifacts.push(`Removed: ${file}`);
        ctx.logger.log(`Removed old file: ${file}`);
      }
      
      if (oldFiles.length === 0) {
        artifacts.push("No old files found to clean up");
        ctx.logger.log("No old files found to clean up");
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        artifacts.push("Dist directory does not exist");
        ctx.logger.log("Dist directory does not exist");
      } else {
        throw error;
      }
    }

    return {
      ok: true,
      artifacts,
      data: {
        cleanedFiles: artifacts.length,
        timestamp: ctx.nowISO
      }
    };
  }
});
```

## 3. Event-Driven Jobs

### Release Notification Job

**File**: `jobs/alerts/release.evt.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Notify on new tags or releases",
    tags: ["notification", "release"]
  },
  on: {
    any: [{ tagCreate: "v*.*.*" }, { semverTag: true }]
  },
  async run({ ctx, trigger }) {
    const git = useGit();
    
    // Get the latest tag (handle case where no tags exist)
    let latestTag;
    try {
      latestTag = await git.run(["describe", "--tags", "--abbrev=0", "HEAD"]);
    } catch (error) {
      if (error.message.includes("No names found")) {
        // No tags exist, this is normal for new repositories
        ctx.logger.log("No tags found in repository");
        latestTag = "no-tags";
      } else {
        throw error;
      }
    }

    const notification = {
      type: "release",
      tag: latestTag.trim(),
      timestamp: ctx.nowISO,
      trigger: trigger?.data || {},
      repository: {
        head: await git.currentHead(),
        branch: await git.currentBranch()
      }
    };

    // Create notification file
    const outputPath = join(
      ctx.root,
      "dist",
      "notifications",
      `${Date.now()}-release.json`
    );
    await fs.mkdir(join(ctx.root, "dist", "notifications"), {
      recursive: true
    });
    await fs.writeFile(outputPath, JSON.stringify(notification, null, 2));

    ctx.logger.log(`Release notification created for tag: ${latestTag}`);

    return {
      ok: true,
      artifacts: [outputPath],
      data: notification
    };
  }
});
```

## 4. Advanced Job Examples

### Database Migration Job

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Run database migrations",
    tags: ["database", "migration"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    
    // Check if migrations are needed
    const migrationFiles = await fs.readdir("migrations");
    const appliedMigrations = await fs.readFile("migrations/applied.json", "utf-8")
      .then(JSON.parse)
      .catch(() => []);
    
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      return {
        ok: true,
        artifacts: [],
        data: { message: "No migrations to run" }
      };
    }
    
    // Run migrations
    const results = [];
    for (const migration of pendingMigrations) {
      try {
        const migrationPath = join("migrations", migration);
        const migrationContent = await fs.readFile(migrationPath, "utf-8");
        
        // Execute migration (simplified)
        ctx.logger.log(`Running migration: ${migration}`);
        
        results.push({
          migration,
          status: "success",
          timestamp: ctx.nowISO
        });
        
        // Mark as applied
        appliedMigrations.push(migration);
        await fs.writeFile(
          "migrations/applied.json",
          JSON.stringify(appliedMigrations, null, 2)
        );
        
      } catch (error) {
        results.push({
          migration,
          status: "failed",
          error: error.message,
          timestamp: ctx.nowISO
        });
        throw error;
      }
    }
    
    return {
      ok: true,
      artifacts: ["migrations/applied.json"],
      data: {
        migrationsRun: results.length,
        results
      }
    };
  }
});
```

### Build and Deploy Job

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Build and deploy application",
    tags: ["build", "deploy"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();
    
    // Get build information
    const head = await git.currentHead();
    const branch = await git.currentBranch();
    const isClean = await git.isClean();
    
    if (!isClean) {
      throw new Error("Repository has uncommitted changes");
    }
    
    // Build application (simplified)
    ctx.logger.log("Building application...");
    const buildStart = Date.now();
    
    // Simulate build process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const buildTime = Date.now() - buildStart;
    
    // Generate build report
    const buildReport = {
      version: head.substring(0, 8),
      branch,
      buildTime,
      timestamp: ctx.nowISO,
      environment: payload.environment || "production"
    };
    
    // Render build report template
    const reportPath = await template.renderToFile(
      "build-report.njk",
      "dist/build-report.md",
      buildReport
    );
    
    // Create deployment artifact
    const deploymentArtifact = {
      version: head.substring(0, 8),
      timestamp: ctx.nowISO,
      artifacts: [reportPath],
      environment: payload.environment || "production"
    };
    
    const artifactPath = join(ctx.root, "dist", "deployment.json");
    await fs.writeFile(artifactPath, JSON.stringify(deploymentArtifact, null, 2));
    
    ctx.logger.log(`Build completed in ${buildTime}ms`);
    
    return {
      ok: true,
      artifacts: [reportPath, artifactPath],
      data: buildReport
    };
  }
});
```

### Test Runner Job

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { promises as fs } from "node:fs";
import { join } from "pathe";

export default defineJob({
  meta: {
    desc: "Run test suite and generate coverage report",
    tags: ["test", "coverage"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    
    // Get test configuration
    const testConfig = {
      head: await git.currentHead(),
      branch: await git.currentBranch(),
      timestamp: ctx.nowISO,
      ...payload
    };
    
    // Run tests (simplified)
    ctx.logger.log("Running test suite...");
    const testStart = Date.now();
    
    // Simulate test execution
    const testResults = {
      total: 42,
      passed: 40,
      failed: 2,
      skipped: 0,
      duration: Date.now() - testStart
    };
    
    // Generate coverage report
    const coverageReport = {
      lines: { total: 1000, covered: 950, percentage: 95 },
      functions: { total: 50, covered: 48, percentage: 96 },
      branches: { total: 200, covered: 190, percentage: 95 },
      statements: { total: 800, covered: 760, percentage: 95 }
    };
    
    // Create test report
    const testReport = {
      ...testConfig,
      results: testResults,
      coverage: coverageReport,
      artifacts: []
    };
    
    // Save test results
    const resultsPath = join(ctx.root, "dist", "test-results.json");
    await fs.writeFile(resultsPath, JSON.stringify(testReport, null, 2));
    
    // Save coverage report
    const coveragePath = join(ctx.root, "dist", "coverage.json");
    await fs.writeFile(coveragePath, JSON.stringify(coverageReport, null, 2));
    
    ctx.logger.log(`Tests completed: ${testResults.passed}/${testResults.total} passed`);
    
    return {
      ok: testResults.failed === 0,
      artifacts: [resultsPath, coveragePath],
      data: testReport
    };
  }
});
```

## 5. Template Examples

### Changelog Template

**File**: `templates/changelog.njk`

```njk
# Changelog

Generated at: {{ generatedAt }}
Total commits: {{ totalCommits }}

## Recent Changes

{% for commit in commits -%}
- **{{ commit.hash }}** {{ commit.subject }}
{% endfor %}

---
*Generated by GitVan Jobs System*
```

### Build Report Template

**File**: `templates/build-report.njk`

```njk
# Build Report

**Version**: {{ version }}
**Branch**: {{ branch }}
**Environment**: {{ environment }}
**Build Time**: {{ buildTime }}ms
**Timestamp**: {{ timestamp }}

## Build Details

- **Commit**: {{ version }}
- **Branch**: {{ branch }}
- **Environment**: {{ environment }}
- **Build Duration**: {{ buildTime }}ms

## Artifacts

- Build report generated
- Deployment artifact created

---
*Generated by GitVan Jobs System*
```

### Test Report Template

**File**: `templates/test-report.njk`

```njk
# Test Report

**Total Tests**: {{ results.total }}
**Passed**: {{ results.passed }}
**Failed**: {{ results.failed }}
**Skipped**: {{ results.skipped }}
**Duration**: {{ results.duration }}ms

## Coverage Summary

- **Lines**: {{ coverage.lines.percentage }}%
- **Functions**: {{ coverage.functions.percentage }}%
- **Branches**: {{ coverage.branches.percentage }}%
- **Statements**: {{ coverage.statements.percentage }}%

## Test Results

{% if results.failed > 0 -%}
❌ **{{ results.failed }} tests failed**
{% else -%}
✅ **All tests passed**
{% endif %}

---
*Generated by GitVan Jobs System*
```

## 6. Configuration Examples

### Development Configuration

```javascript
export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { 
    engine: "nunjucks", 
    dirs: ["templates"],
    noCache: true  // Disable caching for development
  },
  receipts: { ref: "refs/notes/gitvan/results" },
  hooks: {
    "job:before"({ id, payload }) {
      console.log(`🚀 Starting job: ${id}`);
    },
    "job:after"({ id, result }) {
      console.log(`✅ Job completed: ${id}`);
    },
    "job:error"({ id, error }) {
      console.error(`❌ Job failed: ${id}`, error.message);
    }
  }
};
```

### Production Configuration

```javascript
export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { 
    engine: "nunjucks", 
    dirs: ["templates"],
    noCache: false  // Enable caching for production
  },
  receipts: { ref: "refs/notes/gitvan/results" },
  hooks: {
    "job:before"({ id, payload }) {
      // Log to production logging system
      logger.info(`Job started: ${id}`, { payload });
    },
    "job:after"({ id, result }) {
      // Log to production logging system
      logger.info(`Job completed: ${id}`, { result });
    },
    "job:error"({ id, error }) {
      // Log to production logging system
      logger.error(`Job failed: ${id}`, { error: error.message });
    }
  }
};
```

## 7. Event Predicate Examples

### Tag-Based Triggers

```javascript
on: {
  any: [
    { tagCreate: "v*.*.*" },     // Any version tag
    { tagCreate: "release-*" },   // Release tags
    { semverTag: true }           // Any semver tag
  ]
}
```

### Branch-Based Triggers

```javascript
on: {
  any: [
    { mergeTo: "main" },         // Merge to main
    { pushTo: "develop" },       // Push to develop
    { mergeTo: "release/*" }     // Merge to release branches
  ]
}
```

### File-Based Triggers

```javascript
on: {
  any: [
    { pathChanged: ["src/**/*.js"] },      // JavaScript files changed
    { pathAdded: ["docs/**/*.md"] },       // New markdown files
    { pathModified: ["*.json", "*.yaml"] }  // Config files modified
  ]
}
```

### Message-Based Triggers

```javascript
on: {
  any: [
    { message: "release" },                // Commit message contains "release"
    { message: "hotfix" },                 // Commit message contains "hotfix"
    { authorEmail: "*@company.com" }       // Author email pattern
  ]
}
```

### Complex Predicates

```javascript
on: {
  all: [  // All conditions must be true
    { mergeTo: "main" },
    { signed: true }
  ],
  any: [  // Any of these conditions can be true
    { tagCreate: "v*.*.*" },
    { message: "release" }
  ]
}
```

## 8. Cron Expression Examples

### Common Schedules

```javascript
cron: "0 2 * * *"        // Daily at 2 AM
cron: "0 */6 * * *"      // Every 6 hours
cron: "*/15 * * * *"     // Every 15 minutes
cron: "0 9-17 * * 1-5"   // Every hour 9-17, weekdays only
cron: "0 0 1 * *"        // First day of every month
cron: "0 0 * * 0"        // Every Sunday at midnight
```

### Business Hours

```javascript
cron: "0 9-17 * * 1-5"   // Every hour during business hours
cron: "0 9 * * 1-5"      // 9 AM on weekdays
cron: "0 17 * * 1-5"     // 5 PM on weekdays
```

### Maintenance Windows

```javascript
cron: "0 2 * * 0"        // Sunday at 2 AM (maintenance window)
cron: "0 3 * * 1"        // Monday at 3 AM (after weekend)
```

## 9. Error Handling Examples

### Graceful Error Handling

```javascript
async run({ ctx }) {
  try {
    // Risky operation
    const result = await riskyOperation();
    return { ok: true, data: result };
  } catch (error) {
    // Log error but don't fail the job
    ctx.logger.warn(`Operation failed: ${error.message}`);
    return { 
      ok: true, 
      data: { 
        error: error.message,
        fallback: "default-value"
      }
    };
  }
}
```

### Retry Logic

```javascript
async run({ ctx }) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await riskyOperation();
      return { ok: true, data: result };
    } catch (error) {
      lastError = error;
      ctx.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}
```

### Validation

```javascript
async run({ ctx, payload }) {
  // Validate payload
  if (!payload.requiredField) {
    throw new Error("requiredField is required");
  }
  
  if (typeof payload.requiredField !== "string") {
    throw new Error("requiredField must be a string");
  }
  
  // Continue with job logic
  return { ok: true, data: payload };
}
```

## 10. Performance Optimization Examples

### Caching

```javascript
async run({ ctx }) {
  const cacheKey = `expensive-operation-${ctx.head}`;
  
  // Check cache first
  let result = await getFromCache(cacheKey);
  if (result) {
    ctx.logger.log("Using cached result");
    return { ok: true, data: result };
  }
  
  // Perform expensive operation
  result = await expensiveOperation();
  
  // Cache the result
  await setCache(cacheKey, result);
  
  return { ok: true, data: result };
}
```

### Parallel Operations

```javascript
async run({ ctx }) {
  // Run multiple operations in parallel
  const [result1, result2, result3] = await Promise.all([
    operation1(),
    operation2(),
    operation3()
  ]);
  
  return { 
    ok: true, 
    data: { result1, result2, result3 }
  };
}
```

### Resource Cleanup

```javascript
async run({ ctx }) {
  let tempFile;
  
  try {
    // Create temporary file
    tempFile = await createTempFile();
    
    // Use temporary file
    const result = await processFile(tempFile);
    
    return { ok: true, data: result };
  } finally {
    // Always clean up
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {});
    }
  }
}
```

These examples demonstrate the full range of GitVan job capabilities and provide practical patterns for common use cases.
