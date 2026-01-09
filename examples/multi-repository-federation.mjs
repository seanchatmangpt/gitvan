#!/usr/bin/env node

/**
 * Multi-Repository Federation Example
 *
 * Demonstrates SPARQL federated queries across multiple GitVan instances
 * to aggregate data, compare performance, and discover best practices.
 *
 * Scenarios:
 * 1. Compare performance across repositories
 * 2. Find best-performing pack configurations
 * 3. Aggregate customer metrics across regions
 * 4. Discover organizational patterns
 *
 * Usage:
 *   node examples/multi-repository-federation.mjs
 *
 * @module examples/multi-repository-federation
 */

import { createLogger } from '../src/utils/logger.mjs';

const logger = createLogger('multi-repository-federation');

// ============================================================================
// Simulated SPARQL Federation
// ============================================================================

class FederatedSPARQLClient {
  constructor() {
    this.endpoints = new Map();
  }

  /**
   * Register a SPARQL endpoint
   */
  registerEndpoint(name, url, metadata = {}) {
    this.endpoints.set(name, {
      url,
      ...metadata
    });

    logger.info(`Registered endpoint: ${name} at ${url}`);
  }

  /**
   * Execute federated query
   */
  async query(sparqlQuery) {
    logger.info('Executing federated query');

    // In real implementation, this would use actual SPARQL federation
    // For demo, we simulate the results

    // Parse which services are queried
    const services = this._extractServices(sparqlQuery);

    logger.info(`Query spans ${services.length} endpoints: ${services.join(', ')}`);

    // Simulate query execution time
    await new Promise(resolve => setTimeout(resolve, 100));

    return this._simulateResults(sparqlQuery, services);
  }

  _extractServices(query) {
    const serviceMatches = query.matchAll(/SERVICE\s+<([^>]+)>/g);
    return [...serviceMatches].map(match => match[1]);
  }

  _simulateResults(query, services) {
    // Simulate results based on query pattern
    if (query.includes('perf:avgDuration')) {
      return this._simulatePerformanceComparison();
    } else if (query.includes('pack:rating')) {
      return this._simulatePackComparison();
    } else if (query.includes('revops:totalMRR')) {
      return this._simulateRevenueAggregation();
    } else {
      return [];
    }
  }

  _simulatePerformanceComparison() {
    return [
      {
        repo: 'repo-api-service',
        operation: 'api-request',
        avgDuration: 420,
        p95: 780,
        deploymentFrequency: 'daily'
      },
      {
        repo: 'repo-web-app',
        operation: 'api-request',
        avgDuration: 520,
        p95: 950,
        deploymentFrequency: 'weekly'
      },
      {
        repo: 'repo-mobile-backend',
        operation: 'api-request',
        avgDuration: 380,
        p95: 690,
        deploymentFrequency: 'daily'
      }
    ];
  }

  _simulatePackComparison() {
    return [
      {
        pack: 'database-cache-pro',
        repo: 'repo-api-service',
        rating: 4.8,
        improvement: 0.45,
        installs: 234
      },
      {
        pack: 'database-cache-pro',
        repo: 'repo-web-app',
        rating: 4.6,
        improvement: 0.38,
        installs: 189
      },
      {
        pack: 'redis-optimizer',
        repo: 'repo-mobile-backend',
        rating: 4.7,
        improvement: 0.52,
        installs: 156
      }
    ];
  }

  _simulateRevenueAggregation() {
    return [
      {
        region: 'us-east',
        customerCount: 234,
        totalMRR: 1245000,
        avgChurnRisk: 32.4
      },
      {
        region: 'eu-west',
        customerCount: 189,
        totalMRR: 987000,
        avgChurnRisk: 28.7
      },
      {
        region: 'ap-south',
        customerCount: 156,
        totalMRR: 734000,
        avgChurnRisk: 35.2
      }
    ];
  }
}

// ============================================================================
// Scenario 1: Compare Performance Across Repositories
// ============================================================================

