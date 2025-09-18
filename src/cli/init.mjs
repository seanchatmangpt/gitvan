import { defineCommand } from "citty";
import consola from "consola";
import { join } from "pathe";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize GitVan project with Knowledge Hook Engine support",
  },
  args: {
    cwd: {
      type: "string",
      description: "Working directory",
      default: process.cwd(),
    },
    name: {
      type: "string",
      description: "Project name",
      default: "my-gitvan-project",
    },
    description: {
      type: "string",
      description: "Project description",
      default: "A GitVan-powered project with Knowledge Hook Engine",
    },
  },
  async run({ args }) {
    const cwd = args.cwd || process.cwd();
    const projectName = args.name || "my-gitvan-project";
    const projectDescription =
      args.description || "A GitVan-powered project with Knowledge Hook Engine";

    console.log("🚀 Initializing GitVan project with Knowledge Hook Engine...");
    console.log(`   Project: ${projectName}`);
    console.log(`   Directory: ${cwd}`);

    try {
      // Step 1: Initialize Git repository
      await initializeGit(cwd);

      // Step 2: Initialize npm project
      await initializeNpm(cwd, projectName, projectDescription);

      // Step 3: Create GitVan directory structure
      await createDirectoryStructure(cwd);

      // Step 4: Create GitVan configuration
      await createGitVanConfig(cwd, projectName, projectDescription);

      // Step 5: Initialize Knowledge Graph
      await initializeKnowledgeGraph(cwd, projectName, projectDescription);

      // Step 6: Create sample hooks and workflows
      await createSampleHooks(cwd);

      // Step 7: Create sample workflows
      await createSampleWorkflows(cwd);

      // Step 8: Create sample templates
      await createSampleTemplates(cwd);

      // Step 9: Create package.json scripts
      await createPackageScripts(cwd);

      // Step 10: Install dependencies automatically
      await installDependencies(cwd);

      // Step 11: Verify installation
      await verifyInstallation(cwd);

      console.log("\n🎉 GitVan project initialization complete!");
      console.log("\n📋 Next steps:");
      console.log('   1. Configure Git user: git config user.name "Your Name"');
      console.log(
        '   2. Configure Git email: git config user.email "your@email.com"'
      );
      console.log("   3. Complete setup: gitvan setup");
      console.log("   4. Test hooks: gitvan hooks list");
      console.log("   5. Test workflows: gitvan workflow list");
      console.log("   6. Save changes: gitvan save");
      console.log("\n📚 Documentation:");
      console.log("   • Knowledge Hooks: ./hooks/README.md");
      console.log("   • Workflows: ./workflows/README.md");
      console.log("   • Templates: ./templates/README.md");
      console.log("\nFor more help: gitvan help");
    } catch (error) {
      console.log("\n❌ Initialization failed:");
      console.log("   Error:", error.message);
      console.log("\nYou can try again or run: gitvan help");
      process.exit(1);
    }
  },
});

/**
 * Initialize Git repository
 */
async function initializeGit(cwd) {
  console.log("\n📦 Initializing Git repository...");

  try {
    // Check if already a git repo
    if (existsSync(join(cwd, ".git"))) {
      console.log("   ✅ Git repository already exists");
      return;
    }

    execSync("git init", { cwd, stdio: "pipe" });
    console.log("   ✅ Git repository initialized");

    // Create initial commit
    execSync("git add .", { cwd, stdio: "pipe" });
    execSync('git commit -m "Initial GitVan project setup"', {
      cwd,
      stdio: "pipe",
    });
    console.log("   ✅ Initial commit created");
  } catch (error) {
    console.log("   ⚠️  Git initialization had issues:", error.message);
  }
}

/**
 * Initialize npm project
 */
async function initializeNpm(cwd, projectName, projectDescription) {
  console.log("\n📦 Initializing npm project...");

  try {
    // Check if package.json already exists
    if (existsSync(join(cwd, "package.json"))) {
      console.log("   ✅ package.json already exists");
      return;
    }

    const packageJson = {
      name: projectName,
      version: "1.0.0",
      description: projectDescription,
      type: "module",
      main: "index.js",
      scripts: {
        test: "vitest",
        dev: "gitvan daemon",
        build: "gitvan build",
        hooks: "gitvan hooks",
        workflows: "gitvan workflow",
      },
      keywords: ["gitvan", "automation", "knowledge-hooks", "workflows"],
      author: "",
      license: "MIT",
      dependencies: {
        gitvan: "^2.1.0",
      },
      devDependencies: {
        vitest: "^1.0.0",
      },
    };

    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );
    console.log("   ✅ package.json created");
  } catch (error) {
    console.log("   ⚠️  npm initialization had issues:", error.message);
  }
}

