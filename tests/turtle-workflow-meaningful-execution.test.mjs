// Integration tests that validate meaningful turtle workflow execution
// These tests verify that the turtle workflow system produces actual meaningful outputs
import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../../src/composables/test-environment.mjs";
import { useTurtle } from "../../src/composables/turtle.mjs";
import { WorkflowExecutor } from "../../src/workflow/WorkflowExecutor.mjs";
import { StepRunner } from "../../src/workflow/StepRunner.mjs";
import { ContextManager } from "../../src/workflow/ContextManager.mjs";
import { useGraph } from "../../src/composables/graph.mjs";
import { useTemplate } from "../../src/composables/template.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

describe("Turtle Workflow System - Meaningful Work Validation", () => {
  describe("Template Rendering with Real Data", () => {
    it("should render templates with complex data structures and produce meaningful output", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Template Rendering Test\n",
          },
        },
        async (env) => {
          // Test data that represents real workflow data
          const testData = {
            count: 3,
            analyzedCount: 3,
            status: "completed",
            dataItems: [
              { 
                data: { value: "http://example.org/data1" }, 
                source: { value: "database" }, 
                type: { value: "user" }, 
                size: { value: "1024" } 
              },
              { 
                data: { value: "http://example.org/data2" }, 
                source: { value: "api" }, 
                type: { value: "product" }, 
                size: { value: "2048" } 
              },
              { 
                data: { value: "http://example.org/data3" }, 
                source: { value: "file" }, 
                type: { value: "order" }, 
                size: { value: "512" } 
              }
            ],
            analysis: [
              { 
                subject: { value: "http://example.org/data1" }, 
                object: { value: "Analysis of user data (1024 bytes)" } 
              },
              { 
                subject: { value: "http://example.org/data2" }, 
                object: { value: "Analysis of product data (2048 bytes)" } 
              },
              { 
                subject: { value: "http://example.org/data3" }, 
                object: { value: "Analysis of order data (512 bytes)" } 
              }
            ]
          };

          // Test the template from the data-processing workflow
          const templateContent = `# Data Processing Report

**Generated:** {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}

## Summary
- **Total Items Processed:** {{ count }}
- **Items Analyzed:** {{ analyzedCount }}
- **Processing Status:** {{ status }}

## Data Items
{% for item in dataItems %}
### {{ item.data.value | split('/') | last }}
- **Source:** {{ item.source.value }}
- **Type:** {{ item.type.value }}
- **Size:** {{ item.size.value }} bytes
{% endfor %}

## Analysis Results
{% for quad in analysis %}
- **Data:** {{ quad.subject.value | split('/') | last }}
- **Analysis:** {{ quad.object.value }}
{% endfor %}

## Next Steps
1. Review the analysis results
2. Validate data quality
3. Proceed with downstream processing

---
*This report was generated automatically by the GitVan Data Processing Pipeline*`;

          // Test StepRunner template processing
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "test-workflow",
            inputs: testData,
            startTime: Date.now()
          });

          // Create a template step
          const templateStep = {
            id: "test-template-step",
            type: "template",
            config: {
              template: templateContent,
              filePath: "./reports/data-processing-report.md"
            }
          };

          // Execute the template step
          const result = await stepRunner.executeStep(
            templateStep,
            contextManager,
            null, // graph not needed for template step
            null  // turtle not needed for template step
          );

          // Validate execution success
          expect(result.success).toBe(true);
          expect(result.outputs.content).toBeDefined();
          expect(result.outputs.length).toBeGreaterThan(0);

          // Validate template content was properly rendered
          const renderedContent = result.outputs.content;
          expect(renderedContent).toContain("# Data Processing Report");
          expect(renderedContent).toContain("Total Items Processed: 3");
          expect(renderedContent).toContain("Items Analyzed: 3");
          expect(renderedContent).toContain("Processing Status: completed");
          
          // Validate loop processing worked
          expect(renderedContent).toContain("data1");
          expect(renderedContent).toContain("data2");
          expect(renderedContent).toContain("data3");
          expect(renderedContent).toContain("database");
          expect(renderedContent).toContain("api");
          expect(renderedContent).toContain("file");
          expect(renderedContent).toContain("user");
          expect(renderedContent).toContain("product");
          expect(renderedContent).toContain("order");

          // Validate filters worked
          expect(renderedContent).toContain("Analysis of user data (1024 bytes)");
          expect(renderedContent).toContain("Analysis of product data (2048 bytes)");
          expect(renderedContent).toContain("Analysis of order data (512 bytes)");

          // Validate file was created
          const reportContent = await readFile("./reports/data-processing-report.md", "utf8");
          expect(reportContent).toBe(renderedContent);
          expect(reportContent.length).toBeGreaterThan(500);

          console.log("✅ Template rendering produced meaningful, structured content with loops and filters");
        }
      );
    });

    it("should handle simple template scenarios with basic data", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Simple Template Test\n",
          },
        },
        async (env) => {
          // Simple data structure
          const simpleData = {
            users: [
              { name: "John Doe", email: "john@example.com", role: "admin" },
              { name: "Jane Smith", email: "jane@example.com", role: "user" },
              { name: "Bob Johnson", email: "bob@example.com", role: "moderator" }
            ],
            products: [
              { name: "Laptop", price: 999.99, category: "Electronics" },
              { name: "Book", price: 19.99, category: "Education" },
              { name: "Coffee", price: 4.99, category: "Food" }
            ],
            timestamp: "2024-01-15T12:00:00Z",
            totalUsers: 3,
            totalProducts: 3
          };

          // Simple template with basic loops
          const simpleTemplate = `# User and Product Report

**Generated:** {{ timestamp }}

## User Summary
- **Total Users:** {{ totalUsers }}
- **Total Products:** {{ totalProducts }}

## User Details
{% for user in users %}
### {{ user.name }}
- **Email:** {{ user.email }}
- **Role:** {{ user.role }}
{% endfor %}

## Product Details
{% for product in products %}
### {{ product.name }}
- **Price:** ${{ product.price }}
- **Category:** {{ product.category }}
{% endfor %}

---
*Report generated by GitVan Workflow System*`;

          // Test with StepRunner
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "simple-test",
            inputs: simpleData,
            startTime: Date.now()
          });

          const templateStep = {
            id: "simple-template-step",
            type: "template",
            config: {
              template: simpleTemplate,
              filePath: "./reports/simple-report.md"
            }
          };

          const result = await stepRunner.executeStep(
            templateStep,
            contextManager,
            null,
            null
          );

          // Validate execution
          expect(result.success).toBe(true);
          const renderedContent = result.outputs.content;

          // Validate simple template processing
          expect(renderedContent).toContain("# User and Product Report");
          expect(renderedContent).toContain("Total Users: 3");
          expect(renderedContent).toContain("Total Products: 3");

          // Validate user details
          expect(renderedContent).toContain("John Doe");
          expect(renderedContent).toContain("jane@example.com");
          expect(renderedContent).toContain("admin");
          expect(renderedContent).toContain("user");
          expect(renderedContent).toContain("moderator");

          // Validate product details
          expect(renderedContent).toContain("Laptop");
          expect(renderedContent).toContain("$999.99");
          expect(renderedContent).toContain("Electronics");
          expect(renderedContent).toContain("Book");
          expect(renderedContent).toContain("$19.99");
          expect(renderedContent).toContain("Education");

          console.log("✅ Simple template rendering with basic loops and data");
        }
      );
    });
  });

  describe("SPARQL Query Execution", () => {
    it("should execute SPARQL queries and return meaningful data", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "test-data.ttl": `@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:user1 rdf:type ex:User ;
    ex:name "John Doe" ;
    ex:email "john@example.com" ;
    ex:age "30" ;
    ex:department "Engineering" .

ex:user2 rdf:type ex:User ;
    ex:name "Jane Smith" ;
    ex:email "jane@example.com" ;
    ex:age "25" ;
    ex:department "Marketing" .

ex:user3 rdf:type ex:User ;
    ex:name "Bob Johnson" ;
    ex:email "bob@example.com" ;
    ex:age "35" ;
    ex:department "Engineering" .

ex:product1 rdf:type ex:Product ;
    ex:name "Laptop" ;
    ex:price "999.99" ;
    ex:category "Electronics" .

ex:product2 rdf:type ex:Product ;
    ex:name "Book" ;
    ex:price "19.99" ;
    ex:category "Education" .`,
          },
        },
        async (env) => {
          // Load test data
          const testDataContent = await readFile("test-data.ttl", "utf8");
          const store = new (await import("n3")).Store();
          const parser = new (await import("n3")).Parser();
          store.addQuads(parser.parse(testDataContent));

          const graph = useGraph(store);

          // Test meaningful SPARQL queries
          const userQuery = `
            PREFIX ex: <http://example.org/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            
            SELECT ?name ?email ?age ?department WHERE {
                ?user rdf:type ex:User .
                ?user ex:name ?name .
                ?user ex:email ?email .
                ?user ex:age ?age .
                ?user ex:department ?department .
            } ORDER BY ?age DESC
          `;

          const productQuery = `
            PREFIX ex: <http://example.org/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            
            SELECT ?name ?price ?category WHERE {
                ?product rdf:type ex:Product .
                ?product ex:name ?name .
                ?product ex:price ?price .
                ?product ex:category ?category .
            } ORDER BY ?price DESC
          `;

          const departmentQuery = `
            PREFIX ex: <http://example.org/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            
            SELECT ?department (COUNT(?user) AS ?count) WHERE {
                ?user rdf:type ex:User .
                ?user ex:department ?department .
            } GROUP BY ?department ORDER BY ?count DESC
          `;

          // Execute queries
          const userResults = graph.query(userQuery);
          const productResults = graph.query(productQuery);
          const departmentResults = graph.query(departmentQuery);

          // Validate user query results (ordered by age DESC)
          expect(userResults).toHaveLength(3);
          expect(userResults[0].name.value).toBe("Bob Johnson"); // Oldest first
          expect(userResults[0].age.value).toBe("35");
          expect(userResults[0].department.value).toBe("Engineering");
          expect(userResults[1].name.value).toBe("John Doe");
          expect(userResults[1].age.value).toBe("30");
          expect(userResults[2].name.value).toBe("Jane Smith");
          expect(userResults[2].age.value).toBe("25");

          // Validate product query results (ordered by price DESC)
          expect(productResults).toHaveLength(2);
          expect(productResults[0].name.value).toBe("Laptop");
          expect(productResults[0].price.value).toBe("999.99");
          expect(productResults[0].category.value).toBe("Electronics");
          expect(productResults[1].name.value).toBe("Book");
          expect(productResults[1].price.value).toBe("19.99");
          expect(productResults[1].category.value).toBe("Education");

          // Validate department aggregation
          expect(departmentResults).toHaveLength(2);
          const engineeringDept = departmentResults.find(d => d.department.value === "Engineering");
          const marketingDept = departmentResults.find(d => d.department.value === "Marketing");
          expect(engineeringDept.count.value).toBe("2");
          expect(marketingDept.count.value).toBe("1");

          console.log("✅ SPARQL queries returned meaningful, ordered, and aggregated data");
        }
      );
    });
  });

  describe("End-to-End Workflow Execution", () => {
    it("should execute a complete workflow and produce meaningful outputs", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# End-to-End Workflow Test\n",
            "test-data.ttl": `@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:data1 rdf:type ex:DataItem ;
    ex:source "database" ;
    ex:type "user" ;
    ex:size "1024" ;
    ex:status "pending" .

ex:data2 rdf:type ex:DataItem ;
    ex:source "api" ;
    ex:type "product" ;
    ex:size "2048" ;
    ex:status "pending" .

ex:data3 rdf:type ex:DataItem ;
    ex:source "file" ;
    ex:type "order" ;
    ex:size "512" ;
    ex:status "pending" .`,
            "workflows/test-workflow.ttl": `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-workflow rdf:type gh:Hook ;
    gv:title "Test Workflow" ;
    gh:hasPredicate ex:testProcess ;
    gh:orderedPipelines ex:test-pipeline .

ex:test-pipeline rdf:type op:Pipeline ;
    op:steps ex:analyze-data, ex:generate-report, ex:save-results .

ex:analyze-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?item ?source ?type ?size WHERE {
            ?item rdf:type ex:DataItem .
            ?item ex:source ?source .
            ?item ex:type ?type .
            ?item ex:size ?size .
            ?item ex:status "pending" .
        } ORDER BY ?size DESC
    """ ;
    gv:outputMapping '{"dataItems": "results", "count": "results.length"}' .

ex:generate-report rdf:type gv:TemplateStep ;
    gv:text """
        # Data Analysis Report
        
        **Generated:** {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}
        
        ## Summary
        - **Total Items:** {{ count }}
        - **Analysis Status:** completed
        
        ## Data Items
        {% for item in dataItems %}
        ### {{ item.item.value | split('/') | last }}
        - **Source:** {{ item.source.value }}
        - **Type:** {{ item.type.value }}
        - **Size:** {{ item.size.value }} bytes
        {% endfor %}
        
        ## Analysis
        - **Largest Item:** {{ dataItems[0].item.value | split('/') | last }}
        - **Smallest Item:** {{ dataItems[dataItems.length - 1].item.value | split('/') | last }}
        - **Total Size:** {{ dataItems | sum(attribute='size.value') | int }} bytes
        
        ---
        *Generated by GitVan Test Workflow*
    """ ;
    gv:dependsOn ex:analyze-data ;
    gv:filePath "./reports/test-analysis-report.md" ;
    gv:outputMapping '{"reportPath": "outputPath"}' .

ex:save-results rdf:type gv:FileStep ;
    gv:filePath "./output/test-results.json" ;
    gv:operation "write" ;
    gv:content """
        {
            "workflow": "test-workflow",
            "timestamp": "{{ 'now' | date('YYYY-MM-DDTHH:mm:ssZ') }}",
            "summary": {
                "totalItems": {{ count }},
                "status": "completed"
            },
            "dataItems": {{ dataItems | tojson }},
            "reportPath": "{{ reportPath }}"
        }
    """ ;
    gv:dependsOn ex:generate-report ;
    gv:outputMapping '{"outputFile": "path"}' .`,
          },
        },
        async (env) => {
          // Initialize workflow system
          const turtle = await useTurtle({ graphDir: "./workflows" });
          
          // Load test data
          const testDataContent = await readFile("test-data.ttl", "utf8");
          const testStore = new (await import("n3")).Store();
          const parser = new (await import("n3")).Parser();
          testStore.addQuads(parser.parse(testDataContent));

          // Combine workflow and test data
          const combinedStore = new (await import("n3")).Store();
          combinedStore.addQuads(turtle.store.getQuads());
          combinedStore.addQuads(testStore.getQuads());

          const graph = useGraph(combinedStore);

          // Test StepRunner with SPARQL step
          const stepRunner = new StepRunner();
          const contextManager = new ContextManager();
          await contextManager.initialize({
            workflowId: "test-workflow",
            inputs: {},
            startTime: Date.now()
          });

          // Execute SPARQL step
          const sparqlStep = {
            id: "analyze-data",
            type: "sparql",
            config: {
              query: `
                PREFIX ex: <http://example.org/>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                
                SELECT ?item ?source ?type ?size WHERE {
                    ?item rdf:type ex:DataItem .
                    ?item ex:source ?source .
                    ?item ex:type ?type .
                    ?item ex:size ?size .
                    ?item ex:status "pending" .
                } ORDER BY ?size DESC
              `,
              outputMapping: '{"dataItems": "results", "count": "results.length"}'
            }
          };

          const sparqlResult = await stepRunner.executeStep(
            sparqlStep,
            contextManager,
            graph,
            turtle
          );

          expect(sparqlResult.success).toBe(true);
          expect(sparqlResult.outputs.results).toHaveLength(3);
          expect(sparqlResult.outputs.results[0].size.value).toBe("2048"); // Largest first

          // Execute template step
          const templateStep = {
            id: "generate-report",
            type: "template",
            config: {
              template: `# Data Analysis Report

**Generated:** {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}

## Summary
- **Total Items:** {{ count }}
- **Analysis Status:** completed

## Data Items
{% for item in dataItems %}
### {{ item.item.value | split('/') | last }}
- **Source:** {{ item.source.value }}
- **Type:** {{ item.type.value }}
- **Size:** {{ item.size.value }} bytes
{% endfor %}

## Analysis
- **Largest Item:** {{ dataItems[0].item.value | split('/') | last }}
- **Smallest Item:** {{ dataItems[dataItems.length - 1].item.value | split('/') | last }}
- **Total Size:** {{ dataItems | sum(attribute='size.value') | int }} bytes

---
*Generated by GitVan Test Workflow*`,
              filePath: "./reports/test-analysis-report.md",
              outputMapping: '{"reportPath": "outputPath"}'
            }
          };

          const templateResult = await stepRunner.executeStep(
            templateStep,
            contextManager,
            graph,
            turtle
          );

          expect(templateResult.success).toBe(true);
          const reportContent = templateResult.outputs.content;
          expect(reportContent).toContain("# Data Analysis Report");
          expect(reportContent).toContain("Total Items: 3");
          expect(reportContent).toContain("data2"); // Largest item
          expect(reportContent).toContain("data3"); // Smallest item
          expect(reportContent).toContain("Total Size: 3584 bytes");

          // Execute file step
          const fileStep = {
            id: "save-results",
            type: "file",
            config: {
              filePath: "./output/test-results.json",
              operation: "write",
              content: `{
                    "workflow": "test-workflow",
                    "timestamp": "2024-01-15T12:00:00Z",
                    "summary": {
                        "totalItems": {{ count }},
                        "status": "completed"
                    },
                    "dataItems": {{ dataItems | tojson }},
                    "reportPath": "{{ reportPath }}"
                }`,
              outputMapping: '{"outputFile": "path"}'
            }
          };

          const fileResult = await stepRunner.executeStep(
            fileStep,
            contextManager,
            graph,
            turtle
          );

          expect(fileResult.success).toBe(true);

          // Validate files were created
          const reportFile = await readFile("./reports/test-analysis-report.md", "utf8");
          const jsonFile = await readFile("./output/test-results.json", "utf8");

          expect(reportFile).toBe(reportContent);
          expect(jsonFile).toContain('"workflow": "test-workflow"');
          expect(jsonFile).toContain('"totalItems": 3');
          expect(jsonFile).toContain('"status": "completed"');

          console.log("✅ End-to-end workflow execution produced meaningful outputs");
        }
      );
    });
  });
});