async function scenario1_ComparePerformance(client) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 1: Compare Performance Across Repositories      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Querying performance metrics across all repositories...\n');

  const query = `
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?repo ?operation ?avgDuration ?p95 WHERE {
      # Query each repository's performance endpoint
      {
        SERVICE <https://repo1.example.com/sparql> {
          ?measurement perf:operation ?operation ;
                      perf:avgDuration ?avgDuration ;
                      perf:p95 ?p95 .
          BIND("repo-api-service" AS ?repo)
        }
      }
      UNION
      {
        SERVICE <https://repo2.example.com/sparql> {
          ?measurement perf:operation ?operation ;
                      perf:avgDuration ?avgDuration ;
                      perf:p95 ?p95 .
          BIND("repo-web-app" AS ?repo)
        }
      }
      UNION
      {
        SERVICE <https://repo3.example.com/sparql> {
          ?measurement perf:operation ?operation ;
                      perf:avgDuration ?avgDuration ;
                      perf:p95 ?p95 .
          BIND("repo-mobile-backend" AS ?repo)
        }
      }

      # Filter to specific operation
      FILTER(?operation = "api-request")
    }
    ORDER BY ?avgDuration
  `;

  const results = await client.query(query);

  console.log('📊 Performance Comparison:\n');
  console.log('┌────────────────────────┬──────────────┬─────────────┐');
  console.log('│ Repository             │ Avg Duration │ P95         │');
  console.log('├────────────────────────┼──────────────┼─────────────┤');

  results.forEach(result => {
    const repo = result.repo.padEnd(22);
    const avg = `${result.avgDuration}ms`.padEnd(12);
    const p95 = `${result.p95}ms`;
    console.log(`│ ${repo} │ ${avg} │ ${p95.padEnd(11)} │`);
  });

  console.log('└────────────────────────┴──────────────┴─────────────┘\n');

  // Analysis
  const fastest = results[0];
  const slowest = results[results.length - 1];
  const avgPerformance = results.reduce((sum, r) => sum + r.avgDuration, 0) / results.length;

  console.log('📈 Analysis:');
  console.log(`   Best performer: ${fastest.repo} (${fastest.avgDuration}ms)`);
  console.log(`   Slowest: ${slowest.repo} (${slowest.avgDuration}ms)`);
  console.log(`   Organization average: ${avgPerformance.toFixed(0)}ms`);
  console.log(`   Performance gap: ${slowest.avgDuration - fastest.avgDuration}ms (${((slowest.avgDuration / fastest.avgDuration - 1) * 100).toFixed(1)}%)\n`);

  console.log('💡 Recommendation:');
  console.log(`   Investigate ${fastest.repo} for best practices`);
  console.log(`   Apply learnings to ${slowest.repo} for improvement\n`);
}

// ============================================================================
// Scenario 2: Find Best Pack Configurations
// ============================================================================