/**
 * Create GitVan directory structure
 */
async function createDirectoryStructure(cwd) {
  console.log("\n📁 Creating GitVan directory structure...");

  const dirs = [
    ".gitvan",
    ".gitvan/packs",
    ".gitvan/state",
    ".gitvan/backups",
    "jobs",
    "events",
    "templates",
    "packs",
    "hooks",
    "workflows",
    "graph",
    "docs",
    "tests",
    "tests/hooks",
    "tests/workflows",
  ];

  for (const dir of dirs) {
    try {
      mkdirSync(join(cwd, dir), { recursive: true });
      console.log(`   ✅ Created: ${dir}`);
    } catch (error) {
      console.log(`   ⚠️  Failed to create ${dir}:`, error.message);
    }
  }
}

/**
 * Create GitVan configuration
 */
async function createGitVanConfig(cwd, projectName, projectDescription) {
  console.log("\n⚙️  Creating GitVan configuration...");

  const configPath = join(cwd, "gitvan.config.js");

  if (existsSync(configPath)) {
    console.log("   ⚠️  gitvan.config.js already exists");
    return;
  }

  const config = `export default {
  // GitVan v2 Configuration with Knowledge Hook Engine
  templates: {
    dirs: ["templates"],
    autoescape: false,
    noCache: true,
  },
  
  jobs: {
    dirs: ["jobs"],
  },
  
  events: {
    dirs: ["events"],
  },
  
  packs: {
    dirs: ["packs", ".gitvan/packs"],
  },
  
  // Knowledge Hook Engine Configuration
  hooks: {
    dirs: ["hooks"],
    autoEvaluate: true,
    evaluationInterval: 30000, // 30 seconds
  },
  
  // Workflow Engine Configuration
  workflows: {
    dirs: ["workflows"],
    autoExecute: false,
    timeout: 300000, // 5 minutes
  },
  
  // Knowledge Graph Configuration
  graph: {
    dirs: ["graph"],
    format: "turtle",
    autoCommit: true,
  },
  
  daemon: {
    enabled: true,
    worktrees: "current",
  },
  
  shell: {
    allow: ["echo", "git", "npm", "pnpm", "yarn"],
  },
  
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
  },
  
  // Auto-install packs on gitvan init
  autoInstall: {
    packs: [
      // Add packs here that should be auto-installed
    ]
  },
  
  // Custom data available in templates
  data: {
    project: {
      name: "${projectName}",
      description: "${projectDescription}",
    },
  },
};
`;

  writeFileSync(configPath, config);
  console.log("   ✅ gitvan.config.js created");
}

/**
 * Initialize Knowledge Graph
 */
