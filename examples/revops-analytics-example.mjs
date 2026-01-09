/**
 * RevOps Analytics Example - Comprehensive Business Intelligence Demo
 *
 * This example demonstrates:
 * - Customer lifecycle management
 * - Churn prediction and risk analysis
 * - Expansion opportunity discovery
 * - Feature adoption analysis
 * - LTV estimation
 * - Business health metrics
 */

import { RDFRevOpsAnalytics } from '../src/revops/RDFRevOpsAnalytics.mjs';

async function main() {
  console.log('='.repeat(80));
  console.log('RevOps Analytics System Demo');
  console.log('='.repeat(80));

  // Initialize analytics engine
  const analytics = new RDFRevOpsAnalytics({
    ontologyPath: '/home/user/gitvan/src/rdf/ontologies/revops-ontology.ttl'
  });

  await analytics.initialize();
  console.log('✓ Analytics engine initialized\n');

  // =========================================================================
  // Step 1: Setup Plans and Features
  // =========================================================================
  console.log('Step 1: Setting up subscription plans and features');
  console.log('-'.repeat(80));

  await analytics.addPlan('starter', {
    monthlyPrice: 49,
    annualPrice: 490,
    tier: 'starter',
    maxUsers: 5,
    features: ['basic-analytics', 'git-integration', 'email-support']
  });

  await analytics.addPlan('professional', {
    monthlyPrice: 149,
    annualPrice: 1490,
    tier: 'professional',
    maxUsers: 25,
    features: ['basic-analytics', 'advanced-analytics', 'git-integration', 'slack-integration', 'priority-support']
  });

  await analytics.addPlan('enterprise', {
    monthlyPrice: 499,
    annualPrice: 4990,
    tier: 'enterprise',
    maxUsers: -1, // unlimited
    features: ['basic-analytics', 'advanced-analytics', 'predictive-analytics', 'git-integration', 'slack-integration', 'api-access', 'dedicated-support']
  });

  console.log('✓ Created 3 subscription plans: starter, professional, enterprise\n');

  // Add features
  await analytics.addFeature('basic-analytics', {
    adoptionRate: 95.0,
    monthlyActiveUsers: 450
  });

  await analytics.addFeature('advanced-analytics', {
    adoptionRate: 68.0,
    monthlyActiveUsers: 180
  });

  await analytics.addFeature('predictive-analytics', {
    adoptionRate: 42.0,
    monthlyActiveUsers: 85
  });

  await analytics.addFeature('git-integration', {
    adoptionRate: 88.0,
    monthlyActiveUsers: 420
  });

  await analytics.addFeature('slack-integration', {
    adoptionRate: 71.0,
    monthlyActiveUsers: 220
  });

  console.log('✓ Created 5 product features\n');

  // =========================================================================
  // Step 2: Add Customers with Various Profiles
  // =========================================================================
  console.log('Step 2: Adding customers with various profiles');
  console.log('-'.repeat(80));

  // Healthy customer - low churn risk
  await analytics.addCustomer('cust-001', {
    name: 'Acme Corporation',
    email: 'admin@acme.com',
    plan: 'enterprise',
    monthlyRecurringRevenue: 499
  });
  await analytics.recordFeatureUsage('cust-001', 'advanced-analytics', { count: 50 });
  await analytics.recordFeatureUsage('cust-001', 'git-integration', { count: 100 });
  console.log('✓ Added healthy customer: Acme Corporation (enterprise plan, high usage)');

  // High-risk customer - payment issues
  await analytics.addCustomer('cust-002', {
    name: 'TechStart Inc',
    email: 'billing@techstart.io',
    plan: 'professional',
    monthlyRecurringRevenue: 149
  });
  await analytics.recordPayment('cust-002', {
    amount: 149,
    status: 'failed',
    method: 'card'
  });
  await analytics.recordPayment('cust-002', {
    amount: 149,
    status: 'failed',
    method: 'card'
  });
  await analytics.recordSupportTicket('cust-002', {
    priority: 'high',
    status: 'open'
  });
  console.log('✓ Added high-risk customer: TechStart Inc (failed payments, support tickets)');

  // Expansion candidate - high usage on lower tier
  await analytics.addCustomer('cust-003', {
    name: 'Growth Labs',
    email: 'ops@growthlabs.com',
    plan: 'starter',
    monthlyRecurringRevenue: 49
  });
  // Using features not in plan
  await analytics.recordFeatureUsage('cust-003', 'basic-analytics', { count: 200 });
  await analytics.recordFeatureUsage('cust-003', 'git-integration', { count: 150 });
  await analytics.recordFeatureUsage('cust-003', 'slack-integration', { count: 80 }); // Not in starter plan
  console.log('✓ Added expansion candidate: Growth Labs (starter plan, high usage)');

  // Churned customer
  await analytics.addCustomer('cust-004', {
    name: 'Old Company LLC',
    email: 'contact@oldcompany.com',
    plan: 'professional',
    monthlyRecurringRevenue: 149
  });
  await analytics.recordChurn('cust-004', {
    reason: 'Too expensive for features used',
    revenueImpact: 149
  });
  console.log('✓ Added churned customer: Old Company LLC (cancelled subscription)');

  // Low engagement customer
  await analytics.addCustomer('cust-005', {
    name: 'Dormant Systems',
    email: 'admin@dormant.net',
    plan: 'starter',
    monthlyRecurringRevenue: 49
  });
  // Very low usage - only logged in twice
  await analytics.recordFeatureUsage('cust-005', 'basic-analytics', { count: 2 });
  console.log('✓ Added low-engagement customer: Dormant Systems (very low usage)\n');

  // =========================================================================
  // Step 3: Churn Prediction Analysis
  // =========================================================================
  console.log('Step 3: Churn Prediction Analysis');
  console.log('-'.repeat(80));

  const churnRisk002 = await analytics.predictChurnRisk('cust-002');
  console.log(`Churn Risk - TechStart Inc (cust-002): ${churnRisk002}/100`);
  console.log('  Factors: Failed payments, support tickets');

  const churnRisk005 = await analytics.predictChurnRisk('cust-005');
  console.log(`Churn Risk - Dormant Systems (cust-005): ${churnRisk005}/100`);
  console.log('  Factors: Low engagement, minimal feature usage');

  const churnRisk001 = await analytics.predictChurnRisk('cust-001');
  console.log(`Churn Risk - Acme Corporation (cust-001): ${churnRisk001}/100`);
  console.log('  Status: Healthy customer, low risk\n');

  // Get all high-risk customers
  const highRiskCustomers = await analytics.findExpansionOpportunities();
  console.log(`Total high-risk customers identified: ${highRiskCustomers.length}\n`);

  // =========================================================================
  // Step 4: Expansion Opportunities
  // =========================================================================
  console.log('Step 4: Expansion Opportunity Discovery');
  console.log('-'.repeat(80));

  const expansionOpportunities = await analytics.findExpansionOpportunities({
    minUsagePercent: 50,
    minActiveMonths: 1
  });

  console.log(`Found ${expansionOpportunities.length} expansion opportunities:`);
  for (const opp of expansionOpportunities) {
    console.log(`  - ${opp.name || opp.customerId}`);
    console.log(`    Current Plan: ${opp.currentPlan}`);
    console.log(`    Usage: ${opp.usagePercent}%`);
    console.log(`    Recommendation: ${opp.recommendation}`);
  }
  console.log();

  // =========================================================================
  // Step 5: Feature Adoption Analysis
  // =========================================================================
  console.log('Step 5: Feature Adoption Analysis');
  console.log('-'.repeat(80));

  const featureAdoption = await analytics.analyzeFeatureAdoption();
  console.log('Feature Adoption Metrics:');
  for (const feature of featureAdoption) {
    console.log(`  ${feature.featureName}:`);
    console.log(`    Adoption Rate: ${feature.adoptionRate}%`);
    console.log(`    Monthly Active Users: ${feature.monthlyActiveUsers}`);
    if (feature.revenueCorrelation !== undefined) {
      console.log(`    Revenue Correlation: ${feature.revenueCorrelation}`);
    }
  }
  console.log();

  // =========================================================================
  // Step 6: Lifetime Value Estimation
  // =========================================================================
  console.log('Step 6: Lifetime Value (LTV) Estimation');
  console.log('-'.repeat(80));

  const ltv001 = await analytics.estimateLTV('cust-001');
  console.log(`LTV - Acme Corporation: $${ltv001.toFixed(2)}`);

  const ltv003 = await analytics.estimateLTV('cust-003');
  console.log(`LTV - Growth Labs: $${ltv003.toFixed(2)}`);

  const ltv002 = await analytics.estimateLTV('cust-002');
  console.log(`LTV - TechStart Inc: $${ltv002.toFixed(2)} (at risk!)\n`);

  // =========================================================================
  // Step 7: Payment Pattern Analysis
  // =========================================================================
  console.log('Step 7: Payment Pattern Analysis');
  console.log('-'.repeat(80));

  const paymentPatterns = await analytics.getPaymentPatterns();
  console.log('Payment Patterns:');
  console.log(`  Average Payment Time: ${paymentPatterns.overallAvgPaymentDays || 'N/A'} days`);
  console.log(`  Early Payers (≤7 days): ${paymentPatterns.earlyPayerCount || 0}`);
  console.log(`  Late Payers (>30 days): ${paymentPatterns.latePayerCount || 0}\n`);

  // =========================================================================
  // Step 8: Business Health Dashboard
  // =========================================================================
  console.log('Step 8: Business Health Dashboard');
  console.log('-'.repeat(80));

  const healthMetrics = await analytics.getBusinessHealth();
  console.log('Overall Business Metrics:');
  console.log(`  Monthly Recurring Revenue (MRR): $${healthMetrics.monthlyRecurringRevenue.toFixed(2)}`);
  console.log(`  Month-over-Month Growth: ${healthMetrics.monthOverMonthGrowthRate.toFixed(2)}%`);
  console.log(`  Churn Rate: ${healthMetrics.churnRate.toFixed(2)}%`);
  console.log(`  Active Customers: ${healthMetrics.activeCustomers}`);
  console.log(`  High-Risk Customers: ${healthMetrics.highRiskCustomers}`);
  console.log(`  Expansion Opportunities: ${healthMetrics.expansionOpportunities}`);
  console.log(`  Health Score: ${healthMetrics.healthScore.toFixed(0)}/100`);

  // Interpret health score
  let healthStatus;
  if (healthMetrics.healthScore >= 80) {
    healthStatus = '🟢 EXCELLENT - Strong growth and low churn';
  } else if (healthMetrics.healthScore >= 60) {
    healthStatus = '🟡 GOOD - Healthy but room for improvement';
  } else if (healthMetrics.healthScore >= 40) {
    healthStatus = '🟠 FAIR - Attention needed on churn or growth';
  } else {
    healthStatus = '🔴 CRITICAL - Immediate action required';
  }
  console.log(`  Status: ${healthStatus}\n`);

  // =========================================================================
  // Step 9: Cohort Analysis
  // =========================================================================
  console.log('Step 9: Customer Cohort Analysis');
  console.log('-'.repeat(80));

  const cohorts = await analytics.getCustomerCohorts();
  if (cohorts.length > 0) {
    console.log('Cohort Metrics:');
    for (const cohort of cohorts) {
      console.log(`  ${cohort.cohortName}:`);
      console.log(`    Size: ${cohort.size || 0} customers`);
      console.log(`    Retention Rate: ${cohort.retentionRate || 0}%`);
      console.log(`    Average LTV: $${cohort.avgLTV || 0}`);
    }
  } else {
    console.log('No cohort data available yet (requires historical data)\n');
  }

  // =========================================================================
  // Step 10: Actionable Recommendations
  // =========================================================================
  console.log('Step 10: Actionable Recommendations');
  console.log('-'.repeat(80));

  console.log('Immediate Actions:');
  console.log('  1. Contact TechStart Inc (cust-002) - HIGH CHURN RISK');
  console.log('     - Resolve payment issues');
  console.log('     - Address open support tickets');
  console.log('     - Consider offering payment plan or discount');

  console.log('\n  2. Engage Dormant Systems (cust-005) - LOW ENGAGEMENT');
  console.log('     - Send onboarding reminder');
  console.log('     - Offer training session');
  console.log('     - Check if product fit is correct');

  console.log('\n  3. Upsell Growth Labs (cust-003) - EXPANSION OPPORTUNITY');
  console.log('     - Currently using features beyond their plan');
  console.log('     - Suggest upgrade to Professional plan');
  console.log('     - Potential additional MRR: $100/month');

  console.log('\n  4. Nurture Acme Corporation (cust-001) - POWER USER');
  console.log('     - Request case study or testimonial');
  console.log('     - Ask for referrals');
  console.log('     - Consider exclusive features or pricing\n');

  // =========================================================================
  // Cleanup
  // =========================================================================
  console.log('='.repeat(80));
  console.log('Demo Complete - Analytics Engine Running');
  console.log('='.repeat(80));

  // Keep running for inspection (comment out to exit immediately)
  // await analytics.close();
}

// Run the demo
main().catch(error => {
  console.error('Error running RevOps Analytics demo:', error);
  process.exit(1);
});