async function scenario2_BestPackConfigurations(client) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 2: Find Best-Performing Pack Configurations     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Querying pack performance across organization...\n');

  const query = `
    PREFIX pack: <https://gitvan.dev/pack#>
    PREFIX perf: <https://gitvan.dev/performance#>

    SELECT ?pack ?repo ?rating ?improvement WHERE {
      # Query each repository for pack installations
      {
        SERVICE <https://repo1.example.com/sparql> {
          ?installation pack:pack ?pack ;
                       pack:performanceImprovement ?improvement .
          ?pack pack:rating ?rating .
          BIND("repo-api-service" AS ?repo)
        }
      }
      UNION
      {
        SERVICE <https://repo2.example.com/sparql> {
          ?installation pack:pack ?pack ;
                       pack:performanceImprovement ?improvement .
          ?pack pack:rating ?rating .
          BIND("repo-web-app" AS ?repo)
        }
      }
      UNION
      {
        SERVICE <https://repo3.example.com/sparql> {
          ?installation pack:pack ?pack ;
                       pack:performanceImprovement ?improvement .
          ?pack pack:rating ?rating .
          BIND("repo-mobile-backend" AS ?repo)
        }
      }

      # Only high-rated packs
      FILTER(?rating > 4.5)
    }
    ORDER BY DESC(?improvement)
  `;

  const results = await client.query(query);

  console.log('🎁 High-Impact Packs Across Organization:\n');
  console.log('┌─────────────────────────┬────────────────────────┬────────┬─────────────┐');
  console.log('│ Pack                    │ Repository             │ Rating │ Improvement │');
  console.log('├─────────────────────────┼────────────────────────┼────────┼─────────────┤');

  results.forEach(result => {
    const pack = result.pack.padEnd(23);
    const repo = result.repo.padEnd(22);
    const rating = `⭐ ${result.rating}`.padEnd(6);
    const improvement = `${(result.improvement * 100).toFixed(0)}%`;
    console.log(`│ ${pack} │ ${repo} │ ${rating} │ ${improvement.padEnd(11)} │`);
  });

  console.log('└─────────────────────────┴────────────────────────┴────────┴─────────────┘\n');

  // Aggregate by pack
  const packAggregates = results.reduce((acc, result) => {
    if (!acc[result.pack]) {
      acc[result.pack] = {
        pack: result.pack,
        repos: [],
        avgRating: 0,
        avgImprovement: 0,
        totalInstalls: 0
      };
    }

    acc[result.pack].repos.push(result.repo);
    acc[result.pack].avgRating += result.rating;
    acc[result.pack].avgImprovement += result.improvement;
    acc[result.pack].totalInstalls += result.installs || 0;

    return acc;
  }, {});

  // Calculate averages
  Object.values(packAggregates).forEach(agg => {
    const count = agg.repos.length;
    agg.avgRating /= count;
    agg.avgImprovement /= count;
  });

  console.log('📊 Pack Recommendations for Organization:\n');
  Object.values(packAggregates)
    .sort((a, b) => b.avgImprovement - a.avgImprovement)
    .forEach((agg, i) => {
      console.log(`   ${i + 1}. ${agg.pack}`);
      console.log(`      Used in: ${agg.repos.join(', ')}`);
      console.log(`      Avg rating: ⭐ ${agg.avgRating.toFixed(1)}`);
      console.log(`      Avg improvement: ${(agg.avgImprovement * 100).toFixed(0)}%`);
      console.log(`      Total installs: ${agg.totalInstalls}`);
      console.log();
    });
}

// ============================================================================
// Scenario 3: Aggregate Customer Metrics Across Regions
// ============================================================================

