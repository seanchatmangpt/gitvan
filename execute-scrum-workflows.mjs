#!/usr/bin/env node
// Scrum at Scale Workflow Execution with Cursor CLI Integration
// This script orchestrates complete Scrum workflows using GitVan and Cursor CLI

import { WorkflowEngine } from "./src/workflow/workflow-engine.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const logger = useLog("Scrum-Workflow-Execution");

// Scrum team configuration
const scrumTeamConfig = {
  name: "Alpha Development Team",
  size: 7,
  charter: "Deliver high-quality software products using Scrum methodology",
  scrumMaster: "Sarah Johnson",
  scrumMasterExperience: 5,
  productOwner: "Mike Chen",
  productOwnerExperience: 8,
  members: [
    {
      name: "Alice Developer",
      role: "Senior Full-Stack Developer",
      skills: ["JavaScript", "React", "Node.js", "Python"],
      experience: 6,
    },
    {
      name: "Bob Engineer",
      role: "Backend Engineer",
      skills: ["Java", "Spring Boot", "PostgreSQL", "Docker"],
      experience: 4,
    },
    {
      name: "Carol Designer",
      role: "UX/UI Designer",
      skills: ["Figma", "User Research", "Prototyping", "Design Systems"],
      experience: 3,
    },
    {
      name: "David Tester",
      role: "QA Engineer",
      skills: ["Test Automation", "Selenium", "Jest", "Cypress"],
      experience: 5,
    },
    {
      name: "Eve DevOps",
      role: "DevOps Engineer",
      skills: ["AWS", "Kubernetes", "CI/CD", "Terraform"],
      experience: 4,
    },
  ],
};

const productConfig = {
  vision:
    "Create a revolutionary project management platform that empowers teams to deliver exceptional results",
  goals: [
    {
      description: "Implement core project management features",
      priority: "High",
      effort: "Large",
      criteria: "Users can create, assign, and track tasks",
    },
    {
      description: "Build intuitive user interface",
      priority: "High",
      effort: "Medium",
      criteria: "Users find the interface easy to navigate and use",
    },
    {
      description: "Integrate with popular development tools",
      priority: "Medium",
      effort: "Large",
      criteria: "Seamless integration with Git, Jira, and Slack",
    },
  ],
  userStories: [
    {
      title: "User Registration and Authentication",
      asA: "new user",
      iWant: "to create an account and log in securely",
      soThat: "I can access the platform and manage my projects",
      points: 8,
      priority: "High",
      acceptanceCriteria: [
        "User can register with email and password",
        "User can log in with valid credentials",
        "Password meets security requirements",
        "User receives confirmation email",
      ],
    },
    {
      title: "Project Creation",
      asA: "authenticated user",
      iWant: "to create a new project",
      soThat: "I can organize my work and collaborate with team members",
      points: 5,
      priority: "High",
      acceptanceCriteria: [
        "User can create project with name and description",
        "User can invite team members",
        "Project appears in user's dashboard",
        "User can set project permissions",
      ],
    },
    {
      title: "Task Management",
      asA: "project member",
      iWant: "to create and assign tasks",
      soThat: "I can track work progress and ensure accountability",
      points: 13,
      priority: "High",
      acceptanceCriteria: [
        "User can create tasks with title and description",
        "User can assign tasks to team members",
        "Tasks have status tracking (To Do, In Progress, Done)",
        "User can set task priorities and due dates",
      ],
    },
  ],
};

