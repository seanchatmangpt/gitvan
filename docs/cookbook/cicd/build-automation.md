# Build Automation

## 🎯 **Recipe Overview**

**Category**: CI/CD  
**Difficulty**: Intermediate  
**Time**: 30 minutes  
**Prerequisites**: Basic GitVan knowledge, build system experience

## 📋 **Problem**

You need to automate your build process with Git-native triggers, environment-specific builds, and comprehensive build reporting. You want a system that can handle different build types and provide detailed build artifacts.

## 🍳 **Solution**

### **Step 1: Create Basic Build Job**

```javascript
// jobs/cicd/build.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default defineJob({
  meta: {
    desc: "Automated build process with environment-specific configuration",
    tags: ["cicd", "build", "automation"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();
    
    // Get build configuration
    const environment = payload?.environment || "development";
    const buildType = payload?.buildType || "production";
    const cleanBuild = payload?.cleanBuild !== false;
    
    // Get repository information
    const head = await git.currentHead();
    const branch = await git.currentBranch();
    const isClean = await git.isClean();
    
    if (!isClean && !payload?.allowDirty) {
      throw new Error("Repository has uncommitted changes. Build aborted.");
    }
    
    const buildInfo = {
      environment,
      buildType,
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        isClean
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    ctx.logger.log(`🚀 Starting ${buildType} build for ${environment} environment`);
    
    // Clean build directory if requested
    if (cleanBuild) {
      const distDir = join(ctx.root, "dist");
      try {
        await fs.rmdir(distDir, { recursive: true });
        ctx.logger.log("🧹 Cleaned build directory");
      } catch (error) {
        // Directory might not exist, that's okay
      }
    }
    
    // Create build directory
    const buildDir = join(ctx.root, "dist", "build");
    await fs.mkdir(buildDir, { recursive: true });
    
    // Run build commands
    const buildSteps = [
      { name: "Install Dependencies", command: "npm", args: ["install"] },
      { name: "Lint Code", command: "npm", args: ["run", "lint"] },
      { name: "Run Tests", command: "npm", args: ["run", "test"] },
      { name: "Build Application", command: "npm", args: ["run", "build"] }
    ];
    
    const buildResults = [];
    let buildSuccess = true;
    
    for (const step of buildSteps) {
      try {
        ctx.logger.log(`📦 Running: ${step.name}`);
        const startTime = Date.now();
        
        const result = await execFileAsync(step.command, step.args, {
          cwd: ctx.root,
          env: {
            ...process.env,
            NODE_ENV: environment,
            BUILD_TYPE: buildType
          }
        });
        
        const duration = Date.now() - startTime;
        
        buildResults.push({
          step: step.name,
          command: `${step.command} ${step.args.join(' ')}`,
          success: true,
          duration,
          stdout: result.stdout,
          stderr: result.stderr
        });
        
        ctx.logger.log(`✅ ${step.name} completed in ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        buildResults.push({
          step: step.name,
          command: `${step.command} ${step.args.join(' ')}`,
          success: false,
          duration,
          error: error.message,
          stdout: error.stdout,
          stderr: error.stderr
        });
        
        ctx.logger.error(`❌ ${step.name} failed: ${error.message}`);
        
        if (step.name === "Run Tests" || step.name === "Lint Code") {
          buildSuccess = false;
          break; // Stop on test or lint failures
        }
      }
    }
    
    // Generate build report
    const buildReport = {
      ...buildInfo,
      success: buildSuccess,
      steps: buildResults,
      summary: {
        totalSteps: buildSteps.length,
        successfulSteps: buildResults.filter(r => r.success).length,
        failedSteps: buildResults.filter(r => !r.success).length,
        totalDuration: buildResults.reduce((sum, r) => sum + r.duration, 0)
      }
    };
    
    // Save build report
    const reportPath = join(buildDir, "build-report.json");
    await fs.writeFile(reportPath, JSON.stringify(buildReport, null, 2));
    
    // Generate HTML build report
    const htmlReportPath = await template.renderToFile(
      "build-report.njk",
      join(buildDir, "build-report.html"),
      buildReport
    );
    
    ctx.logger.log(`📊 Build ${buildSuccess ? 'completed successfully' : 'failed'}`);
    ctx.logger.log(`📝 Build report: ${reportPath}`);
    
    return {
      ok: buildSuccess,
      artifacts: [reportPath, htmlReportPath],
      data: buildReport
    };
  }
});
```

### **Step 2: Create Build Report Template**

```njk
<!-- templates/build-report.njk -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Build Report - {{ environment | titleize }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: {{ success ? '#28a745' : '#dc3545' }}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-item { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .summary-item h3 { margin: 0 0 10px 0; color: #333; }
        .summary-item .value { font-size: 2em; font-weight: bold; color: {{ success ? '#28a745' : '#dc3545' }}; }
        .steps { margin-top: 30px; }
        .step { margin-bottom: 20px; padding: 15px; border-radius: 5px; border-left: 4px solid {{ success ? '#28a745' : '#dc3545' }}; }
        .step.success { background: #d4edda; border-left-color: #28a745; }
        .step.failure { background: #f8d7da; border-left-color: #dc3545; }
        .step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .step-name { font-weight: bold; font-size: 1.1em; }
        .step-duration { color: #666; font-size: 0.9em; }
        .step-command { background: #e9ecef; padding: 8px; border-radius: 3px; font-family: monospace; font-size: 0.9em; margin: 10px 0; }
        .step-output { background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; font-size: 0.8em; max-height: 200px; overflow-y: auto; }
        .meta { background: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .meta-item { display: flex; justify-content: space-between; }
        .meta-label { font-weight: bold; }
        .meta-value { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Build Report</h1>
            <p>{{ environment | titleize }} Environment - {{ buildType | titleize }} Build</p>
            <p>Generated: {{ generatedAt | date("YYYY-MM-DD HH:mm:ss") }}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="summary-item">
                    <h3>Status</h3>
                    <div class="value">{{ success ? 'SUCCESS' : 'FAILED' }}</div>
                </div>
                <div class="summary-item">
                    <h3>Total Steps</h3>
                    <div class="value">{{ summary.totalSteps }}</div>
                </div>
                <div class="summary-item">
                    <h3>Successful</h3>
                    <div class="value">{{ summary.successfulSteps }}</div>
                </div>
                <div class="summary-item">
                    <h3>Failed</h3>
                    <div class="value">{{ summary.failedSteps }}</div>
                </div>
                <div class="summary-item">
                    <h3>Duration</h3>
                    <div class="value">{{ (summary.totalDuration / 1000) | round(2) }}s</div>
                </div>
            </div>
            
            <div class="steps">
                <h2>Build Steps</h2>
                {% for step in steps %}
                <div class="step {{ step.success ? 'success' : 'failure' }}">
                    <div class="step-header">
                        <div class="step-name">{{ step.step }}</div>
                        <div class="step-duration">{{ (step.duration / 1000) | round(2) }}s</div>
                    </div>
                    <div class="step-command">{{ step.command }}</div>
                    {% if step.stdout %}
                    <div class="step-output">{{ step.stdout }}</div>
                    {% endif %}
                    {% if step.stderr %}
                    <div class="step-output" style="color: #dc3545;">{{ step.stderr }}</div>
                    {% endif %}
                    {% if step.error %}
                    <div class="step-output" style="color: #dc3545;">Error: {{ step.error }}</div>
                    {% endif %}
                </div>
                {% endfor %}
            </div>
            
            <div class="meta">
                <h3>Build Information</h3>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Repository:</span>
                        <span class="meta-value">{{ repository.branch }} ({{ repository.head }})</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Environment:</span>
                        <span class="meta-value">{{ environment }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Build Type:</span>
                        <span class="meta-value">{{ buildType }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Node.js:</span>
                        <span class="meta-value">{{ system.nodeVersion }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Platform:</span>
                        <span class="meta-value">{{ system.platform }} {{ system.arch }}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Clean Repository:</span>
                        <span class="meta-value">{{ repository.isClean ? 'Yes' : 'No' }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
```

### **Step 3: Create Event-Driven Build Job**

```javascript
// jobs/cicd/event-build.evt.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";

export default defineJob({
  meta: {
    desc: "Trigger builds on specific git events",
    tags: ["cicd", "build", "event-driven"]
  },
  on: {
    any: [
      { mergeTo: "main" },
      { pushTo: "develop" },
      { tagCreate: "v*.*.*" }
    ]
  },
  async run({ ctx, trigger }) {
    const git = useGit();
    
    // Determine build environment based on trigger
    let environment = "development";
    let buildType = "development";
    
    if (trigger.data?.branch === "main") {
      environment = "production";
      buildType = "production";
    } else if (trigger.data?.branch === "develop") {
      environment = "staging";
      buildType = "staging";
    } else if (trigger.data?.tag) {
      environment = "production";
      buildType = "release";
    }
    
    ctx.logger.log(`🚀 Event-triggered build: ${environment} (${buildType})`);
    ctx.logger.log(`📋 Trigger: ${JSON.stringify(trigger.data)}`);
    
    // Import and run the build job
    const { default: buildJob } = await import("./build.mjs");
    
    const result = await buildJob.run({
      ctx,
      payload: {
        environment,
        buildType,
        trigger: trigger.data,
        eventDriven: true
      }
    });
    
    return {
      ok: result.ok,
      artifacts: result.artifacts,
      data: {
        ...result.data,
        trigger: trigger.data,
        eventDriven: true
      }
    };
  }
});
```

## 🔍 **Explanation**

### **Build Process**

1. **Environment Detection**: Determines build environment from payload or git context
2. **Repository Validation**: Checks repository state before building
3. **Build Steps**: Executes predefined build steps in sequence
4. **Error Handling**: Stops on critical failures, continues on non-critical ones
5. **Reporting**: Generates comprehensive build reports

### **Build Steps**

1. **Install Dependencies**: `npm install`
2. **Lint Code**: `npm run lint`
3. **Run Tests**: `npm run test`
4. **Build Application**: `npm run build`

### **Event Triggers**

- **Merge to main**: Production builds
- **Push to develop**: Staging builds
- **Tag creation**: Release builds

## 🔄 **Variations**

### **Variation 1: Multi-Environment Build**

```javascript
// jobs/cicd/multi-env-build.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";

export default defineJob({
  meta: {
    desc: "Build for multiple environments in parallel",
    tags: ["cicd", "build", "multi-environment"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const environments = payload?.environments || ["development", "staging", "production"];
    
    const buildPromises = environments.map(async (env) => {
      const { default: buildJob } = await import("./build.mjs");
      return buildJob.run({
        ctx,
        payload: { environment: env, buildType: env }
      });
    });
    
    const results = await Promise.allSettled(buildPromises);
    
    const summary = {
      total: environments.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.ok).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value?.ok).length
    };
    
    return {
      ok: summary.failed === 0,
      artifacts: results.flatMap(r => r.value?.artifacts || []),
      data: { summary, results }
    };
  }
});
```

### **Variation 2: Docker Build**

```javascript
// jobs/cicd/docker-build.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default defineJob({
  meta: {
    desc: "Build Docker images with Git-native triggers",
    tags: ["cicd", "build", "docker"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    
    const imageName = payload?.imageName || "myapp";
    const tag = payload?.tag || await git.currentHead();
    const environment = payload?.environment || "production";
    
    const dockerfile = `Dockerfile.${environment}`;
    
    try {
      // Build Docker image
      const result = await execFileAsync("docker", [
        "build",
        "-f", dockerfile,
        "-t", `${imageName}:${tag}`,
        "-t", `${imageName}:latest`,
        "."
      ], { cwd: ctx.root });
      
      ctx.logger.log(`🐳 Docker image built: ${imageName}:${tag}`);
      
      return {
        ok: true,
        artifacts: [],
        data: {
          imageName,
          tag,
          environment,
          dockerfile,
          buildOutput: result.stdout
        }
      };
    } catch (error) {
      ctx.logger.error(`❌ Docker build failed: ${error.message}`);
      throw error;
    }
  }
});
```

## 🎯 **Best Practices**

### **Build Configuration**
- **Environment Variables**: Use environment variables for configuration
- **Build Types**: Define clear build types for different purposes
- **Clean Builds**: Support clean build options
- **Parallel Builds**: Use parallel builds when possible

### **Error Handling**
- **Critical Failures**: Stop on test and lint failures
- **Non-Critical Failures**: Continue on non-critical failures
- **Detailed Logging**: Log all build steps and results
- **Error Recovery**: Implement error recovery mechanisms

### **Build Artifacts**
- **Comprehensive Reports**: Generate detailed build reports
- **Multiple Formats**: Support multiple output formats
- **Artifact Storage**: Store build artifacts appropriately
- **Version Control**: Track build artifacts in version control

## 🔗 **Related Recipes**

- [Deployment Pipelines](./deployment-pipelines.md) - Automated deployment
- [Testing Automation](./testing-automation.md) - Automated testing
- [Quality Gates](./quality-gates.md) - Automated quality checks

## 📚 **Resources**

- [GitVan CI/CD Guide](../../docs/cicd.md)
- [Build Best Practices](../../docs/build-best-practices.md)
- [Docker Integration](../../docs/docker-integration.md)

## 🤝 **Contributors**

- **Author**: GitVan Team
- **Last Updated**: 2024-09-16
- **Version**: 1.0.0

---

**Next Recipe**: [Deployment Pipelines](./deployment-pipelines.md)