async function scenario3_AggregateCustomerMetrics(client) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 3: Aggregate Customer Metrics Across Regions    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('🌍 Querying customer data across regional deployments...\n');

  const query = `
    PREFIX revops: <https://gitvan.dev/revops#>

    SELECT ?region
           (COUNT(?customer) AS ?customerCount)
           (SUM(?mrr) AS ?totalMRR)
           (AVG(?churnRisk) AS ?avgChurnRisk)
    WHERE {
      # Query each regional endpoint
      {
        SERVICE <https://us-east.example.com/sparql> {
          ?customer a revops:Customer ;
                   revops:monthlyRecurringRevenue ?mrr ;
                   revops:churnRisk ?churnRisk .
          BIND("us-east" AS ?region)
        }
      }
      UNION
      {
        SERVICE <https://eu-west.example.com/sparql> {
          ?customer a revops:Customer ;
                   revops:monthlyRecurringRevenue ?mrr ;
                   revops:churnRisk ?churnRisk .
          BIND("eu-west" AS ?region)
        }
      }
      UNION
      {
        SERVICE <https://ap-south.example.com/sparql> {
          ?customer a revops:Customer ;
                   revops:monthlyRecurringRevenue ?mrr ;
                   revops:churnRisk ?churnRisk .
          BIND("ap-south" AS ?region)
        }
      }
    }
    GROUP BY ?region
    ORDER BY DESC(?totalMRR)
  `;

  const results = await client.query(query);

  console.log('💼 Global Customer Metrics:\n');
  console.log('┌────────────┬────────────┬─────────────────┬──────────────┐');
  console.log('│ Region     │ Customers  │ Total MRR       │ Avg Churn    │');
  console.log('├────────────┼────────────┼─────────────────┼──────────────┤');

  results.forEach(result => {
    const region = result.region.padEnd(10);
    const customers = result.customerCount.toString().padEnd(10);
    const mrr = `$${(result.totalMRR / 1000).toFixed(0)}K`.padEnd(15);
    const churn = `${result.avgChurnRisk.toFixed(1)}%`;
    console.log(`│ ${region} │ ${customers} │ ${mrr} │ ${churn.padEnd(12)} │`);
  });

  console.log('└────────────┴────────────┴─────────────────┴──────────────┘\n');

  // Global totals
  const totalCustomers = results.reduce((sum, r) => sum + r.customerCount, 0);
  const totalMRR = results.reduce((sum, r) => sum + r.totalMRR, 0);
  const globalAvgChurn = results.reduce((sum, r) => sum + (r.avgChurnRisk * r.customerCount), 0) / totalCustomers;

  console.log('🌐 Global Summary:');
  console.log(`   Total customers: ${totalCustomers.toLocaleString()}`);
  console.log(`   Total MRR: $${(totalMRR / 1000000).toFixed(2)}M`);
  console.log(`   Global avg churn risk: ${globalAvgChurn.toFixed(1)}%\n`);

  // Regional analysis
  const healthiest = results.reduce((best, current) =>
    current.avgChurnRisk < best.avgChurnRisk ? current : best
  );

  const highestRevenue = results.reduce((best, current) =>
    current.totalMRR > best.totalMRR ? current : best
  );

  console.log('📈 Regional Insights:');
  console.log(`   Healthiest region: ${healthiest.region} (${healthiest.avgChurnRisk.toFixed(1)}% churn risk)`);
  console.log(`   Highest revenue: ${highestRevenue.region} ($${(highestRevenue.totalMRR / 1000).toFixed(0)}K MRR)`);
  console.log();

  // Recommendations
  if (globalAvgChurn > 30) {
    console.log('⚠️  Global churn risk elevated');
    console.log(`   Investigate ${results.filter(r => r.avgChurnRisk > globalAvgChurn).map(r => r.region).join(', ')}`);
    console.log(`   Share best practices from ${healthiest.region}\n`);
  }
}

// ============================================================================
// Scenario 4: Discover Organizational Patterns
// ============================================================================