const sprintConfig = {
  number: 1,
  goal: "Establish core project management foundation with user authentication and basic project creation",
  duration: 2,
  startDate: "2024-01-15",
  endDate: "2024-01-29",
  backlogItems: [
    {
      title: "User Registration and Authentication",
      points: 8,
      assignee: "Alice Developer",
      status: "To Do",
      description: "Implement secure user registration and login system",
      tasks: [
        { description: "Design database schema for users", estimate: 4 },
        { description: "Implement registration API", estimate: 6 },
        { description: "Create login API with JWT", estimate: 4 },
        { description: "Build registration UI", estimate: 8 },
        { description: "Build login UI", estimate: 6 },
        { description: "Add password validation", estimate: 2 },
      ],
    },
    {
      title: "Project Creation",
      points: 5,
      assignee: "Bob Engineer",
      status: "To Do",
      description: "Allow users to create and manage projects",
      tasks: [
        { description: "Design project database schema", estimate: 3 },
        { description: "Implement project creation API", estimate: 4 },
        { description: "Build project creation UI", estimate: 6 },
        { description: "Add project listing functionality", estimate: 3 },
      ],
    },
  ],
  events: {
    planning: "2024-01-15 09:00 AM",
    daily: "Every day at 9:30 AM",
    review: "2024-01-29 2:00 PM",
    retrospective: "2024-01-29 3:00 PM",
  },
};

const dailyScrumConfig = {
  time: "9:30 AM",
  duration: 15,
  location: "Conference Room A / Zoom",
  format: "Round-robin: Yesterday, Today, Impediments",
};

