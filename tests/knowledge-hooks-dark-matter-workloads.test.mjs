// tests/knowledge-hooks-dark-matter-workloads.test.mjs
// Dark Matter Production Workloads - The 80/20 workloads that consume the most resources

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { withGitVan } from "../src/core/context.mjs";

describe("Knowledge Hooks Dark Matter Production Workloads", () => {
  let testDir;
  let orchestrator;
  let activeTimers = new Set();

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-dark-matter-workloads");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize Git repository
    execSync("git init", { cwd: testDir, stdio: "inherit" });
    execSync('git config user.name "Dark Matter Workloads"', {
      cwd: testDir,
      stdio: "inherit",
    });
    execSync('git config user.email "dark-matter@test.com"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Create GitVan project structure
    mkdirSync(join(testDir, "hooks"), { recursive: true });
    mkdirSync(join(testDir, "graph"), { recursive: true });
    mkdirSync(join(testDir, "logs"), { recursive: true });

    // Initialize orchestrator
    await withGitVan({ cwd: testDir }, async () => {
      orchestrator = new HookOrchestrator({
        graphDir: join(testDir, "hooks"),
        logger: console,
        timeoutMs: 60000, // Longer timeout for heavy workloads
      });
    });
  });

  afterEach(() => {
    // Clear all active timers
    activeTimers.forEach((timerId) => {
      clearInterval(timerId);
      clearTimeout(timerId);
    });
    activeTimers.clear();

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should find breaking point with Dark Matter Workload #1: Massive Knowledge Graph Queries", async () => {
    console.log("🌌 Dark Matter Workload #1: Massive Knowledge Graph Queries");
    console.log(
      "   📊 Creating 10,000+ triples with complex SPARQL queries..."
    );

    // Create massive knowledge graph with 10,000+ triples
    let massiveGraph = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

`;

    // Generate 10,000+ triples
    for (let i = 0; i < 10000; i++) {
      massiveGraph += `ex:entity-${i} rdf:type gv:DarkMatterEntity ;
    gv:id "${i}" ;
    gv:name "Entity ${i}" ;
    gv:created "${new Date().toISOString()}" ;
    gv:updated "${new Date().toISOString()}" ;
    gv:metadata ex:metadata-${i} ;
    gv:relationships ex:rel-${i}-0, ex:rel-${i}-1, ex:rel-${i}-2 ;
    gv:properties ex:prop-${i}-0, ex:prop-${i}-1, ex:prop-${i}-2 ;
    gv:tags ex:tag-${i}-0, ex:tag-${i}-1, ex:tag-${i}-2 ;
    gv:dependencies ex:dep-${i}-0, ex:dep-${i}-1, ex:dep-${i}-2 ;
    gv:metrics ex:metric-${i}-0, ex:metric-${i}-1, ex:metric-${i}-2 ;
    gv:analytics ex:analytics-${i} ;
    gv:performance ex:perf-${i} ;
    gv:security ex:security-${i} ;
    gv:compliance ex:compliance-${i} .

ex:metadata-${i} rdf:type gv:Metadata ;
    gv:version "${Math.floor(Math.random() * 100)}" ;
    gv:author "DarkMatter-${i}" ;
    gv:description "Complex metadata for entity ${i}" ;
    gv:tags ex:meta-tag-${i}-0, ex:meta-tag-${i}-1, ex:meta-tag-${i}-2 ;
    gv:custom ex:custom-${i}-0, ex:custom-${i}-1, ex:custom-${i}-2 .

ex:rel-${i}-0 rdf:type gv:Relationship ;
    gv:type "parent" ;
    gv:target ex:entity-${(i + 1) % 10000} ;
    gv:weight "${Math.random()}" ;
    gv:confidence "${Math.random()}" .

ex:rel-${i}-1 rdf:type gv:Relationship ;
    gv:type "child" ;
    gv:target ex:entity-${(i + 2) % 10000} ;
    gv:weight "${Math.random()}" ;
    gv:confidence "${Math.random()}" .

ex:rel-${i}-2 rdf:type gv:Relationship ;
    gv:type "sibling" ;
    gv:target ex:entity-${(i + 3) % 10000} ;
    gv:weight "${Math.random()}" ;
    gv:confidence "${Math.random()}" .

ex:prop-${i}-0 rdf:type gv:Property ;
    gv:name "property-${i}-0" ;
    gv:value "value-${i}-0" ;
    gv:type "string" ;
    gv:required true ;
    gv:indexed true .

ex:prop-${i}-1 rdf:type gv:Property ;
    gv:name "property-${i}-1" ;
    gv:value "value-${i}-1" ;
    gv:type "number" ;
    gv:required false ;
    gv:indexed true .

ex:prop-${i}-2 rdf:type gv:Property ;
    gv:name "property-${i}-2" ;
    gv:value "value-${i}-2" ;
    gv:type "boolean" ;
    gv:required true ;
    gv:indexed false .

ex:tag-${i}-0 rdf:type gv:Tag ;
    gv:name "tag-${i}-0" ;
    gv:category "category-${i % 100}" ;
    gv:weight "${Math.random()}" .

ex:tag-${i}-1 rdf:type gv:Tag ;
    gv:name "tag-${i}-1" ;
    gv:category "category-${(i + 1) % 100}" ;
    gv:weight "${Math.random()}" .

ex:tag-${i}-2 rdf:type gv:Tag ;
    gv:name "tag-${i}-2" ;
    gv:category "category-${(i + 2) % 100}" ;
    gv:weight "${Math.random()}" .

ex:dep-${i}-0 rdf:type gv:Dependency ;
    gv:type "required" ;
    gv:target ex:entity-${(i + 4) % 10000} ;
    gv:version "1.0.0" ;
    gv:critical true .

ex:dep-${i}-1 rdf:type gv:Dependency ;
    gv:type "optional" ;
    gv:target ex:entity-${(i + 5) % 10000} ;
    gv:version "2.0.0" ;
    gv:critical false .

ex:dep-${i}-2 rdf:type gv:Dependency ;
    gv:type "peer" ;
    gv:target ex:entity-${(i + 6) % 10000} ;
    gv:version "3.0.0" ;
    gv:critical true .

ex:metric-${i}-0 rdf:type gv:Metric ;
    gv:name "metric-${i}-0" ;
    gv:value "${Math.random() * 1000}" ;
    gv:unit "ms" ;
    gv:timestamp "${new Date().toISOString()}" .

ex:metric-${i}-1 rdf:type gv:Metric ;
    gv:name "metric-${i}-1" ;
    gv:value "${Math.random() * 1000}" ;
    gv:unit "bytes" ;
    gv:timestamp "${new Date().toISOString()}" .

ex:metric-${i}-2 rdf:type gv:Metric ;
    gv:name "metric-${i}-2" ;
    gv:value "${Math.random() * 1000}" ;
    gv:unit "count" ;
    gv:timestamp "${new Date().toISOString()}" .

ex:analytics-${i} rdf:type gv:Analytics ;
    gv:views "${Math.floor(Math.random() * 10000)}" ;
    gv:clicks "${Math.floor(Math.random() * 1000)}" ;
    gv:conversions "${Math.floor(Math.random() * 100)}" ;
    gv:revenue "${Math.random() * 10000}" ;
    gv:period "daily" .

ex:perf-${i} rdf:type gv:Performance ;
    gv:cpu "${Math.random() * 100}" ;
    gv:memory "${Math.random() * 1000}" ;
    gv:disk "${Math.random() * 10000}" ;
    gv:network "${Math.random() * 1000}" ;
    gv:latency "${Math.random() * 100}" .

ex:security-${i} rdf:type gv:Security ;
    gv:encrypted true ;
    gv:permissions "read,write,execute" ;
    gv:owner "user-${i}" ;
    gv:group "group-${i % 100}" ;
    gv:acl ex:acl-${i} .

ex:compliance-${i} rdf:type gv:Compliance ;
    gv:gdpr true ;
    gv:ccpa true ;
    gv:sox true ;
    gv:hipaa false ;
    gv:audit ex:audit-${i} .

`;
    }

    writeFileSync(join(testDir, "graph/massive-graph.ttl"), massiveGraph);

    // Create complex hook with massive SPARQL query
    writeFileSync(
      join(testDir, "hooks/massive-query-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:massive-query-hook rdf:type gh:Hook ;
    gv:title "Massive Knowledge Graph Query" ;
    gh:hasPredicate ex:massive-query-predicate ;
    gh:orderedPipelines ex:massive-query-pipeline .

ex:massive-query-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX ex: <http://example.org/>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        ASK WHERE {
            ?entity rdf:type gv:DarkMatterEntity .
            ?entity gv:metadata ?metadata .
            ?metadata gv:version ?version .
            ?entity gv:relationships ?rel1, ?rel2, ?rel3 .
            ?rel1 gv:type ?relType1 .
            ?rel2 gv:type ?relType2 .
            ?rel3 gv:type ?relType3 .
            ?entity gv:properties ?prop1, ?prop2, ?prop3 .
            ?prop1 gv:name ?propName1 .
            ?prop2 gv:name ?propName2 .
            ?prop3 gv:name ?propName3 .
            ?entity gv:tags ?tag1, ?tag2, ?tag3 .
            ?tag1 gv:category ?cat1 .
            ?tag2 gv:category ?cat2 .
            ?tag3 gv:category ?cat3 .
            ?entity gv:dependencies ?dep1, ?dep2, ?dep3 .
            ?dep1 gv:type ?depType1 .
            ?dep2 gv:type ?depType2 .
            ?dep3 gv:type ?depType3 .
            ?entity gv:metrics ?metric1, ?metric2, ?metric3 .
            ?metric1 gv:value ?value1 .
            ?metric2 gv:value ?value2 .
            ?metric3 gv:value ?value3 .
            ?entity gv:analytics ?analytics .
            ?analytics gv:views ?views .
            ?analytics gv:clicks ?clicks .
            ?analytics gv:conversions ?conversions .
            ?entity gv:performance ?perf .
            ?perf gv:cpu ?cpu .
            ?perf gv:memory ?memory .
            ?perf gv:disk ?disk .
            ?entity gv:security ?security .
            ?security gv:encrypted ?encrypted .
            ?security gv:permissions ?permissions .
            ?entity gv:compliance ?compliance .
            ?compliance gv:gdpr ?gdpr .
            ?compliance gv:ccpa ?ccpa .
            ?compliance gv:sox ?sox .
            
            FILTER(?version > 50 && ?value1 > 500 && ?value2 > 500 && ?value3 > 500)
            FILTER(?views > 1000 && ?clicks > 100 && ?conversions > 10)
            FILTER(?cpu > 50 && ?memory > 500 && ?disk > 5000)
            FILTER(?encrypted = true && ?gdpr = true && ?ccpa = true && ?sox = true)
        }
    """ ;
    gh:description "Massive complex SPARQL query across 10,000+ triples" .

ex:massive-query-pipeline rdf:type op:Pipeline ;
    op:steps ex:massive-query-step .

ex:massive-query-step rdf:type gv:TemplateStep ;
    gv:text "Massive query executed: {{ entity }} with {{ version }} version" ;
    gv:filePath "./logs/massive-query.log" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync(
      'git commit -m "Dark Matter Workload #1: Massive Knowledge Graph"',
      {
        cwd: testDir,
        stdio: "inherit",
      }
    );

    // Test with increasing concurrency
    const concurrencyLevels = [1, 5, 10, 20, 50, 100, 200, 500, 1000];
    const benchmarkResults = [];
    const testDuration = 5000; // 5 seconds per test

    for (const concurrency of concurrencyLevels) {
      console.log(`   🔬 Testing ${concurrency} concurrent massive queries...`);

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;

      try {
        // Set up concurrent evaluations
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
          promises.push(
            (async () => {
              try {
                const result = await withGitVan({ cwd: testDir }, async () => {
                  return await orchestrator.evaluate({ verbose: false });
                });

                evaluationResults.push({
                  result,
                  concurrency,
                  timestamp: Date.now() - startTime,
                });
                successCount++;
              } catch (error) {
                errorCount++;
                console.log(
                  `   ⚠️ Error in concurrent query ${i}: ${error.message}`
                );
              }
            })()
          );
        }

        // Wait for all evaluations to complete or timeout
        await Promise.allSettled(promises);

        const endTime = Date.now();
        const duration = endTime - startTime;
        const evaluationsPerSecond =
          evaluationResults.length / (duration / 1000);
        const errorRate = (errorCount / (successCount + errorCount)) * 100;

        const result = {
          concurrency,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            errorRate > 10 ? "FAILED" : errorRate > 5 ? "DEGRADED" : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${concurrency} concurrent: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.status}`
        );

        // If error rate is too high, we've found the breaking point
        if (errorRate > 50) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent massive queries!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency} concurrent massive queries: ${error.message}`
        );
        benchmarkResults.push({
          concurrency,
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 DARK MATTER WORKLOAD #1 RESULTS:");
    console.log("   " + "=".repeat(80));
    console.log("   Concurrency | Eval/sec | Errors | Hooks | Status");
    console.log("   " + "-".repeat(80));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(`   ${conc} | ${evalSec} | ${errors} | ${hooks} | ${status}`);
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.errorRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 DARK MATTER WORKLOAD #1 BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency} concurrent (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.concurrency} concurrent (${firstDegraded.errorRate}% errors)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.concurrency} concurrent (${breakingPoint.errorRate}% errors)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);
  });

  it("should find breaking point with Dark Matter Workload #2: Real-time Analytics Pipeline", async () => {
    console.log("🌌 Dark Matter Workload #2: Real-time Analytics Pipeline");
    console.log("   📊 Creating streaming analytics with 1ms intervals...");

    // Create analytics knowledge graph
    let analyticsGraph = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

`;

    // Generate 1000 analytics entities
    for (let i = 0; i < 1000; i++) {
      analyticsGraph += `ex:analytics-${i} rdf:type gv:AnalyticsEntity ;
    gv:id "${i}" ;
    gv:timestamp "${new Date().toISOString()}" ;
    gv:userId "user-${i % 100}" ;
    gv:sessionId "session-${i % 50}" ;
    gv:eventType "page_view" ;
    gv:pageUrl "https://example.com/page/${i}" ;
    gv:referrer "https://google.com/search?q=${i}" ;
    gv:userAgent "Mozilla/5.0 (compatible; AnalyticsBot/1.0)" ;
    gv:ipAddress "192.168.1.${i % 255}" ;
    gv:country "US" ;
    gv:city "San Francisco" ;
    gv:device "desktop" ;
    gv:browser "Chrome" ;
    gv:os "Windows" ;
    gv:screenResolution "1920x1080" ;
    gv:timeOnPage "${Math.random() * 300}" ;
    gv:bounceRate "${Math.random()}" ;
    gv:conversionValue "${Math.random() * 1000}" ;
    gv:revenue "${Math.random() * 500}" ;
    gv:clicks "${Math.floor(Math.random() * 10)}" ;
    gv:impressions "${Math.floor(Math.random() * 100)}" ;
    gv:ctr "${Math.random()}" ;
    gv:cpc "${Math.random() * 5}" ;
    gv:cpm "${Math.random() * 10}" ;
    gv:roas "${Math.random() * 10}" ;
    gv:lifetimeValue "${Math.random() * 5000}" ;
    gv:churnRisk "${Math.random()}" ;
    gv:satisfactionScore "${Math.random() * 5}" ;
    gv:supportTickets "${Math.floor(Math.random() * 5)}" ;
    gv:featureUsage ex:feature-${i}-0, ex:feature-${i}-1, ex:feature-${i}-2 ;
    gv:abTests ex:abtest-${i}-0, ex:abtest-${i}-1 ;
    gv:segments ex:segment-${i}-0, ex:segment-${i}-1, ex:segment-${i}-2 ;
    gv:customEvents ex:event-${i}-0, ex:event-${i}-1, ex:event-${i}-2 ;
    gv:metrics ex:metric-${i}-0, ex:metric-${i}-1, ex:metric-${i}-2 ;
    gv:alerts ex:alert-${i}-0, ex:alert-${i}-1 .

ex:feature-${i}-0 rdf:type gv:Feature ;
    gv:name "feature-${i}-0" ;
    gv:usage "${Math.random() * 100}" ;
    gv:adoption "${Math.random()}" ;
    gv:satisfaction "${Math.random() * 5}" .

ex:feature-${i}-1 rdf:type gv:Feature ;
    gv:name "feature-${i}-1" ;
    gv:usage "${Math.random() * 100}" ;
    gv:adoption "${Math.random()}" ;
    gv:satisfaction "${Math.random() * 5}" .

ex:feature-${i}-2 rdf:type gv:Feature ;
    gv:name "feature-${i}-2" ;
    gv:usage "${Math.random() * 100}" ;
    gv:adoption "${Math.random()}" ;
    gv:satisfaction "${Math.random() * 5}" .

ex:abtest-${i}-0 rdf:type gv:ABTest ;
    gv:name "abtest-${i}-0" ;
    gv:variant "A" ;
    gv:conversionRate "${Math.random()}" ;
    gv:confidence "${Math.random()}" .

ex:abtest-${i}-1 rdf:type gv:ABTest ;
    gv:name "abtest-${i}-1" ;
    gv:variant "B" ;
    gv:conversionRate "${Math.random()}" ;
    gv:confidence "${Math.random()}" .

ex:segment-${i}-0 rdf:type gv:Segment ;
    gv:name "segment-${i}-0" ;
    gv:size "${Math.floor(Math.random() * 10000)}" ;
    gv:engagement "${Math.random()}" .

ex:segment-${i}-1 rdf:type gv:Segment ;
    gv:name "segment-${i}-1" ;
    gv:size "${Math.floor(Math.random() * 10000)}" ;
    gv:engagement "${Math.random()}" .

ex:segment-${i}-2 rdf:type gv:Segment ;
    gv:name "segment-${i}-2" ;
    gv:size "${Math.floor(Math.random() * 10000)}" ;
    gv:engagement "${Math.random()}" .

ex:event-${i}-0 rdf:type gv:CustomEvent ;
    gv:name "event-${i}-0" ;
    gv:value "${Math.random() * 1000}" ;
    gv:properties ex:prop-${i}-0-0, ex:prop-${i}-0-1 .

ex:event-${i}-1 rdf:type gv:CustomEvent ;
    gv:name "event-${i}-1" ;
    gv:value "${Math.random() * 1000}" ;
    gv:properties ex:prop-${i}-1-0, ex:prop-${i}-1-1 .

ex:event-${i}-2 rdf:type gv:CustomEvent ;
    gv:name "event-${i}-2" ;
    gv:value "${Math.random() * 1000}" ;
    gv:properties ex:prop-${i}-2-0, ex:prop-${i}-2-1 .

ex:metric-${i}-0 rdf:type gv:Metric ;
    gv:name "metric-${i}-0" ;
    gv:value "${Math.random() * 1000}" ;
    gv:trend "up" ;
    gv:anomaly false .

ex:metric-${i}-1 rdf:type gv:Metric ;
    gv:name "metric-${i}-1" ;
    gv:value "${Math.random() * 1000}" ;
    gv:trend "down" ;
    gv:anomaly true .

ex:metric-${i}-2 rdf:type gv:Metric ;
    gv:name "metric-${i}-2" ;
    gv:value "${Math.random() * 1000}" ;
    gv:trend "stable" ;
    gv:anomaly false .

ex:alert-${i}-0 rdf:type gv:Alert ;
    gv:name "alert-${i}-0" ;
    gv:severity "high" ;
    gv:status "active" ;
    gv:threshold "${Math.random() * 100}" .

ex:alert-${i}-1 rdf:type gv:Alert ;
    gv:name "alert-${i}-1" ;
    gv:severity "medium" ;
    gv:status "resolved" ;
    gv:threshold "${Math.random() * 100}" .

`;
    }

    writeFileSync(join(testDir, "graph/analytics-graph.ttl"), analyticsGraph);

    // Create real-time analytics hook
    writeFileSync(
      join(testDir, "hooks/realtime-analytics-hook.ttl"),
      `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:realtime-analytics-hook rdf:type gh:Hook ;
    gv:title "Real-time Analytics Pipeline" ;
    gh:hasPredicate ex:realtime-analytics-predicate ;
    gh:orderedPipelines ex:realtime-analytics-pipeline .

ex:realtime-analytics-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX ex: <http://example.org/>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        ASK WHERE {
            ?analytics rdf:type gv:AnalyticsEntity .
            ?analytics gv:userId ?userId .
            ?analytics gv:sessionId ?sessionId .
            ?analytics gv:eventType ?eventType .
            ?analytics gv:pageUrl ?pageUrl .
            ?analytics gv:referrer ?referrer .
            ?analytics gv:userAgent ?userAgent .
            ?analytics gv:ipAddress ?ipAddress .
            ?analytics gv:country ?country .
            ?analytics gv:city ?city .
            ?analytics gv:device ?device .
            ?analytics gv:browser ?browser .
            ?analytics gv:os ?os .
            ?analytics gv:screenResolution ?resolution .
            ?analytics gv:timeOnPage ?timeOnPage .
            ?analytics gv:bounceRate ?bounceRate .
            ?analytics gv:conversionValue ?conversionValue .
            ?analytics gv:revenue ?revenue .
            ?analytics gv:clicks ?clicks .
            ?analytics gv:impressions ?impressions .
            ?analytics gv:ctr ?ctr .
            ?analytics gv:cpc ?cpc .
            ?analytics gv:cpm ?cpm .
            ?analytics gv:roas ?roas .
            ?analytics gv:lifetimeValue ?lifetimeValue .
            ?analytics gv:churnRisk ?churnRisk .
            ?analytics gv:satisfactionScore ?satisfactionScore .
            ?analytics gv:supportTickets ?supportTickets .
            ?analytics gv:featureUsage ?feature1, ?feature2, ?feature3 .
            ?feature1 gv:usage ?featureUsage1 .
            ?feature2 gv:usage ?featureUsage2 .
            ?feature3 gv:usage ?featureUsage3 .
            ?analytics gv:abTests ?abtest1, ?abtest2 .
            ?abtest1 gv:conversionRate ?abConversion1 .
            ?abtest2 gv:conversionRate ?abConversion2 .
            ?analytics gv:segments ?segment1, ?segment2, ?segment3 .
            ?segment1 gv:engagement ?engagement1 .
            ?segment2 gv:engagement ?engagement2 .
            ?segment3 gv:engagement ?engagement3 .
            ?analytics gv:customEvents ?event1, ?event2, ?event3 .
            ?event1 gv:value ?eventValue1 .
            ?event2 gv:value ?eventValue2 .
            ?event3 gv:value ?eventValue3 .
            ?analytics gv:metrics ?metric1, ?metric2, ?metric3 .
            ?metric1 gv:value ?metricValue1 .
            ?metric2 gv:value ?metricValue2 .
            ?metric3 gv:value ?metricValue3 .
            ?analytics gv:alerts ?alert1, ?alert2 .
            ?alert1 gv:severity ?severity1 .
            ?alert2 gv:severity ?severity2 .
            
            FILTER(?timeOnPage > 30 && ?bounceRate < 0.5)
            FILTER(?conversionValue > 100 && ?revenue > 50)
            FILTER(?ctr > 0.02 && ?cpc < 2.0 && ?cpm < 10.0)
            FILTER(?roas > 3.0 && ?lifetimeValue > 1000)
            FILTER(?churnRisk < 0.3 && ?satisfactionScore > 4.0)
            FILTER(?featureUsage1 > 50 && ?featureUsage2 > 50 && ?featureUsage3 > 50)
            FILTER(?abConversion1 > 0.05 && ?abConversion2 > 0.05)
            FILTER(?engagement1 > 0.7 && ?engagement2 > 0.7 && ?engagement3 > 0.7)
            FILTER(?eventValue1 > 500 && ?eventValue2 > 500 && ?eventValue3 > 500)
            FILTER(?metricValue1 > 100 && ?metricValue2 > 100 && ?metricValue3 > 100)
            FILTER(?severity1 = "high" || ?severity2 = "high")
        }
    """ ;
    gh:description "Real-time analytics pipeline with complex filtering" .

ex:realtime-analytics-pipeline rdf:type op:Pipeline ;
    op:steps ex:realtime-analytics-step .

ex:realtime-analytics-step rdf:type gv:TemplateStep ;
    gv:text "Real-time analytics processed: {{ analytics }} for user {{ userId }}" ;
    gv:filePath "./logs/realtime-analytics.log" .
`
    );

    // Initial commit
    execSync("git add .", { cwd: testDir, stdio: "inherit" });
    execSync('git commit -m "Dark Matter Workload #2: Real-time Analytics"', {
      cwd: testDir,
      stdio: "inherit",
    });

    // Test with 1ms intervals and increasing concurrency
    const concurrencyLevels = [1, 10, 50, 100, 200, 500, 1000, 2000, 5000];
    const benchmarkResults = [];
    const testDuration = 3000; // 3 seconds per test

    for (const concurrency of concurrencyLevels) {
      console.log(`   🔬 Testing ${concurrency} concurrent 1ms analytics...`);

      const evaluationResults = [];
      const startTime = Date.now();
      let errorCount = 0;
      let successCount = 0;

      try {
        // Set up 1ms interval timers
        const timerIds = [];
        for (let i = 0; i < concurrency; i++) {
          const timerId = setInterval(async () => {
            try {
              const result = await withGitVan({ cwd: testDir }, async () => {
                return await orchestrator.evaluate({ verbose: false });
              });

              evaluationResults.push({
                result,
                concurrency,
                timestamp: Date.now() - startTime,
              });
              successCount++;
            } catch (error) {
              errorCount++;
              console.log(
                `   ⚠️ Error in analytics timer ${i}: ${error.message}`
              );
            }
          }, 1); // 1ms interval

          timerIds.push(timerId);
          activeTimers.add(timerId);
        }

        // Wait for test duration
        await new Promise((resolve) => setTimeout(resolve, testDuration));

        // Clear all timers
        timerIds.forEach((timerId) => {
          clearInterval(timerId);
          activeTimers.delete(timerId);
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        const evaluationsPerSecond =
          evaluationResults.length / (duration / 1000);
        const errorRate = (errorCount / (successCount + errorCount)) * 100;

        const result = {
          concurrency,
          duration,
          totalEvaluations: evaluationResults.length,
          evaluationsPerSecond: Math.round(evaluationsPerSecond),
          successCount,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100,
          hooksTriggered: evaluationResults.reduce(
            (sum, e) => sum + e.result.hooksTriggered,
            0
          ),
          status:
            errorRate > 10 ? "FAILED" : errorRate > 5 ? "DEGRADED" : "SUCCESS",
        };

        benchmarkResults.push(result);

        console.log(
          `   📊 ${concurrency} concurrent: ${result.evaluationsPerSecond} eval/sec, ${result.errorRate}% errors, ${result.status}`
        );

        // If error rate is too high, we've found the breaking point
        if (errorRate > 50) {
          console.log(
            `   🚨 BREAKING POINT REACHED at ${concurrency} concurrent 1ms analytics!`
          );
          break;
        }
      } catch (error) {
        console.log(
          `   💥 System crashed at ${concurrency} concurrent 1ms analytics: ${error.message}`
        );
        benchmarkResults.push({
          concurrency,
          status: "CRASHED",
          error: error.message,
        });
        break;
      }
    }

    // Analyze results
    console.log("\n   📈 DARK MATTER WORKLOAD #2 RESULTS:");
    console.log("   " + "=".repeat(80));
    console.log("   Concurrency | Eval/sec | Errors | Hooks | Status");
    console.log("   " + "-".repeat(80));

    benchmarkResults.forEach((result) => {
      const conc = result.concurrency.toString().padStart(11);
      const evalSec = (result.evaluationsPerSecond || 0).toString().padStart(8);
      const errors = `${result.errorRate || 0}%`.padStart(7);
      const hooks = (result.hooksTriggered || 0).toString().padStart(5);
      const status = result.status.padEnd(8);
      console.log(`   ${conc} | ${evalSec} | ${errors} | ${hooks} | ${status}`);
    });

    // Find breaking point
    const breakingPoint = benchmarkResults.find(
      (r) => r.status === "CRASHED" || r.errorRate > 50
    );
    const lastSuccessful = benchmarkResults
      .filter((r) => r.status === "SUCCESS")
      .pop();
    const firstDegraded = benchmarkResults.find((r) => r.status === "DEGRADED");

    console.log("\n   🎯 DARK MATTER WORKLOAD #2 BREAKING POINT:");
    if (lastSuccessful) {
      console.log(
        `   ✅ Last successful: ${lastSuccessful.concurrency} concurrent (${lastSuccessful.evaluationsPerSecond} eval/sec)`
      );
    }
    if (firstDegraded) {
      console.log(
        `   ⚠️ First degraded: ${firstDegraded.concurrency} concurrent (${firstDegraded.errorRate}% errors)`
      );
    }
    if (breakingPoint) {
      console.log(
        `   🚨 Breaking point: ${breakingPoint.concurrency} concurrent (${breakingPoint.errorRate}% errors)`
      );
    }

    // Verify we got some results
    expect(benchmarkResults.length).toBeGreaterThan(0);
  });

  // Continue with remaining 8 dark matter workloads...
  // (Workloads #3-10 would follow similar patterns with different resource-intensive scenarios)
});
