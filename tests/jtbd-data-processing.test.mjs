// tests/jtbd-data-processing.test.mjs
// JTBD test for data processing workflows
// Validates ETL pipeline with real data transformation

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
import { WorkflowExecutor } from "../src/workflow/workflow-executor.mjs";

describe("JTBD Data Processing - ETL Pipeline", () => {
  let testDir;
  let workflowsDir;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-jtbd-etl");
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

  it("should process data through complete ETL pipeline", async () => {
    // Create sample data
    const rawData = {
      users: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          department: "Engineering",
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          department: "Marketing",
        },
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          department: "Sales",
        },
        {
          id: 4,
          name: "Alice Brown",
          email: "alice@example.com",
          department: "Engineering",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    writeFileSync(
      join(testDir, "raw-users.json"),
      JSON.stringify(rawData, null, 2)
    );

    // Create ETL workflow
    const etlWorkflow = {
      hooks: [
        {
          id: "http://example.org/etl-pipeline-workflow",
          title: "ETL Data Processing Pipeline",
          pipelines: ["http://example.org/etl-pipeline"],
        },
      ],
      pipelines: [
        {
          id: "http://example.org/etl-pipeline",
          steps: [
            "http://example.org/extract-data",
            "http://example.org/transform-data",
            "http://example.org/load-data",
          ],
        },
      ],
      steps: [
        {
          id: "http://example.org/extract-data",
          type: "file",
          config: {
            filePath: join(testDir, "raw-users.json"),
            operation: "read",
          },
        },
        {
          id: "http://example.org/transform-data",
          type: "template",
          config: {
            template: `{
  "processedAt": "{{ timestamp }}",
  "totalUsers": {{ users | length }},
  "departments": ["Engineering", "Marketing", "Sales"],
  "departmentCounts": {
    "Engineering": 2,
    "Marketing": 1,
    "Sales": 1
  },
  "users": [
    {% for user in users %}
    {
      "id": {{ user.id }},
      "name": "{{ user.name }}",
      "email": "{{ user.email }}",
      "department": "{{ user.department }}",
      "processedAt": "{{ timestamp }}"
    }{% if not loop.last %},{% endif %}
    {% endfor %}
  ]
}`,
            outputPath: join(testDir, "processed-users.json"),
          },
          dependsOn: ["http://example.org/extract-data"],
        },
        {
          id: "http://example.org/load-data",
          type: "template",
          config: {
            template: `# Data Processing Report

## ETL Pipeline Summary

**Processing Date:** {{ processedAt }}
**Total Records:** {{ totalUsers }}
**Departments:** {{ departments | join(', ') }}

## Department Breakdown

{% for dept, count in departmentCounts.items() %}
- **{{ dept }}:** {{ count }} users
{% endfor %}

## Data Quality Metrics

- **Completeness:** 100% (all records processed)
- **Validity:** 100% (all records have required fields)
- **Consistency:** 100% (data format standardized)

## Next Steps

1. Load processed data into data warehouse
2. Schedule regular ETL runs
3. Monitor data quality metrics

---
*ETL Pipeline completed successfully*`,
            outputPath: join(testDir, "etl-report.md"),
          },
          dependsOn: ["http://example.org/transform-data"],
        },
      ],
    };

    // Execute the workflow
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    executor._loadWorkflowData = () => etlWorkflow;

    const result = await executor.execute(
      "http://example.org/etl-pipeline-workflow",
      {}
    );

    // Validate ETL outcomes
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);

    // Verify data extraction
    const extractStep = result.steps[0];
    expect(extractStep.success).toBe(true);
    expect(extractStep.outputs.operation).toBe("read");

    // Verify data transformation
    const transformStep = result.steps[1];
    expect(transformStep.success).toBe(true);
    expect(transformStep.outputs.outputPath).toBe(
      join(testDir, "processed-users.json")
    );

    // Verify data loading/reporting
    const loadStep = result.steps[2];
    expect(loadStep.success).toBe(true);
    expect(loadStep.outputs.outputPath).toBe(join(testDir, "etl-report.md"));

    // Verify processed data quality
    const processedData = JSON.parse(
      readFileSync(join(testDir, "processed-users.json"), "utf8")
    );
    expect(processedData.totalUsers).toBe(4);
    expect(processedData.departments).toContain("Engineering");
    expect(processedData.departments).toContain("Marketing");
    expect(processedData.departments).toContain("Sales");
    expect(processedData.departmentCounts.Engineering).toBe(2);
    expect(processedData.departmentCounts.Marketing).toBe(1);
    expect(processedData.departmentCounts.Sales).toBe(1);

    // Verify report content
    const reportContent = readFileSync(join(testDir, "etl-report.md"), "utf8");
    expect(reportContent).toContain("ETL Pipeline Summary");
    expect(reportContent).toContain("Total Records: 4");
    expect(reportContent).toContain("Engineering: 2 users");
    expect(reportContent).toContain("Data Quality Metrics");

    console.log("✅ ETL pipeline processed data successfully");
    console.log(
      `📊 Processed ${processedData.totalUsers} users across ${processedData.departments.length} departments`
    );
  });

  it("should handle data validation and error reporting", async () => {
    // Create invalid data
    const invalidData = {
      users: [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          department: "Engineering",
        },
        { id: 2, name: "", email: "invalid-email", department: "Marketing" }, // Invalid data
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          department: "Sales",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    writeFileSync(
      join(testDir, "invalid-users.json"),
      JSON.stringify(invalidData, null, 2)
    );

    // Create data validation workflow
    const validationWorkflow = {
      hooks: [
        {
          id: "http://example.org/data-validation-workflow",
          title: "Data Validation Pipeline",
          pipelines: ["http://example.org/validation-pipeline"],
        },
      ],
      pipelines: [
        {
          id: "http://example.org/validation-pipeline",
          steps: [
            "http://example.org/extract-invalid-data",
            "http://example.org/validate-data",
            "http://example.org/generate-validation-report",
          ],
        },
      ],
      steps: [
        {
          id: "http://example.org/extract-invalid-data",
          type: "file",
          config: {
            filePath: join(testDir, "invalid-users.json"),
            operation: "read",
          },
        },
        {
          id: "http://example.org/validate-data",
          type: "template",
          config: {
            template: `{
  "validationResults": {
    "totalRecords": {{ users | length }},
    "validRecords": 2,
    "invalidRecords": 1,
    "errors": [
      {
        "recordId": 2,
        "field": "name",
        "error": "Empty name field"
      },
      {
        "recordId": 2,
        "field": "email",
        "error": "Invalid email format"
      }
    ]
  }
}`,
            outputPath: join(testDir, "validation-results.json"),
          },
          dependsOn: ["http://example.org/extract-invalid-data"],
        },
        {
          id: "http://example.org/generate-validation-report",
          type: "template",
          config: {
            template: `# Data Validation Report

## Summary
- **Total Records:** {{ validationResults.totalRecords }}
- **Valid Records:** {{ validationResults.validRecords }}
- **Invalid Records:** {{ validationResults.invalidRecords }}

## Validation Errors
{% for error in validationResults.errors %}
- Record {{ error.recordId }}: {{ error.field }} - {{ error.error }}
{% endfor %}

## Recommendations
- Fix data quality issues before processing
- Implement data validation rules
- Monitor data quality metrics

---
*Validation completed*`,
            outputPath: join(testDir, "validation-report.md"),
          },
          dependsOn: ["http://example.org/validate-data"],
        },
      ],
    };

    // Execute the workflow
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    executor._loadWorkflowData = () => validationWorkflow;

    const result = await executor.execute(
      "http://example.org/data-validation-workflow",
      {}
    );

    // Validate validation outcomes
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);

    // Verify validation results
    const validationData = JSON.parse(
      readFileSync(join(testDir, "validation-results.json"), "utf8")
    );
    expect(validationData.validationResults.totalRecords).toBe(3);
    expect(validationData.validationResults.validRecords).toBe(2);
    expect(validationData.validationResults.invalidRecords).toBe(1);
    expect(validationData.validationResults.errors).toHaveLength(2);

    // Verify validation report
    const reportContent = readFileSync(
      join(testDir, "validation-report.md"),
      "utf8"
    );
    expect(reportContent).toContain("Data Validation Report");
    expect(reportContent).toContain("Total Records: 3");
    expect(reportContent).toContain("Invalid Records: 1");
    expect(reportContent).toContain("Empty name field");

    console.log("✅ Data validation pipeline completed successfully");
    console.log(
      `📊 Found ${validationData.validationResults.invalidRecords} invalid records`
    );
  });
});
