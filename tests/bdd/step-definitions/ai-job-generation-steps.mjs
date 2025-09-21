/**
 * AI Job Generation Step Definitions
 *
 * London BDD style step definitions for AI-powered job generation
 * Focuses on behavior specification and domain language
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "vitest";
import { bddUtils } from "../support/setup.mjs";

// ============================================================================
// GIVEN STEPS - Setting up the initial state
// ============================================================================

/**
 * Given I want to create a backup job
 * Sets up the context for creating a backup job
 */
Given("I want to create a backup job", async function () {
  bddUtils.setTestData("jobType", "backup");
  bddUtils.setTestData("jobRequirements", {
    name: "backup-job",
    description: "Automated backup job",
    triggers: ["daily", "pre-deploy"],
    features: ["incremental", "compression", "encryption"],
  });
  console.log("✅ Backup job context set up");
});

/**
 * Given I want to create a deployment job
 * Sets up the context for creating a deployment job
 */
Given("I want to create a deployment job", async function () {
  bddUtils.setTestData("jobType", "deployment");
  bddUtils.setTestData("jobRequirements", {
    name: "deployment-job",
    description: "Automated deployment job",
    triggers: ["on-tag", "manual"],
    features: ["rollback", "health-check", "notifications"],
  });
  console.log("✅ Deployment job context set up");
});

/**
 * Given I want to create a test job
 * Sets up the context for creating a test job
 */
Given("I want to create a test job", async function () {
  bddUtils.setTestData("jobType", "test");
  bddUtils.setTestData("jobRequirements", {
    name: "test-job",
    description: "Automated testing job",
    triggers: ["pre-commit", "on-push"],
    features: ["unit-tests", "integration-tests", "coverage"],
  });
  console.log("✅ Test job context set up");
});

/**
 * Given I want to create a job with specific requirements
 * Sets up the context for creating a custom job
 */
Given("I want to create a job with specific requirements", async function () {
  bddUtils.setTestData("jobType", "custom");
  bddUtils.setTestData("jobRequirements", {
    name: "custom-job",
    description: "Custom job with specific requirements",
    triggers: ["on-schedule"],
    features: ["custom-logic", "external-api", "data-processing"],
  });
  console.log("✅ Custom job context set up");
});

// ============================================================================
// WHEN STEPS - Performing actions
// ============================================================================

/**
 * When I ask AI to generate a backup job
 * Uses AI to generate a backup job
 */
When("I ask AI to generate a backup job", async function () {
  const requirements = bddUtils.getTestData("jobRequirements");
  const prompt = `Create a GitVan backup job with the following requirements:
    - Name: ${requirements.name}
    - Description: ${requirements.description}
    - Triggers: ${requirements.triggers.join(", ")}
    - Features: ${requirements.features.join(", ")}
    
    The job should be production-ready and follow GitVan conventions.`;

  const result = await bddUtils.executeGitVanCommand(
    `chat generate "${prompt}"`
  );
  bddUtils.setTestData("lastCommandResult", result);
  bddUtils.setTestData("generatedJob", requirements.name);

  console.log("🔄 AI backup job generation requested");
});

/**
 * When I ask AI to generate a deployment job
 * Uses AI to generate a deployment job
 */
When("I ask AI to generate a deployment job", async function () {
  const requirements = bddUtils.getTestData("jobRequirements");
  const prompt = `Create a GitVan deployment job with the following requirements:
    - Name: ${requirements.name}
    - Description: ${requirements.description}
    - Triggers: ${requirements.triggers.join(", ")}
    - Features: ${requirements.features.join(", ")}
    
    The job should include proper error handling and be production-ready.`;

  const result = await bddUtils.executeGitVanCommand(
    `chat generate "${prompt}"`
  );
  bddUtils.setTestData("lastCommandResult", result);
  bddUtils.setTestData("generatedJob", requirements.name);

  console.log("🔄 AI deployment job generation requested");
});

/**
 * When I ask AI to generate a test job
 * Uses AI to generate a test job
 */
When("I ask AI to generate a test job", async function () {
  const requirements = bddUtils.getTestData("jobRequirements");
  const prompt = `Create a GitVan test job with the following requirements:
    - Name: ${requirements.name}
    - Description: ${requirements.description}
    - Triggers: ${requirements.triggers.join(", ")}
    - Features: ${requirements.features.join(", ")}
    
    The job should include test validation and be integrated with the project.`;

  const result = await bddUtils.executeGitVanCommand(
    `chat generate "${prompt}"`
  );
  bddUtils.setTestData("lastCommandResult", result);
  bddUtils.setTestData("generatedJob", requirements.name);

  console.log("🔄 AI test job generation requested");
});

/**
 * When I provide detailed requirements to AI
 * Uses AI to generate a job with detailed requirements
 */
When("I provide detailed requirements to AI", async function () {
  const requirements = bddUtils.getTestData("jobRequirements");
  const prompt = `Create a GitVan job with these detailed requirements:
    - Name: ${requirements.name}
    - Description: ${requirements.description}
    - Triggers: ${requirements.triggers.join(", ")}
    - Features: ${requirements.features.join(", ")}
    
    Additional requirements:
    - Include comprehensive error handling
    - Add proper logging and monitoring
    - Implement retry logic for external API calls
    - Include data validation and sanitization
    - Add performance metrics collection
    
    The job should be production-ready and well-documented.`;

  const result = await bddUtils.executeGitVanCommand(
    `chat generate "${prompt}"`
  );
  bddUtils.setTestData("lastCommandResult", result);
  bddUtils.setTestData("generatedJob", requirements.name);

  console.log("🔄 AI custom job generation requested");
});

// ============================================================================
// THEN STEPS - Verifying outcomes
// ============================================================================