async function initializeKnowledgeGraph(cwd, projectName, projectDescription) {
  console.log("\n🧠 Initializing Knowledge Graph...");

  const initTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Project Information
ex:project rdf:type gv:Project ;
    gv:name "${projectName}" ;
    gv:description "${projectDescription}" ;
    gv:version "1.0.0" ;
    gv:createdDate "${new Date().toISOString()}" ;
    gv:status "active" .

# Initial Project State
ex:project-state rdf:type gv:ProjectState ;
    gv:project ex:project ;
    gv:phase "initialization" ;
    gv:lastUpdated "${new Date().toISOString()}" ;
    gv:status "setup-complete" .

# Sample Entities for Testing
ex:test-item-1 rdf:type gv:TestItem ;
    gv:name "Sample Item 1" ;
    gv:status "active" ;
    gv:priority "medium" .

ex:test-item-2 rdf:type gv:TestItem ;
    gv:name "Sample Item 2" ;
    gv:status "pending" ;
    gv:priority "high" .

# Sample Metrics
ex:project-metrics rdf:type gv:ProjectMetrics ;
    gv:project ex:project ;
    gv:totalItems 2 ;
    gv:activeItems 1 ;
    gv:pendingItems 1 ;
    gv:lastCalculated "${new Date().toISOString()}" .
`;

  writeFileSync(join(cwd, "graph", "init.ttl"), initTtl);
  console.log("   ✅ graph/init.ttl created");

  // Create graph README
  const graphReadme = `# Knowledge Graph

This directory contains the Knowledge Graph for your GitVan project.

## Files

- \`init.ttl\` - Initial project knowledge graph
- \`project.ttl\` - Project-specific knowledge
- \`domain.ttl\` - Domain-specific knowledge

## Usage

The Knowledge Graph is automatically loaded by GitVan's Knowledge Hook Engine and can be queried using SPARQL.

## Examples

\`\`\`sparql
# Find all active items
PREFIX gv: <https://gitvan.dev/ontology#>
SELECT ?item ?name WHERE {
    ?item rdf:type gv:TestItem .
    ?item gv:status "active" .
    ?item gv:name ?name .
}
\`\`\`

## Integration

The Knowledge Graph integrates with:
- Knowledge Hooks (predicate evaluation)
- Workflows (data processing)
- Templates (data rendering)
- AI Commands (context provision)
`;

  writeFileSync(join(cwd, "graph", "README.md"), graphReadme);
  console.log("   ✅ graph/README.md created");
}

/**
 * Create sample hooks
 */
async function createSampleHooks(cwd) {
  console.log("\n🎣 Creating sample Knowledge Hooks...");

  // Copy the example hooks we created earlier
  const hooks = [
    {
      name: "version-change.ttl",
      content: `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Version Change Detection Hook
ex:version-change-hook rdf:type gh:Hook ;
    gv:title "Version Change Detection" ;
    gh:hasPredicate ex:version-change-predicate ;
    gh:orderedPipelines ex:version-change-pipeline .

# ResultDelta Predicate - "State Change" Sensor
ex:version-change-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?project ?version ?releaseDate WHERE {
            ?project rdf:type gv:Project .
            ?project gv:version ?version .
            ?project gv:releaseDate ?releaseDate .
        } ORDER BY ?project
    """ ;
    gh:description "Detects when project version information changes between commits" .

# Workflow Pipeline
ex:version-change-pipeline rdf:type op:Pipeline ;
    op:steps ex:notify-team, ex:update-changelog .

# Step 1: Notify Team
ex:notify-team rdf:type gv:TemplateStep ;
    gv:text "Version {{ version }} detected at {{ releaseDate }}" ;
    gv:filePath "./logs/version-changes.log" .

# Step 2: Update Changelog
ex:update-changelog rdf:type gv:TemplateStep ;
    gv:text "## Version {{ version }} - {{ releaseDate }}\\n\\nVersion change detected automatically.\\n" ;
    gv:filePath "./CHANGELOG.md" ;
    gv:dependsOn ex:notify-team .
`,
    },
    {
      name: "critical-issues.ttl",
      content: `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Critical Issue Alert Hook
ex:critical-issues-hook rdf:type gh:Hook ;
    gv:title "Critical Issue Alert" ;
    gh:hasPredicate ex:critical-issues-predicate ;
    gh:orderedPipelines ex:critical-issues-pipeline .

# ASK Predicate - "Condition" Sensor
ex:critical-issues-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:priority "critical" .
            ?item gv:status "open" .
        }
    """ ;
    gh:description "Detects if there are any open critical issues in the system" .

# Workflow Pipeline
ex:critical-issues-pipeline rdf:type op:Pipeline ;
    op:steps ex:create-alert .

# Step 1: Create Alert
ex:create-alert rdf:type gv:TemplateStep ;
    gv:text "🚨 CRITICAL ISSUE DETECTED\\n\\nTime: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}\\nStatus: Action Required\\n" ;
    gv:filePath "./logs/critical-alerts.log" .
`,
    },
  ];

  for (const hook of hooks) {
    writeFileSync(join(cwd, "hooks", hook.name), hook.content);
    console.log(`   ✅ Created: hooks/${hook.name}`);
  }

  // Copy the hooks README
  const hooksReadme = `# Knowledge Hooks

This directory contains Knowledge Hook definitions that demonstrate intelligent automation based on changes in your project's knowledge graph.

## Available Hooks

- \`version-change.ttl\` - Detects project version changes
- \`critical-issues.ttl\` - Monitors for critical issues

## Usage

\`\`\`bash
# List available hooks
gitvan hooks list

# Evaluate all hooks
gitvan hooks evaluate

# Validate a specific hook
gitvan hooks validate version-change-hook
\`\`\`

## Creating New Hooks

1. Create a new \`.ttl\` file in this directory
2. Define your hook using the GitVan ontology
3. Test with \`gitvan hooks validate <hook-name>\`
4. Run evaluation with \`gitvan hooks evaluate\`

## Hook Types

- **ResultDelta** - Detects changes in query results between commits
- **ASK** - Evaluates boolean conditions
- **SELECTThreshold** - Monitors numerical values against thresholds
- **SHACL** - Validates graph conformance against shapes
`;

  writeFileSync(join(cwd, "hooks", "README.md"), hooksReadme);
  console.log("   ✅ hooks/README.md created");
}