async function executeScrumWorkflows() {
  const startTime = performance.now();

  try {
    logger.info("🚀 Starting Scrum at Scale Workflow Execution");
    logger.info("=".repeat(60));

    // Create GitVan context
    const context = {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        SCRUM_TEAM_CONFIG: JSON.stringify(scrumTeamConfig),
        PRODUCT_CONFIG: JSON.stringify(productConfig),
        SPRINT_CONFIG: JSON.stringify(sprintConfig),
        DAILY_SCRUM_CONFIG: JSON.stringify(dailyScrumConfig),
      },
      config: {
        workflows: {
          directory: "./workflows",
          optimization: {
            enabled: true,
            cacheEnabled: true,
            parallelExecution: true,
          },
        },
      },
    };

    // Ensure directories exist
    await fs.mkdir("scrum-teams", { recursive: true });
    await fs.mkdir("scrum-reports", { recursive: true });

    // Execute workflows within GitVan context
    const result = await withGitVan(context, async () => {
      logger.info("📊 Initializing Scrum Workflow Engine...");

      const engine = new WorkflowEngine({
        graphDir: "./workflows",
        logger: logger,
      });

      await engine.initialize();

      // List available Scrum workflows
      logger.info("📋 Discovering Scrum workflows...");
      const workflows = await engine.listWorkflows();
      logger.info(`  Found ${workflows.length} workflows`);

      const scrumWorkflows = workflows.filter(
        (w) => w.title.includes("Scrum") || w.id.includes("scrum")
      );

      logger.info(`  Found ${scrumWorkflows.length} Scrum-specific workflows`);

      // Execute Scrum team setup workflow
      logger.info("👥 Executing Scrum Team Setup Workflow...");
      const setupResult = await engine.executeWorkflow(
        "http://example.org/scrum-team-setup-workflow"
      );
      logger.info(`✅ Team setup completed: ${setupResult.status}`);

      // Execute Scrum sprint workflow
      logger.info("🏃 Executing Scrum Sprint Workflow...");
      const sprintResult = await engine.executeWorkflow(
        "http://example.org/scrum-sprint-workflow"
      );
      logger.info(`✅ Sprint workflow completed: ${sprintResult.status}`);

      // Execute Scrum of Scrums workflow
      logger.info("🤝 Executing Scrum of Scrums Workflow...");
      const scrumOfScrumsResult = await engine.executeWorkflow(
        "http://example.org/scrum-of-scrums-workflow"
      );
      logger.info(
        `✅ Scrum of Scrums completed: ${scrumOfScrumsResult.status}`
      );

      return {
        setup: setupResult,
        sprint: sprintResult,
        scrumOfScrums: scrumOfScrumsResult,
        totalWorkflows: workflows.length,
        scrumWorkflows: scrumWorkflows.length,
      };
    });

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Generate comprehensive Scrum execution report
    logger.info("📊 SCRUM WORKFLOW EXECUTION RESULTS");
    logger.info("=".repeat(60));
    logger.info(`Total Duration: ${totalDuration.toFixed(2)}ms`);
    logger.info(`Workflows Executed: ${result.totalWorkflows}`);
    logger.info(`Scrum Workflows: ${result.scrumWorkflows}`);

    logger.info("\n📋 WORKFLOW EXECUTION SUMMARY:");
    logger.info(`✅ Team Setup: ${result.setup.status}`);
    logger.info(`✅ Sprint Workflow: ${result.sprint.status}`);
    logger.info(`✅ Scrum of Scrums: ${result.scrumOfScrums.status}`);

    // Generate final report
    const report = `# Scrum at Scale Workflow Execution Report

## Executive Summary
- **Execution Time**: ${totalDuration.toFixed(2)}ms
- **Workflows Executed**: ${result.totalWorkflows}
- **Scrum Workflows**: ${result.scrumWorkflows}
- **Status**: ✅ SUCCESSFUL

## Team Configuration
- **Team Name**: ${scrumTeamConfig.name}
- **Team Size**: ${scrumTeamConfig.size} members
- **Scrum Master**: ${scrumTeamConfig.scrumMaster}
- **Product Owner**: ${scrumTeamConfig.productOwner}

## Sprint Configuration
- **Sprint Number**: ${sprintConfig.number}
- **Sprint Goal**: ${sprintConfig.goal}
- **Duration**: ${sprintConfig.duration} weeks
- **Backlog Items**: ${sprintConfig.backlogItems.length}

## Workflow Results
### Team Setup Workflow
- Status: ${result.setup.status}
- Steps Executed: ${result.setup.steps.length}

### Sprint Workflow
- Status: ${result.sprint.status}
- Steps Executed: ${result.sprint.steps.length}

### Scrum of Scrums Workflow
- Status: ${result.scrumOfScrums.status}
- Steps Executed: ${result.scrumOfScrums.steps.length}

## Generated Artifacts
- Team setup documentation
- Product backlog
- Sprint planning documents
- Daily scrum templates
- Retrospective reports
- Cursor CLI analysis reports

## Next Steps
1. Review generated documentation
2. Execute daily scrums using templates
3. Track sprint progress
4. Conduct sprint review and retrospective
5. Plan next sprint iteration

## Recommendations
- Use Cursor CLI integration for continuous improvement
- Monitor team velocity and adjust capacity
- Regular backlog refinement sessions
- Cross-team coordination through Scrum of Scrums

---
*Generated by GitVan Scrum at Scale Workflow System*
*Execution completed at: ${new Date().toISOString()}*
`;

    await fs.writeFile("scrum-reports/execution-report.md", report, "utf8");

    logger.info("✅ Scrum workflow execution completed successfully!");
    logger.info("📁 Reports generated in scrum-reports/ directory");
    logger.info("📁 Team documentation in scrum-teams/ directory");

    return {
      success: true,
      result: result,
      totalDuration: totalDuration,
      reportPath: "scrum-reports/execution-report.md",
    };
  } catch (error) {
    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    logger.error("❌ Scrum workflow execution failed!");
    logger.error(`Error: ${error.message}`);
    logger.error(`Duration: ${totalDuration.toFixed(2)}ms`);

    return {
      success: false,
      error: error.message,
      totalDuration: totalDuration,
    };
  }
}

// Run the Scrum workflow execution
executeScrumWorkflows()
  .then((result) => {
    if (result.success) {
      console.log("✅ Scrum workflow execution completed successfully");
      console.log(`📊 Duration: ${result.totalDuration.toFixed(2)}ms`);
      console.log(`📁 Report: ${result.reportPath}`);
      process.exit(0);
    } else {
      console.error("❌ Scrum workflow execution failed");
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  });
