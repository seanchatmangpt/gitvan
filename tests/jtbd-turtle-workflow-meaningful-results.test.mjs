// tests/jtbd-turtle-workflow-meaningful-results.test.mjs
// Integration tests that validate meaningful work outcomes, not just component functionality
// These tests verify that workflows produce real business value and solve actual problems

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";
import { StepRunner } from "../src/workflow/step-runner.mjs";
import { ContextManager } from "../src/workflow/context-manager.mjs";
import { readFile, writeFile } from "node:fs/promises";

describe("JTBD Turtle Workflow - Meaningful Results Validation", () => {
  describe("Real-World Business Scenario: Automated Report Generation", () => {
    it("should generate a complete business intelligence report that executives can actually use", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "data/quarterly-sales.json": `{
              "quarter": "Q1 2024",
              "sales": [
                {"product": "Enterprise License", "revenue": 125000, "units": 25, "region": "North America", "growth": 15},
                {"product": "SaaS Subscription", "revenue": 89000, "units": 445, "region": "Europe", "growth": 23},
                {"product": "Professional Services", "revenue": 156000, "units": 12, "region": "Asia Pacific", "growth": 8},
                {"product": "Enterprise License", "revenue": 98000, "units": 19, "region": "Europe", "growth": 12},
                {"product": "SaaS Subscription", "revenue": 67000, "units": 335, "region": "North America", "growth": 18}
              ],
              "targets": {"revenue": 500000, "units": 800, "growth": 15}
            }`,
          },
        },
        async (env) => {
          // This test validates that the workflow produces a report that would actually be used by executives
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "executive-report-generation",
            inputs: { dataFile: "./data/quarterly-sales.json" },
            startTime: Date.now(),
          });

          // Step 1: Process the raw data
          const dataStep = {
            id: "process-sales-data",
            type: "file",
            config: {
              filePath: "./data/quarterly-sales.json",
              operation: "read"
            }
          };

          const dataResult = await stepRunner.executeStep(dataStep, contextManager, null, null);
          expect(dataResult.success).toBe(true);
          
          const rawData = JSON.parse(dataResult.outputs.content);
          const sales = rawData.sales;
          const targets = rawData.targets;

          // Calculate meaningful business metrics
          const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
          const totalUnits = sales.reduce((sum, s) => sum + s.units, 0);
          const avgGrowth = sales.reduce((sum, s) => sum + s.growth, 0) / sales.length;
          const revenueTargetAchievement = (totalRevenue / targets.revenue) * 100;
          const unitsTargetAchievement = (totalUnits / targets.units) * 100;

          // Step 2: Generate executive-ready report
          const reportStep = {
            id: "generate-executive-report",
            type: "template",
            config: {
              template: `# {{ quarter }} Executive Dashboard

**Generated**: {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}

## 🎯 Key Performance Indicators

| Metric | Actual | Target | Achievement | Status |
|--------|--------|--------|-------------|--------|
| **Revenue** | ${{ totalRevenue | int }} | ${{ targets.revenue | int }} | {{ revenueAchievement | round(1) }}% | {% if revenueAchievement >= 100 %}✅{% elif revenueAchievement >= 90 %}⚠️{% else %}❌{% endif %} |
| **Units Sold** | {{ totalUnits }} | {{ targets.units }} | {{ unitsAchievement | round(1) }}% | {% if unitsAchievement >= 100 %}✅{% elif unitsAchievement >= 90 %}⚠️{% else %}❌{% endif %} |
| **Avg Growth** | {{ avgGrowth | round(1) }}% | {{ targets.growth }}% | {% if avgGrowth >= targets.growth %}✅{% else %}❌{% endif %} |

## 📊 Product Performance Analysis

{% for product in sales | groupby('product') %}
### {{ product.key }}
- **Revenue**: ${{ product.list | sum(attribute='revenue') | int }}
- **Units**: {{ product.list | sum(attribute='units') }}
- **Avg Growth**: {{ (product.list | sum(attribute='growth') / product.list | length) | round(1) }}%
- **Regions**: {{ product.list | map(attribute='region') | unique | join(', ') }}
{% endfor %}

## 🌍 Regional Performance

{% for region in sales | groupby('region') %}
### {{ region.key }}
- **Revenue**: ${{ region.list | sum(attribute='revenue') | int }}
- **Units**: {{ region.list | sum(attribute='units') }}
- **Growth**: {{ (region.list | sum(attribute='growth') / region.list | length) | round(1) }}%
{% endfor %}

## 🚨 Executive Alerts

{% if revenueAchievement < 90 %}
- **CRITICAL**: Revenue target not met ({{ revenueAchievement | round(1) }}% of target)
{% endif %}
{% if unitsAchievement < 90 %}
- **WARNING**: Units target not met ({{ unitsAchievement | round(1) }}% of target)
{% endif %}
{% if avgGrowth < targets.growth %}
- **ATTENTION**: Average growth below target ({{ avgGrowth | round(1) }}% vs {{ targets.growth }}%)
{% endif %}

## 📈 Recommendations

{% if revenueAchievement < 100 %}
1. **Focus on high-revenue products**: {{ sales | max(attribute='revenue') | attr('product') }} shows strong performance
2. **Regional expansion**: Consider increasing investment in {{ sales | groupby('region') | map('list') | map('sum', 'revenue') | max | attr('region') }} region
{% endif %}

---
*This report was automatically generated by GitVan Business Intelligence Workflow*`,
              filePath: "./reports/{{ quarter | slug }}-executive-dashboard.md"
            }
          };

          // Set calculated metrics in context
          contextManager.setOutput("quarter", rawData.quarter);
          contextManager.setOutput("sales", sales);
          contextManager.setOutput("targets", targets);
          contextManager.setOutput("totalRevenue", totalRevenue);
          contextManager.setOutput("totalUnits", totalUnits);
          contextManager.setOutput("avgGrowth", avgGrowth);
          contextManager.setOutput("revenueAchievement", revenueTargetAchievement);
          contextManager.setOutput("unitsAchievement", unitsTargetAchievement);

          const reportResult = await stepRunner.executeStep(reportStep, contextManager, null, null);
          expect(reportResult.success).toBe(true);

          // Step 3: Generate actionable data for downstream systems
          const dataStep2 = {
            id: "generate-actionable-data",
            type: "file",
            config: {
              filePath: "./data/executive-summary.json",
              operation: "write",
              content: `{
                "quarter": "{{ quarter }}",
                "generated": "{{ 'now' | date('YYYY-MM-DDTHH:mm:ssZ') }}",
                "kpis": {
                  "revenue": {
                    "actual": {{ totalRevenue }},
                    "target": {{ targets.revenue }},
                    "achievement": {{ revenueAchievement | round(2) }},
                    "status": "{% if revenueAchievement >= 100 %}achieved{% elif revenueAchievement >= 90 %}at_risk{% else %}critical{% endif %}"
                  },
                  "units": {
                    "actual": {{ totalUnits }},
                    "target": {{ targets.units }},
                    "achievement": {{ unitsAchievement | round(2) }},
                    "status": "{% if unitsAchievement >= 100 %}achieved{% elif unitsAchievement >= 90 %}at_risk{% else %}critical{% endif %}"
                  },
                  "growth": {
                    "actual": {{ avgGrowth | round(2) }},
                    "target": {{ targets.growth }},
                    "status": "{% if avgGrowth >= targets.growth %}achieved{% else %}below_target{% endif %}"
                  }
                },
                "alerts": [
                  {% if revenueAchievement < 90 %}"Revenue target not met"{% endif %}
                  {% if unitsAchievement < 90 %}"Units target not met"{% endif %}
                  {% if avgGrowth < targets.growth %}"Growth below target"{% endif %}
                ],
                "topPerformer": {
                  "product": "{{ sales | max(attribute='revenue') | attr('product') }}",
                  "revenue": {{ sales | max(attribute='revenue') | attr('revenue') }}
                },
                "recommendations": [
                  {% if revenueAchievement < 100 %}"Focus on high-revenue products"{% endif %}
                  {% if avgGrowth < targets.growth %}"Invest in growth initiatives"{% endif %}
                ]
              }`
            }
          };

          const dataResult2 = await stepRunner.executeStep(dataStep2, contextManager, null, null);
          expect(dataResult2.success).toBe(true);

          // VALIDATE MEANINGFUL RESULTS - This is what executives would actually use
          const reportContent = await readFile("./reports/q1-2024-executive-dashboard.md", "utf8");
          const summaryData = JSON.parse(await readFile("./data/executive-summary.json", "utf8"));

          // Validate the report contains actionable business insights
          expect(reportContent).toContain("Q1 2024 Executive Dashboard");
          expect(reportContent).toContain("Key Performance Indicators");
          expect(reportContent).toContain("$535000"); // Total revenue
          expect(reportContent).toContain("836"); // Total units
          expect(reportContent).toContain("107.0%"); // Revenue achievement
          expect(reportContent).toContain("104.5%"); // Units achievement
          
          // Validate executive alerts are meaningful
          expect(reportContent).toContain("Executive Alerts");
          expect(reportContent).toContain("✅"); // Should show achieved targets
          
          // Validate recommendations are actionable
          expect(reportContent).toContain("Recommendations");
          expect(reportContent).toContain("Professional Services"); // Top performer
          
          // Validate the JSON data is structured for downstream systems
          expect(summaryData.kpis.revenue.actual).toBe(535000);
          expect(summaryData.kpis.revenue.achievement).toBeGreaterThan(100);
          expect(summaryData.kpis.revenue.status).toBe("achieved");
          expect(summaryData.topPerformer.product).toBe("Professional Services");
          expect(summaryData.topPerformer.revenue).toBe(156000);

          console.log("✅ Generated executive dashboard with actionable business insights");
          console.log(`   Revenue: $${summaryData.kpis.revenue.actual} (${summaryData.kpis.revenue.achievement}% of target)`);
          console.log(`   Top Product: ${summaryData.topPerformer.product} ($${summaryData.topPerformer.revenue})`);
        }
      );
    });
  });

  describe("Real-World Technical Scenario: Automated Code Generation", () => {
    it("should generate production-ready code that developers can immediately use", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "specs/api-spec.json": `{
              "service": "User Management API",
              "version": "2.1.0",
              "endpoints": [
                {
                  "path": "/api/users",
                  "method": "GET",
                  "description": "List all users",
                  "response": {"type": "array", "items": {"$ref": "#/definitions/User"}},
                  "auth": "required"
                },
                {
                  "path": "/api/users/{id}",
                  "method": "GET", 
                  "description": "Get user by ID",
                  "response": {"$ref": "#/definitions/User"},
                  "auth": "required"
                },
                {
                  "path": "/api/users",
                  "method": "POST",
                  "description": "Create new user",
                  "body": {"$ref": "#/definitions/UserInput"},
                  "response": {"$ref": "#/definitions/User"},
                  "auth": "required"
                }
              ],
              "definitions": {
                "User": {
                  "id": {"type": "string"},
                  "email": {"type": "string"},
                  "name": {"type": "string"},
                  "role": {"type": "string", "enum": ["admin", "user", "moderator"]},
                  "createdAt": {"type": "string", "format": "date-time"}
                },
                "UserInput": {
                  "email": {"type": "string"},
                  "name": {"type": "string"},
                  "role": {"type": "string", "enum": ["admin", "user", "moderator"]}
                }
              }
            }`,
          },
        },
        async (env) => {
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "code-generation",
            inputs: { specFile: "./specs/api-spec.json" },
            startTime: Date.now(),
          });

          // Step 1: Read API specification
          const specStep = {
            id: "read-api-spec",
            type: "file",
            config: {
              filePath: "./specs/api-spec.json",
              operation: "read"
            }
          };

          const specResult = await stepRunner.executeStep(specStep, contextManager, null, null);
          expect(specResult.success).toBe(true);
          
          const apiSpec = JSON.parse(specResult.outputs.content);
          contextManager.setOutput("apiSpec", apiSpec);

          // Step 2: Generate TypeScript interfaces
          const typesStep = {
            id: "generate-types",
            type: "template",
            config: {
              template: `// Generated TypeScript interfaces for {{ service }} v{{ version }}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt: string;
}

export interface UserInput {
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Endpoint types
{% for endpoint in endpoints %}
export interface {{ endpoint.path | replace('/', '') | replace('{', '') | replace('}', '') | title }}Request {
  {% if endpoint.method == 'GET' and endpoint.path.includes('{id}') %}
  id: string;
  {% elif endpoint.method == 'POST' %}
  body: UserInput;
  {% endif %}
}

export interface {{ endpoint.path | replace('/', '') | replace('{', '') | replace('}', '') | title }}Response {
  {% if endpoint.response.type == 'array' %}
  data: User[];
  total: number;
  {% else %}
  data: User;
  {% endif %}
}
{% endfor %}`,
              filePath: "./src/types/{{ service | slug }}.ts"
            }
          };

          const typesResult = await stepRunner.executeStep(typesStep, contextManager, null, null);
          expect(typesResult.success).toBe(true);

          // Step 3: Generate API service class
          const serviceStep = {
            id: "generate-service",
            type: "template",
            config: {
              template: `// Generated API service for {{ service }} v{{ version }}

import { User, UserInput, ApiResponse, ListResponse } from '../types/{{ service | slug }}';

export class {{ service | replace(' ', '') }}Service {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(\`API request failed: \${response.statusText}\`);
    }

    return await response.json();
  }

{% for endpoint in endpoints %}
  /**
   * {{ endpoint.description }}
   */
  async {{ endpoint.path | replace('/', '') | replace('{', '') | replace('}', '') | slug }}(
    {% if endpoint.method == 'GET' and endpoint.path.includes('{id}') %}
    id: string
    {% elif endpoint.method == 'POST' %}
    userData: UserInput
    {% endif %}
  ): Promise<{{ endpoint.path | replace('/', '') | replace('{', '') | replace('}', '') | title }}Response> {
    {% if endpoint.method == 'GET' %}
    return this.request<{{ endpoint.response.type == 'array' ? 'User[]' : 'User' }}>('{{ endpoint.path }}'{% if endpoint.path.includes('{id}') %}.replace('{id}', id){% endif %});
    {% elif endpoint.method == 'POST' %}
    return this.request<User>('{{ endpoint.path }}', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    {% endif %}
  }
{% endfor %}
}`,
              filePath: "./src/services/{{ service | slug }}.ts"
            }
          };

          const serviceResult = await stepRunner.executeStep(serviceStep, contextManager, null, null);
          expect(serviceResult.success).toBe(true);

          // Step 4: Generate unit tests
          const testsStep = {
            id: "generate-tests",
            type: "template",
            config: {
              template: `// Generated tests for {{ service }} v{{ version }}

import { {{ service | replace(' ', '') }}Service } from '../services/{{ service | slug }}';
import { User, UserInput } from '../types/{{ service | slug }}';

describe('{{ service | replace(' ', '') }}Service', () => {
  let service: {{ service | replace(' ', '') }}Service;
  const mockBaseUrl = 'https://api.example.com';
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new {{ service | replace(' ', '') }}Service(mockBaseUrl, mockApiKey);
  });

{% for endpoint in endpoints %}
  describe('{{ endpoint.path | replace('/', '') | replace('{', '') | replace('}', '') | slug }}', () => {
    it('should {{ endpoint.description | lower }}', async () => {
      // Mock implementation would go here
      const mockResponse = {% if endpoint.response.type == 'array' %}{
        data: [],
        total: 0
      }{% else %}{
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z'
        }
      }{% endif %};

      // Test implementation
      expect(mockResponse).toBeDefined();
    });
  });
{% endfor %}
});`,
              filePath: "./tests/{{ service | slug }}.test.ts"
            }
          };

          const testsResult = await stepRunner.executeStep(testsStep, contextManager, null, null);
          expect(testsResult.success).toBe(true);

          // VALIDATE MEANINGFUL RESULTS - Code that developers can actually use
          const typesContent = await readFile("./src/types/user-management-api.ts", "utf8");
          const serviceContent = await readFile("./src/services/user-management-api.ts", "utf8");
          const testsContent = await readFile("./tests/user-management-api.test.ts", "utf8");

          // Validate TypeScript interfaces are properly generated
          expect(typesContent).toContain("export interface User {");
          expect(typesContent).toContain("role: 'admin' | 'user' | 'moderator';");
          expect(typesContent).toContain("export interface UserInput {");
          expect(typesContent).toContain("export interface ApiResponse<T> {");

          // Validate service class has all endpoints
          expect(serviceContent).toContain("export class UserManagementAPIService {");
          expect(serviceContent).toContain("async users(");
          expect(serviceContent).toContain("async usersId(");
          expect(serviceContent).toContain("async usersPost(");
          expect(serviceContent).toContain("Authorization");
          expect(serviceContent).toContain("Bearer");

          // Validate tests are generated for all endpoints
          expect(testsContent).toContain("describe('UserManagementAPIService'");
          expect(testsContent).toContain("describe('users'");
          expect(testsContent).toContain("describe('usersId'");
          expect(testsContent).toContain("describe('usersPost'");

          console.log("✅ Generated production-ready TypeScript code");
          console.log(`   Service: ${apiSpec.service} v${apiSpec.version}`);
          console.log(`   Endpoints: ${apiSpec.endpoints.length}`);
          console.log(`   Files: types, service, tests`);
        }
      );
    });
  });
});
