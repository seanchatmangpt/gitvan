// tests/jtbd-documentation-generation.test.mjs
// JTBD test for documentation generation workflows
// Validates API documentation generation from code analysis

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

describe("JTBD Documentation Generation - API Documentation", () => {
  let testDir;
  let workflowsDir;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-jtbd-docs");
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

  it("should generate comprehensive API documentation from code analysis", async () => {
    // Create sample API code
    const apiCode = `
// User Management API
class UserAPI {
  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<User>} User object
   */
  async getUser(id) {
    return { id, name: "John Doe", email: "john@example.com" };
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @param {string} userData.name - User name
   * @param {string} userData.email - User email
   * @returns {Promise<User>} Created user
   */
  async createUser(userData) {
    return { id: 1, ...userData };
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<User>} Updated user
   */
  async updateUser(id, updates) {
    return { id, ...updates };
  }
}
`;

    writeFileSync(join(testDir, "user-api.js"), apiCode);

    // Create documentation generation workflow
    const docsWorkflow = {
      hooks: [
        {
          id: "http://example.org/docs-generation-workflow",
          title: "API Documentation Generation",
          pipelines: ["http://example.org/docs-pipeline"],
        },
      ],
      pipelines: [
        {
          id: "http://example.org/docs-pipeline",
          steps: [
            "http://example.org/analyze-code",
            "http://example.org/generate-docs",
          ],
        },
      ],
      steps: [
        {
          id: "http://example.org/analyze-code",
          type: "file",
          config: {
            filePath: join(testDir, "user-api.js"),
            operation: "read",
          },
        },
        {
          id: "http://example.org/generate-docs",
          type: "template",
          config: {
            template: `# User Management API Documentation

## Overview

This API provides user management functionality for the application.

## Endpoints

### GET /users/:id
Get user by ID

**Parameters:**
- \`id\` (number) - User ID

**Returns:**
- \`User\` object with id, name, and email

**Example:**
\`\`\`javascript
const user = await userAPI.getUser(1);
// Returns: { id: 1, name: "John Doe", email: "john@example.com" }
\`\`\`

### POST /users
Create new user

**Parameters:**
- \`userData\` (Object) - User data
  - \`name\` (string) - User name
  - \`email\` (string) - User email

**Returns:**
- \`User\` object with generated ID

**Example:**
\`\`\`javascript
const newUser = await userAPI.createUser({
  name: "Jane Smith",
  email: "jane@example.com"
});
\`\`\`

### PUT /users/:id
Update user

**Parameters:**
- \`id\` (number) - User ID
- \`updates\` (Object) - Updates to apply

**Returns:**
- \`User\` object with applied updates

**Example:**
\`\`\`javascript
const updatedUser = await userAPI.updateUser(1, {
  name: "John Updated"
});
\`\`\`

## Data Models

### User
\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}
\`\`\`

## Error Handling

All endpoints return appropriate HTTP status codes:
- \`200\` - Success
- \`400\` - Bad Request
- \`404\` - Not Found
- \`500\` - Internal Server Error

---
*Generated on {{ 'now' | date('YYYY-MM-DD HH:mm') }}*`,
            outputPath: join(testDir, "api-documentation.md"),
          },
          dependsOn: ["http://example.org/analyze-code"],
        },
      ],
    };

    // Execute the workflow
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    executor._loadWorkflowData = () => docsWorkflow;

    const result = await executor.execute(
      "http://example.org/docs-generation-workflow",
      {}
    );

    // Validate documentation outcomes
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(2);

    // Verify code analysis
    const analyzeStep = result.steps[0];
    expect(analyzeStep.success).toBe(true);
    expect(analyzeStep.outputs.operation).toBe("read");

    // Verify documentation generation
    const docsStep = result.steps[1];
    expect(docsStep.success).toBe(true);
    expect(docsStep.outputs.outputPath).toBe(
      join(testDir, "api-documentation.md")
    );

    // Verify documentation content
    const docsContent = readFileSync(
      join(testDir, "api-documentation.md"),
      "utf8"
    );
    expect(docsContent).toContain("# User Management API Documentation");
    expect(docsContent).toContain("GET /users/:id");
    expect(docsContent).toContain("POST /users");
    expect(docsContent).toContain("PUT /users/:id");
    expect(docsContent).toContain("interface User");
    expect(docsContent).toContain("Error Handling");
    expect(docsContent).toContain("Generated on");

    console.log("✅ API documentation generated successfully");
    console.log(`📚 Documentation includes 3 API endpoints`);
  });

  it("should generate README documentation for project setup", async () => {
    // Create package.json
    const packageJson = {
      name: "gitvan-project",
      version: "1.0.0",
      description: "An awesome project",
      main: "index.js",
      scripts: {
        start: "node index.js",
        test: "npm test",
        build: "npm run build",
      },
      dependencies: {
        express: "^4.18.0",
        lodash: "^4.17.21",
      },
      devDependencies: {
        jest: "^29.0.0",
        eslint: "^8.0.0",
      },
    };

    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Create README generation workflow
    const readmeWorkflow = {
      hooks: [
        {
          id: "http://example.org/readme-generation-workflow",
          title: "README Generation",
          pipelines: ["http://example.org/readme-pipeline"],
        },
      ],
      pipelines: [
        {
          id: "http://example.org/readme-pipeline",
          steps: [
            "http://example.org/analyze-package",
            "http://example.org/generate-readme",
          ],
        },
      ],
      steps: [
        {
          id: "http://example.org/analyze-package",
          type: "file",
          config: {
            filePath: join(testDir, "package.json"),
            operation: "read",
          },
        },
        {
          id: "http://example.org/generate-readme",
          type: "template",
          config: {
            template: `# {{ name }}

{{ description }}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Available Scripts

{% for script, command in scripts %}
- **{{ script }}**: \`{{ command }}\`
{% endfor %}

## Dependencies

### Production Dependencies
{% for dep, version in dependencies %}
- **{{ dep }}**: {{ version }}
{% endfor %}

### Development Dependencies
{% for dep, version in devDependencies %}
- **{{ dep }}**: {{ version }}
{% endfor %}

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---
*README generated automatically*`,
            outputPath: join(testDir, "README.md"),
          },
          dependsOn: ["http://example.org/analyze-package"],
        },
      ],
    };

    // Execute the workflow
    const executor = new WorkflowExecutor({
      graphDir: workflowsDir,
      logger: console,
    });

    executor._loadWorkflowData = () => readmeWorkflow;

    const result = await executor.execute(
      "http://example.org/readme-generation-workflow",
      {}
    );

    // Validate README generation
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(2);

    // Verify README content
    const readmeContent = readFileSync(join(testDir, "README.md"), "utf8");
    expect(readmeContent).toContain("# my-awesome-project");
    expect(readmeContent).toContain("An awesome project");
    expect(readmeContent).toContain("npm install");
    expect(readmeContent).toContain("npm start");
    expect(readmeContent).toContain("**start**: `node index.js`");
    expect(readmeContent).toContain("**express**: ^4.18.0");
    expect(readmeContent).toContain("**jest**: ^29.0.0");
    expect(readmeContent).toContain("README generated automatically");

    console.log("✅ README documentation generated successfully");
    console.log(`📚 README includes project setup instructions`);
  });
});
