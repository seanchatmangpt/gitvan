// tests/jtbd-cicd-automation.test.mjs
// JTBD test for CI/CD automation workflows
// Validates complete deployment pipeline with real command execution

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { WorkflowExecutor } from "../src/workflow/WorkflowExecutor.mjs";

describe("JTBD CI/CD Automation - Deployment Pipeline", () => {
  let testDir;
  let workflowsDir;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-jtbd-cicd");
    mkdirSync(testDir, { recursive: true });

    workflowsDir = join(testDir, "workflows");
    mkdirSync(workflowsDir, { recursive: true });

    // Initialize git repository
    execSync("git init", { stdio: "pipe", cwd: testDir });
    execSync("git config user.email 'test@example.com'", {
      stdio: "pipe",
      cwd: testDir,
    });
    execSync("git config user.name 'Test User'", {
      stdio: "pipe",
      cwd: testDir,
    });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should execute complete deployment pipeline with validation", async () => {
    // Create Turtle workflow file
    const turtleWorkflow = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix gv: <http://example.org/gitvan#> .

<http://example.org/cicd-deployment-workflow> a gh:Hook ;
  rdfs:label "CI/CD Deployment Pipeline" ;
  op:hasPipeline <http://example.org/deployment-pipeline> .

<http://example.org/deployment-pipeline> a op:Pipeline ;
  op:hasStep <http://example.org/run-tests> ;
  op:hasStep <http://example.org/build-application> ;
  op:hasStep <http://example.org/deploy-staging> ;
  op:hasStep <http://example.org/verify-deployment> .

<http://example.org/run-tests> a gv:CliStep ;
  gv:command "echo 'Running tests...' && echo 'All tests passed'" ;
  gv:timeout 10000 .

<http://example.org/build-application> a gv:CliStep ;
  gv:command "echo 'Building application...' && echo 'Build completed successfully'" ;
  gv:timeout 10000 ;
  gv:dependsOn <http://example.org/run-tests> .

<http://example.org/deploy-staging> a gv:CliStep ;
  gv:command "echo 'Deploying to staging...' && echo 'Deployment completed'" ;
  gv:timeout 10000 ;
  gv:dependsOn <http://example.org/build-application> .

<http://example.org/verify-deployment> a gv:HttpStep ;
  gv:url "https://httpbin.org/status/200" ;
  gv:method "GET" ;
  gv:dependsOn <http://example.org/deploy-staging> .`;

    // Write Turtle workflow file
    writeFileSync(join(workflowsDir, "cicd-deployment-workflow.ttl"), turtleWorkflow);

    // Execute the workflow using Turtle file
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    const result = await executor.execute(
      "http://example.org/cicd-deployment-workflow",
      {}
    );

    // Validate CI/CD outcomes
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(4);

    // Verify test execution
    const testStep = result.steps[0];
    expect(testStep.success).toBe(true);
    expect(testStep.outputs.exitCode).toBe(0);
    expect(testStep.outputs.stdout).toContain("All tests passed");

    // Verify build execution
    const buildStep = result.steps[1];
    expect(buildStep.success).toBe(true);
    expect(buildStep.outputs.exitCode).toBe(0);
    expect(buildStep.outputs.stdout).toContain("Build completed successfully");

    // Verify deployment execution
    const deployStep = result.steps[2];
    expect(deployStep.success).toBe(true);
    expect(deployStep.outputs.exitCode).toBe(0);
    expect(deployStep.outputs.stdout).toContain("Deployment completed");

    // Verify deployment verification
    const verifyStep = result.steps[3];
    expect(verifyStep.success).toBe(true);
    expect(verifyStep.outputs.status).toBe(200);

    console.log("✅ CI/CD pipeline executed successfully");
    console.log(`🚀 Deployment pipeline completed in ${result.duration}ms`);
  });

  it("should handle deployment failures gracefully", async () => {
    // Create failing Turtle workflow file
    const failingTurtleWorkflow = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix gv: <http://example.org/gitvan#> .

<http://example.org/failing-cicd-workflow> a gh:Hook ;
  rdfs:label "Failing CI/CD Pipeline" ;
  op:hasPipeline <http://example.org/failing-pipeline> .

<http://example.org/failing-pipeline> a op:Pipeline ;
  op:hasStep <http://example.org/failing-tests> ;
  op:hasStep <http://example.org/skip-build> .

<http://example.org/failing-tests> a gv:CliStep ;
  gv:command "echo 'Tests failed' && exit 1" ;
  gv:timeout 10000 .

<http://example.org/skip-build> a gv:CliStep ;
  gv:command "echo 'Build skipped due to test failure'" ;
  gv:timeout 10000 ;
  gv:dependsOn <http://example.org/failing-tests> .`;

    // Write failing Turtle workflow file
    writeFileSync(join(workflowsDir, "failing-cicd-workflow.ttl"), failingTurtleWorkflow);

    // Execute the workflow using Turtle file
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    const result = await executor.execute(
      "http://example.org/failing-cicd-workflow",
      {}
    );

    // Validate failure handling
    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(2);

    // Verify test failure
    const testStep = result.steps[0];
    expect(testStep.success).toBe(false);
    expect(testStep.outputs.exitCode).toBe(1);
    expect(testStep.outputs.stderr).toContain("Tests failed");

    // Verify build step was skipped
    const buildStep = result.steps[1];
    expect(buildStep.success).toBe(false); // Should fail due to dependency failure

    console.log("✅ CI/CD pipeline handled failures gracefully");
    console.log(`❌ Pipeline failed as expected after ${result.duration}ms`);
  });
});
