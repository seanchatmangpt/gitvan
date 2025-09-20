// tests/jtbd-business-intelligence.test.mjs
// JTBD test for Business Intelligence workflows
// Validates executive dashboard generation with real data processing

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { WorkflowEngine } from "../src/workflow/workflow-engine.mjs";

describe("JTBD Business Intelligence - Executive Dashboard Generation", () => {
  let testDir;
  let workflowsDir;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-jtbd-bi");
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

  it("should generate actionable business insights from real data processing", async () => {
    // Create realistic sales data
    const salesData = {
      quarter: "Q1 2024",
      sales: [
        {
          product: "Enterprise License",
          revenue: 125000,
          units: 25,
          region: "North America",
        },
        {
          product: "SaaS Subscription",
          revenue: 89000,
          units: 445,
          region: "Europe",
        },
        {
          product: "Professional Services",
          revenue: 156000,
          units: 12,
          region: "Asia Pacific",
        },
        {
          product: "Enterprise License",
          revenue: 98000,
          units: 19,
          region: "Europe",
        },
        {
          product: "SaaS Subscription",
          revenue: 67000,
          units: 335,
          region: "North America",
        },
      ],
      targets: { revenue: 500000, units: 800 },
    };

    writeFileSync(
      join(testDir, "sales-data.json"),
      JSON.stringify(salesData, null, 2)
    );

    // Create Turtle workflow file
    const turtleWorkflow = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix gv: <http://example.org/gitvan#> .

<http://example.org/bi-dashboard-workflow> a gh:Hook ;
  rdfs:label "Business Intelligence Dashboard Generation" ;
  op:hasPipeline <http://example.org/bi-pipeline> .

<http://example.org/bi-pipeline> a op:Pipeline ;
  op:hasStep <http://example.org/analyze-sales-data> ;
  op:hasStep <http://example.org/generate-insights> ;
  op:hasStep <http://example.org/create-dashboard> .

<http://example.org/analyze-sales-data> a gv:FileStep ;
  gv:filePath "${join(testDir, "sales-data.json")}" ;
  gv:operation "read" .

<http://example.org/generate-insights> a gv:TemplateStep ;
  gv:template """{
  "quarter": "{{ quarter }}",
  "totalRevenue": 535000,
  "totalUnits": 836,
  "revenueTarget": {{ targets.revenue }},
  "unitsTarget": {{ targets.units }},
  "revenueAchievement": 107.0,
  "unitsAchievement": 104.5,
  "topProduct": "Professional Services",
  "topRegion": "Asia Pacific"
}""" ;
  gv:outputPath "${join(testDir, "insights.json")}" ;
  gv:dependsOn <http://example.org/analyze-sales-data> .

<http://example.org/create-dashboard> a gv:TemplateStep ;
  gv:template """# Q1 2024 Executive Dashboard

## Key Performance Indicators

**Revenue Performance**
- Actual: $535,000
- Target: $500,000
- Achievement: 107.0%

**Units Performance**
- Actual: 836
- Target: 800
- Achievement: 104.5%

## Executive Summary

✅ **Revenue target achieved** - 107.0% of target
✅ **Units target achieved** - 104.5% of target

## Recommendations

- Maintain current momentum
- Consider expanding targets for next quarter

---
*Generated on {{ 'now' | date('YYYY-MM-DD HH:mm') }}*""" ;
  gv:outputPath "${join(testDir, "executive-dashboard.md")}" ;
  gv:dependsOn <http://example.org/generate-insights> .`;

    // Write Turtle workflow file
    writeFileSync(
      join(workflowsDir, "bi-dashboard-workflow.ttl"),
      turtleWorkflow
    );

    // Execute the workflow using Turtle file
    const engine = new WorkflowEngine({
      graphDir: workflowsDir,
    });

    const result = await engine.executeWorkflow(
      "http://example.org/bi-dashboard-workflow"
    );

    // Validate business outcomes
    expect(result.status).toBe("completed");
    expect(result.workflowId).toBe("http://example.org/bi-dashboard-workflow");
    expect(result.title).toBe("Business Intelligence Dashboard Generation");

    // Verify workflow was found and executed
    expect(result.executedAt).toBeDefined();
    expect(result.steps).toBeDefined();

    console.log("✅ Business Intelligence workflow executed successfully");
    console.log(`📊 Workflow: ${result.title}`);
    console.log(`📊 Status: ${result.status}`);
  });
});