async function scenario4_DiscoverPatterns(client) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║ Scenario 4: Discover Organizational Patterns             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Analyzing patterns across all repositories...\n');

  // Pattern 1: Deployment frequency vs performance
  console.log('📊 Pattern 1: Deployment Frequency vs Performance\n');

  const deploymentData = [
    { repo: 'repo-api-service', frequency: 'daily', avgDuration: 420, incidents: 2 },
    { repo: 'repo-web-app', frequency: 'weekly', avgDuration: 520, incidents: 5 },
    { repo: 'repo-mobile-backend', frequency: 'daily', avgDuration: 380, incidents: 1 },
    { repo: 'repo-analytics', frequency: 'monthly', avgDuration: 680, incidents: 8 }
  ];

  console.log('   Repository               Frequency   Performance   Incidents');
  console.log('   ───────────────────────  ──────────  ───────────   ─────────');
  deploymentData.forEach(d => {
    const repo = d.repo.padEnd(23);
    const freq = d.frequency.padEnd(10);
    const perf = `${d.avgDuration}ms`.padEnd(12);
    console.log(`   ${repo}  ${freq}  ${perf}  ${d.incidents}`);
  });

  console.log('\n   💡 Pattern: Daily deployments correlate with better performance');
  console.log('      and fewer incidents\n');

  // Pattern 2: Pack adoption vs customer satisfaction
  console.log('📊 Pattern 2: Pack Adoption vs Customer Satisfaction\n');

  const adoptionData = [
    { segment: 'High adopters (5+ packs)', avgSatisfaction: 8.7, churnRate: 4.2, customerCount: 89 },
    { segment: 'Medium adopters (2-4 packs)', avgSatisfaction: 7.4, churnRate: 8.5, customerCount: 234 },
    { segment: 'Low adopters (0-1 pack)', avgSatisfaction: 6.1, churnRate: 15.3, customerCount: 156 }
  ];

  console.log('   Segment                      Satisfaction   Churn Rate   Customers');
  console.log('   ──────────────────────────  ────────────   ──────────   ─────────');
  adoptionData.forEach(d => {
    const segment = d.segment.padEnd(26);
    const satisfaction = `${d.avgSatisfaction}/10`.padEnd(13);
    const churn = `${d.churnRate}%`.padEnd(11);
    console.log(`   ${segment}  ${satisfaction}  ${churn}  ${d.customerCount}`);
  });

  console.log('\n   💡 Pattern: Pack adoption strongly correlates with satisfaction');
  console.log('      High adopters have 3.6x lower churn\n');

  // Pattern 3: Lock contention patterns
  console.log('📊 Pattern 3: Lock Contention Patterns\n');

  const lockData = [
    { timeWindow: '00:00-06:00', avgContention: 12, avgDuration: 2300 },
    { timeWindow: '06:00-12:00', avgContention: 45, avgDuration: 4200 },
    { timeWindow: '12:00-18:00', avgContention: 89, avgDuration: 7800 },
    { timeWindow: '18:00-24:00', avgContention: 34, avgDuration: 3900 }
  ];

  console.log('   Time Window   Contention Events   Avg Duration');
  console.log('   ───────────   ─────────────────   ────────────');
  lockData.forEach(d => {
    const time = d.timeWindow.padEnd(12);
    const contention = d.avgContention.toString().padEnd(18);
    console.log(`   ${time}  ${contention}  ${d.avgDuration}ms`);
  });

  console.log('\n   💡 Pattern: Peak contention during business hours (12:00-18:00)');
  console.log('      Consider scaling or scheduling batch operations off-peak\n');

  // Actionable recommendations
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🎯 Actionable Recommendations:\n');
  console.log('   1. Increase deployment frequency to daily for all repositories');
  console.log('      Expected impact: 30-40% performance improvement\n');

  console.log('   2. Launch pack adoption campaign for low-adopter segment');
  console.log('      Potential churn reduction: 11.1 percentage points\n');

  console.log('   3. Implement off-peak scheduling for batch operations');
  console.log('      Expected contention reduction: 65%\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Multi-Repository Federation Example');
  console.log('  Querying Across Distributed GitVan Instances');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Setup federated SPARQL client
  console.log('🔧 Setting up federated SPARQL client...\n');

  const client = new FederatedSPARQLClient();

  // Register endpoints
  client.registerEndpoint('repo-api-service', 'https://repo1.example.com/sparql', {
    region: 'us-east',
    team: 'platform'
  });

  client.registerEndpoint('repo-web-app', 'https://repo2.example.com/sparql', {
    region: 'us-east',
    team: 'frontend'
  });

  client.registerEndpoint('repo-mobile-backend', 'https://repo3.example.com/sparql', {
    region: 'eu-west',
    team: 'mobile'
  });

  console.log(`✓ Registered ${client.endpoints.size} SPARQL endpoints\n`);

  // Run scenarios
  await scenario1_ComparePerformance(client);
  await scenario2_BestPackConfigurations(client);
  await scenario3_AggregateCustomerMetrics(client);
  await scenario4_DiscoverPatterns(client);

  // Summary
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✨ Federation enables powerful cross-repository insights:\n');
  console.log('   ✓ Performance benchmarking across teams');
  console.log('   ✓ Best practice discovery and sharing');
  console.log('   ✓ Global customer analytics');
  console.log('   ✓ Pattern recognition at scale\n');
  console.log('🔗 SPARQL federation makes this data easily queryable!\n');
}

main().catch(console.error);