/**
 * Create sample workflows
 */
async function createSampleWorkflows(cwd) {
  console.log("\n⚡ Creating sample Workflows...");

  const workflows = [
    {
      name: "data-processing.ttl",
      content: `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Data Processing Workflow
ex:data-processing-workflow rdf:type gh:Hook ;
    gv:title "Data Processing Workflow" ;
    gh:hasPredicate ex:data-processing-predicate ;
    gh:orderedPipelines ex:data-processing-pipeline .

# Predicate - Process when data changes
ex:data-processing-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?item ?name ?status WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name ?name .
            ?item gv:status ?status .
        }
    """ .

# Workflow Pipeline
ex:data-processing-pipeline rdf:type op:Pipeline ;
    op:steps ex:analyze-data, ex:generate-report .

# Step 1: Analyze Data
ex:analyze-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?item) AS ?total) (COUNT(?active) AS ?active) WHERE {
            ?item rdf:type gv:TestItem .
            OPTIONAL { ?active rdf:type gv:TestItem ; gv:status "active" }
        }
    """ ;
    gv:outputMapping '{"total": "total", "active": "active"}' .

# Step 2: Generate Report
ex:generate-report rdf:type gv:TemplateStep ;
    gv:text "Data Processing Report\\n\\nTotal Items: {{ total }}\\nActive Items: {{ active }}\\nGenerated: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}\\n" ;
    gv:filePath "./reports/data-processing.txt" ;
    gv:dependsOn ex:analyze-data .
`,
    },
  ];

  for (const workflow of workflows) {
    writeFileSync(join(cwd, "workflows", workflow.name), workflow.content);
    console.log(`   ✅ Created: workflows/${workflow.name}`);
  }

  // Create workflows README
  const workflowsReadme = `# Workflows

This directory contains Workflow definitions for automated data processing and task execution.

## Available Workflows

- \`data-processing.ttl\` - Processes data changes and generates reports

## Usage

\`\`\`bash
# List available workflows
gitvan workflow list

# Run a specific workflow
gitvan workflow run data-processing-workflow

# Validate a workflow
gitvan workflow validate data-processing-workflow
\`\`\`

## Workflow Steps

- **SparqlStep** - Execute SPARQL queries
- **TemplateStep** - Process templates with data
- **FileStep** - File operations
- **HttpStep** - HTTP requests
- **GitStep** - Git operations

## Dependencies

Workflows support step dependencies to ensure proper execution order.
`;

  writeFileSync(join(cwd, "workflows", "README.md"), workflowsReadme);
  console.log("   ✅ workflows/README.md created");
}

/**
 * Create sample templates
 */