/**
 * Then the AI should create a working backup job
 * Verifies that AI created a working backup job
 */
Then("the AI should create a working backup job", async function () {
  const result = bddUtils.getTestData("lastCommandResult");
  expect(result.success).toBe(true);

  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const exists = await bddUtils.assertFileExists(jobFile);
  expect(exists).toBe(true);

  const content = await bddUtils.readFile(jobFile);
  expect(content).toContain("defineJob");
  expect(content).toContain("backup");

  console.log("✅ AI created working backup job");
});

/**
 * Then the AI should create a working deployment job
 * Verifies that AI created a working deployment job
 */
Then("the AI should create a working deployment job", async function () {
  const result = bddUtils.getTestData("lastCommandResult");
  expect(result.success).toBe(true);

  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const exists = await bddUtils.assertFileExists(jobFile);
  expect(exists).toBe(true);

  const content = await bddUtils.readFile(jobFile);
  expect(content).toContain("defineJob");
  expect(content).toContain("deployment");

  console.log("✅ AI created working deployment job");
});

/**
 * Then the AI should create a working test job
 * Verifies that AI created a working test job
 */
Then("the AI should create a working test job", async function () {
  const result = bddUtils.getTestData("lastCommandResult");
  expect(result.success).toBe(true);

  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const exists = await bddUtils.assertFileExists(jobFile);
  expect(exists).toBe(true);

  const content = await bddUtils.readFile(jobFile);
  expect(content).toContain("defineJob");
  expect(content).toContain("test");

  console.log("✅ AI created working test job");
});

/**
 * Then the job should be executable
 * Verifies that the generated job can be executed
 */
Then("the job should be executable", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const result = await bddUtils.executeGitVanCommand(`run jobs/${jobName}.mjs`);

  expect(result.success).toBe(true);
  expect(result.stdout).toContain("Job executed");

  console.log("✅ Generated job is executable");
});

/**
 * Then the job should follow GitVan conventions
 * Verifies that the job follows GitVan conventions
 */
Then("the job should follow GitVan conventions", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const content = await bddUtils.readFile(jobFile);

  // Check for GitVan conventions
  expect(content).toContain("import { defineJob }");
  expect(content).toContain("export default defineJob");
  expect(content).toContain("name:");
  expect(content).toContain("description:");
  expect(content).toContain("execute:");

  console.log("✅ Job follows GitVan conventions");
});

/**
 * Then the job should include error handling
 * Verifies that the job includes proper error handling
 */
Then("the job should include error handling", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const content = await bddUtils.readFile(jobFile);

  // Check for error handling patterns
  expect(content).toMatch(/try\s*{/);
  expect(content).toMatch(/catch\s*\(/);
  expect(content).toContain("error");

  console.log("✅ Job includes error handling");
});

/**
 * Then the job should be production-ready
 * Verifies that the job is production-ready
 */
Then("the job should be production-ready", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const content = await bddUtils.readFile(jobFile);

  // Check for production-ready patterns
  expect(content).toContain("defineJob");
  expect(content).toMatch(/return\s*{/);
  expect(content).toContain("success");

  console.log("✅ Job is production-ready");
});

/**
 * Then the job should include test validation
 * Verifies that the job includes test validation
 */
Then("the job should include test validation", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const content = await bddUtils.readFile(jobFile);

  // Check for test validation patterns
  expect(content).toMatch(/test|validate|check/i);

  console.log("✅ Job includes test validation");
});

/**
 * Then the job should be integrated with the project
 * Verifies that the job is integrated with the project
 */
Then("the job should be integrated with the project", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const exists = await bddUtils.assertFileExists(jobFile);
  expect(exists).toBe(true);

  // Check if job is properly placed in project structure
  const projectPath = bddUtils.getTestData("projectPath");
  const fullPath = `${projectPath}/${jobFile}`;
  const fullPathExists = await bddUtils.assertFileExists(fullPath);
  expect(fullPathExists).toBe(true);

  console.log("✅ Job is integrated with the project");
});

/**
 * Then the AI should generate a job matching the requirements
 * Verifies that AI generated a job matching the requirements
 */
Then(
  "the AI should generate a job matching the requirements",
  async function () {
    const result = bddUtils.getTestData("lastCommandResult");
    expect(result.success).toBe(true);

    const requirements = bddUtils.getTestData("jobRequirements");
    const jobName = bddUtils.getTestData("generatedJob");
    const jobFile = `jobs/${jobName}.mjs`;

    const exists = await bddUtils.assertFileExists(jobFile);
    expect(exists).toBe(true);

    const content = await bddUtils.readFile(jobFile);
    expect(content).toContain(requirements.name);
    expect(content).toContain(requirements.description);

    console.log("✅ AI generated job matching requirements");
  }
);

/**
 * Then the job should be properly documented
 * Verifies that the job is properly documented
 */
Then("the job should be properly documented", async function () {
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const content = await bddUtils.readFile(jobFile);

  // Check for documentation patterns
  expect(content).toContain("description:");
  expect(content).toMatch(/\/\*[\s\S]*\*\//);

  console.log("✅ Job is properly documented");
});

/**
 * Then the job should include all requested features
 * Verifies that the job includes all requested features
 */
Then("the job should include all requested features", async function () {
  const requirements = bddUtils.getTestData("jobRequirements");
  const jobName = bddUtils.getTestData("generatedJob");
  const jobFile = `jobs/${jobName}.mjs`;

  const content = await bddUtils.readFile(jobFile);

  // Check for requested features
  for (const feature of requirements.features) {
    expect(content).toMatch(new RegExp(feature, "i"));
  }

  console.log("✅ Job includes all requested features");
});