async function createSampleTemplates(cwd) {
  console.log("\n📝 Creating sample Templates...");

  const templates = [
    {
      name: "project-status.njk",
      content: `# Project Status Report

**Project:** {{ project.name }}  
**Description:** {{ project.description }}  
**Generated:** {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}

## Summary

This is a sample GitVan template demonstrating template processing with the Knowledge Hook Engine.

## Data Available

- Project information from gitvan.config.js
- Knowledge graph data from SPARQL queries
- Workflow execution results
- Hook evaluation context

## Usage

Templates can be processed by:
- Workflow steps
- Hook actions
- Manual processing

## Filters

Available filters:
- \`| date(format)\` - Date formatting
- \`| length\` - Array/object length
- \`| tojson\` - JSON serialization
- \`| upper\` - Uppercase conversion
- \`| lower\` - Lowercase conversion
`,
    },
    {
      name: "example.njk",
      content: `Hello {{ name }}!

This is a sample GitVan template.

Project: {{ project.name }}
Description: {{ project.description }}

## Knowledge Graph Integration

Templates can access data from the Knowledge Graph through workflow steps and hook evaluations.

## Dynamic Content

- Current time: {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}
- Project name: {{ project.name | upper }}
- Description length: {{ project.description | length }} characters
`,
    },
  ];

  for (const template of templates) {
    writeFileSync(join(cwd, "templates", template.name), template.content);
    console.log(`   ✅ Created: templates/${template.name}`);
  }

  // Create templates README
  const templatesReadme = `# Templates

This directory contains Nunjucks templates for generating content from your Knowledge Graph data.

## Available Templates

- \`project-status.njk\` - Project status report
- \`example.njk\` - Basic example template

## Usage

Templates are processed by:
- Workflow steps (TemplateStep)
- Hook actions
- Manual processing

## Data Sources

Templates can access:
- Project configuration data
- Knowledge graph data (via SPARQL)
- Workflow execution results
- Hook evaluation context

## Filters

Available Nunjucks filters:
- \`| date(format)\` - Date formatting
- \`| length\` - Array/object length
- \`| tojson\` - JSON serialization
- \`| upper\` - Uppercase conversion
- \`| lower\` - Lowercase conversion
`;

  writeFileSync(join(cwd, "templates", "README.md"), templatesReadme);
  console.log("   ✅ templates/README.md created");
}

/**
 * Create package.json scripts
 */
async function createPackageScripts(cwd) {
  console.log("\n📜 Creating package.json scripts...");

  try {
    const packagePath = join(cwd, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

    packageJson.scripts = {
      ...packageJson.scripts,
      test: "vitest",
      "test:hooks": "vitest tests/hooks/",
      "test:workflows": "vitest tests/workflows/",
      dev: "gitvan daemon",
      build: "gitvan build",
      hooks: "gitvan hooks",
      "hooks:list": "gitvan hooks list",
      "hooks:evaluate": "gitvan hooks evaluate",
      workflows: "gitvan workflow",
      "workflows:list": "gitvan workflow list",
      "workflows:run": "gitvan workflow run",
      setup: "gitvan setup",
      save: "gitvan save",
    };

    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log("   ✅ package.json scripts updated");
  } catch (error) {
    console.log("   ⚠️  Failed to update package.json scripts:", error.message);
  }
}

/**
 * Install dependencies automatically
 */
async function installDependencies(cwd) {
  console.log("\n📦 Installing dependencies...");

  try {
    // Check if node_modules already exists
    if (existsSync(join(cwd, "node_modules"))) {
      console.log("   ✅ Dependencies already installed");
      return;
    }

    // Run npm install
    execSync("npm install", { cwd, stdio: "inherit" });
    console.log("   ✅ Dependencies installed successfully");
  } catch (error) {
    console.log("   ⚠️  Dependency installation had issues:", error.message);
    console.log("   💡 You can run 'npm install' manually later");
  }
}

/**
 * Verify installation
 */
async function verifyInstallation(cwd) {
  console.log("\n🔍 Verifying installation...");

  const checks = [
    { name: "Git repository", path: ".git", type: "directory" },
    { name: "package.json", path: "package.json", type: "file" },
    { name: "gitvan.config.js", path: "gitvan.config.js", type: "file" },
    { name: "Knowledge Graph", path: "graph/init.ttl", type: "file" },
    { name: "Hooks directory", path: "hooks", type: "directory" },
    { name: "Workflows directory", path: "workflows", type: "directory" },
    { name: "Templates directory", path: "templates", type: "directory" },
  ];

  let allGood = true;

  for (const check of checks) {
    const exists = existsSync(join(cwd, check.path));
    if (exists) {
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name} missing`);
      allGood = false;
    }
  }

  if (allGood) {
    console.log("   🎉 All components verified!");
  } else {
    console.log("   ⚠️  Some components missing - check above");
  }
}
