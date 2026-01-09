/**
 * Tests for RDFRevOpsAnalytics
 *
 * Comprehensive test coverage for:
 * - Customer management
 * - Churn prediction
 * - Expansion opportunities
 * - Feature analysis
 * - LTV estimation
 * - Payment patterns
 * - Business health metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RDFRevOpsAnalytics } from '../../src/revops/RDFRevOpsAnalytics.mjs';

describe('RDFRevOpsAnalytics', () => {
  let analytics;

  beforeEach(async () => {
    analytics = new RDFRevOpsAnalytics({
      ontologyPath: '/home/user/gitvan/src/rdf/ontologies/revops-ontology.ttl'
    });
    await analytics.initialize();
  });

  afterEach(async () => {
    if (analytics) {
      await analytics.close();
    }
  });

  // =========================================================================
  // Initialization Tests
  // =========================================================================

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(analytics.initialized).toBe(true);
      expect(analytics.knowledgeSubstrate).toBeDefined();
      expect(analytics.queries).toBeDefined();
    });

    it('should throw error if operations called before initialization', async () => {
      const uninitAnalytics = new RDFRevOpsAnalytics();
      await expect(uninitAnalytics.addCustomer('test', {})).rejects.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      const firstSubstrate = analytics.knowledgeSubstrate;
      await analytics.initialize();
      expect(analytics.knowledgeSubstrate).toBe(firstSubstrate);
    });
  });

  // =========================================================================
  // Customer Management Tests
  // =========================================================================

  describe('Customer Management', () => {
    it('should add a customer successfully', async () => {
      const customerUri = await analytics.addCustomer('cust-001', {
        name: 'Test Company',
        email: 'test@example.com',
        plan: 'professional',
        monthlyRecurringRevenue: 149
      });

      expect(customerUri).toContain('customer/cust-001');
    });

    it('should add customer with minimal data', async () => {
      const customerUri = await analytics.addCustomer('cust-002', {});
      expect(customerUri).toContain('customer/cust-002');
    });

    it('should retrieve customer data', async () => {
      await analytics.addCustomer('cust-003', {
        name: 'Acme Corp',
        email: 'admin@acme.com',
        monthlyRecurringRevenue: 499
      });

      const customerData = await analytics.queries.getCustomerData('cust-003');
      expect(customerData).toBeDefined();
      expect(customerData.name).toBe('Acme Corp');
    });
  });

  // =========================================================================
  // Plan and Feature Tests
  // =========================================================================

  describe('Plans and Features', () => {
    it('should add a subscription plan', async () => {
      const planUri = await analytics.addPlan('starter', {
        monthlyPrice: 49,
        tier: 'starter',
        maxUsers: 5
      });

      expect(planUri).toContain('plan/starter');
    });

    it('should add plan with features', async () => {
      const planUri = await analytics.addPlan('professional', {
        monthlyPrice: 149,
        features: ['analytics', 'integration', 'support']
      });

      expect(planUri).toContain('plan/professional');
    });

    it('should add a feature', async () => {
      const featureUri = await analytics.addFeature('advanced-analytics', {
        adoptionRate: 68.5,
        monthlyActiveUsers: 180
      });

      expect(featureUri).toContain('feature/advanced-analytics');
    });
  });

  // =========================================================================
  // Churn Prediction Tests
  // =========================================================================

  describe('Churn Prediction', () => {
    beforeEach(async () => {
      await analytics.addCustomer('churn-test-001', {
        name: 'Healthy Customer',
        plan: 'professional',
        monthlyRecurringRevenue: 149
      });

      await analytics.addCustomer('churn-test-002', {
        name: 'At-Risk Customer',
        plan: 'starter',
        monthlyRecurringRevenue: 49
      });
    });

    it('should predict low churn risk for healthy customer', async () => {
      // Simulate healthy activity
      await analytics.recordFeatureUsage('churn-test-001', 'analytics', { count: 50 });
      await analytics.recordPayment('churn-test-001', {
        amount: 149,
        status: 'succeeded'
      });

      const riskScore = await analytics.predictChurnRisk('churn-test-001');
      expect(riskScore).toBeLessThan(50);
    });

    it('should predict high churn risk for failed payments', async () => {
      // Simulate payment failures
      await analytics.recordPayment('churn-test-002', {
        amount: 49,
        status: 'failed'
      });
      await analytics.recordPayment('churn-test-002', {
        amount: 49,
        status: 'failed'
      });

      const riskScore = await analytics.predictChurnRisk('churn-test-002');
      expect(riskScore).toBeGreaterThan(50);
    });

    it('should predict high churn risk for low engagement', async () => {
      // Simulate low usage (no activity recorded)
      const riskScore = await analytics.predictChurnRisk('churn-test-002');
      expect(riskScore).toBeGreaterThan(40);
    });

    it('should increase churn risk with support tickets', async () => {
      await analytics.recordSupportTicket('churn-test-002', {
        priority: 'high',
        status: 'open'
      });
      await analytics.recordSupportTicket('churn-test-002', {
        priority: 'high',
        status: 'open'
      });

      const riskScore = await analytics.predictChurnRisk('churn-test-002');
      expect(riskScore).toBeGreaterThan(30);
    });

    it('should throw error for non-existent customer', async () => {
      await expect(analytics.predictChurnRisk('non-existent')).rejects.toThrow();
    });
  });

  // =========================================================================
  // Expansion Opportunity Tests
  // =========================================================================

  describe('Expansion Opportunities', () => {
    beforeEach(async () => {
      await analytics.addPlan('starter', { monthlyPrice: 49 });
      await analytics.addPlan('professional', { monthlyPrice: 149 });

      await analytics.addCustomer('expansion-test-001', {
        name: 'High Usage Customer',
        plan: 'starter',
        monthlyRecurringRevenue: 49
      });

      // Simulate high feature usage
      await analytics.recordFeatureUsage('expansion-test-001', 'analytics', { count: 100 });
      await analytics.recordFeatureUsage('expansion-test-001', 'integration', { count: 80 });
    });

    it('should find expansion opportunities', async () => {
      const opportunities = await analytics.findExpansionOpportunities({
        minUsagePercent: 50,
        minActiveMonths: 0
      });

      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should not find opportunities for new low-usage customers', async () => {
      await analytics.addCustomer('expansion-test-002', {
        name: 'Low Usage Customer',
        plan: 'starter',
        monthlyRecurringRevenue: 49
      });

      const opportunities = await analytics.findExpansionOpportunities({
        minUsagePercent: 80,
        minActiveMonths: 0
      });

      // Should not include low-usage customer
      const hasLowUsageCustomer = opportunities.some(
        opp => opp.customerId === 'expansion-test-002'
      );
      expect(hasLowUsageCustomer).toBe(false);
    });
  });

  // =========================================================================
  // Expansion Event Tests
  // =========================================================================

  describe('Expansion Events', () => {
    it('should record expansion event', async () => {
      await analytics.addCustomer('expansion-event-001', {
        plan: 'starter',
        monthlyRecurringRevenue: 49
      });

      const eventUri = await analytics.recordExpansion(
        'expansion-event-001',
        'starter',
        'professional',
        100
      );

      expect(eventUri).toContain('expansion/');
    });
  });

  // =========================================================================
  // Churn Event Tests
  // =========================================================================

  describe('Churn Events', () => {
    it('should record churn event', async () => {
      await analytics.addCustomer('churn-event-001', {
        plan: 'starter',
        monthlyRecurringRevenue: 49
      });

      const eventUri = await analytics.recordChurn('churn-event-001', {
        reason: 'Price too high',
        revenueImpact: 49
      });

      expect(eventUri).toContain('churn/');
    });

    it('should mark customer as inactive after churn', async () => {
      await analytics.addCustomer('churn-event-002', {
        plan: 'starter'
      });

      await analytics.recordChurn('churn-event-002');

      const customerData = await analytics.queries.getCustomerData('churn-event-002');
      expect(customerData.isActive).toBe(false);
    });
  });

  // =========================================================================
  // Payment Tests
  // =========================================================================

  describe('Payment Events', () => {
    it('should record successful payment', async () => {
      await analytics.addCustomer('payment-test-001', {
        monthlyRecurringRevenue: 149
      });

      const eventUri = await analytics.recordPayment('payment-test-001', {
        amount: 149,
        status: 'succeeded',
        method: 'card'
      });

      expect(eventUri).toContain('payment/');
    });

    it('should record failed payment', async () => {
      await analytics.addCustomer('payment-test-002', {
        monthlyRecurringRevenue: 49
      });

      const eventUri = await analytics.recordPayment('payment-test-002', {
        amount: 49,
        status: 'failed',
        method: 'card'
      });

      expect(eventUri).toContain('payment/');
    });

    it('should analyze payment patterns', async () => {
      await analytics.addCustomer('payment-test-003', {
        monthlyRecurringRevenue: 149
      });

      const patterns = await analytics.getPaymentPatterns();
      expect(patterns).toBeDefined();
    });
  });

  // =========================================================================
  // Support Ticket Tests
  // =========================================================================

  describe('Support Tickets', () => {
    it('should record support ticket', async () => {
      await analytics.addCustomer('ticket-test-001', {
        name: 'Test Customer'
      });

      const ticketUri = await analytics.recordSupportTicket('ticket-test-001', {
        priority: 'high',
        status: 'open'
      });

      expect(ticketUri).toContain('ticket/');
    });

    it('should increment customer ticket count', async () => {
      await analytics.addCustomer('ticket-test-002', {
        name: 'Test Customer'
      });

      await analytics.recordSupportTicket('ticket-test-002', {});
      await analytics.recordSupportTicket('ticket-test-002', {});

      const ticketCount = await analytics.queries.getCustomerTicketCount('ticket-test-002');
      expect(ticketCount).toBe(2);
    });
  });

  // =========================================================================
  // Feature Usage Tests
  // =========================================================================

  describe('Feature Usage', () => {
    it('should record feature usage', async () => {
      await analytics.addCustomer('usage-test-001', {
        name: 'Test Customer'
      });
      await analytics.addFeature('test-feature', {});

      const eventUri = await analytics.recordFeatureUsage(
        'usage-test-001',
        'test-feature',
        { count: 10 }
      );

      expect(eventUri).toContain('usage/');
    });

    it('should analyze feature adoption', async () => {
      await analytics.addFeature('adoption-test-feature', {
        adoptionRate: 75.0,
        monthlyActiveUsers: 300
      });

      const adoption = await analytics.analyzeFeatureAdoption();
      expect(Array.isArray(adoption)).toBe(true);
    });
  });

  // =========================================================================
  // LTV Estimation Tests
  // =========================================================================

  describe('Lifetime Value Estimation', () => {
    beforeEach(async () => {
      await analytics.addPlan('ltv-test-plan', {
        monthlyPrice: 149
      });

      await analytics.addCustomer('ltv-test-001', {
        plan: 'ltv-test-plan',
        monthlyRecurringRevenue: 149
      });
    });

    it('should estimate LTV for customer', async () => {
      const ltv = await analytics.estimateLTV('ltv-test-001');
      expect(ltv).toBeGreaterThan(0);
      expect(typeof ltv).toBe('number');
    });

    it('should throw error for non-existent customer', async () => {
      await expect(analytics.estimateLTV('non-existent')).rejects.toThrow();
    });

    it('should calculate LTV based on MRR', async () => {
      const customerData = await analytics.queries.getCustomerData('ltv-test-001');
      const ltv = await analytics.estimateLTV('ltv-test-001');

      // LTV should be MRR * average lifespan
      expect(ltv).toBeGreaterThan(customerData.monthlyRecurringRevenue);
    });
  });

  // =========================================================================
  // Business Health Tests
  // =========================================================================

  describe('Business Health Metrics', () => {
    beforeEach(async () => {
      // Add some test data
      await analytics.addCustomer('health-test-001', {
        monthlyRecurringRevenue: 149
      });
      await analytics.addCustomer('health-test-002', {
        monthlyRecurringRevenue: 499
      });
    });

    it('should get business health metrics', async () => {
      const health = await analytics.getBusinessHealth();

      expect(health).toBeDefined();
      expect(health.monthlyRecurringRevenue).toBeGreaterThan(0);
      expect(health.monthOverMonthGrowthRate).toBeDefined();
      expect(health.churnRate).toBeDefined();
      expect(health.activeCustomers).toBeGreaterThan(0);
      expect(health.healthScore).toBeGreaterThanOrEqual(0);
      expect(health.healthScore).toBeLessThanOrEqual(100);
    });

    it('should calculate MRR correctly', async () => {
      const mrr = await analytics.queries.getMonthlyRecurringRevenue();
      expect(mrr).toBeGreaterThanOrEqual(648); // 149 + 499
    });

    it('should get active customer count', async () => {
      const count = await analytics.queries.getActiveCustomerCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Query Tests
  // =========================================================================

  describe('RevOps Queries', () => {
    beforeEach(async () => {
      await analytics.addCustomer('query-test-001', {
        name: 'Query Test Customer',
        monthlyRecurringRevenue: 149
      });
    });

    it('should get customer data via query', async () => {
      const data = await analytics.queries.getCustomerData('query-test-001');
      expect(data).toBeDefined();
      expect(data.name).toBe('Query Test Customer');
    });

    it('should get high-risk customers', async () => {
      // Add high-risk customer
      await analytics.addCustomer('query-test-002', {
        monthlyRecurringRevenue: 49
      });
      await analytics.predictChurnRisk('query-test-002');

      const highRisk = await analytics.queries.getHighRiskCustomers(60);
      expect(Array.isArray(highRisk)).toBe(true);
    });

    it('should correlate features to revenue', async () => {
      await analytics.addFeature('revenue-feature', {
        adoptionRate: 80
      });

      const correlations = await analytics.queries.correlateFeaturesToRevenue();
      expect(Array.isArray(correlations)).toBe(true);
    });
  });

  // =========================================================================
  // Cohort Analysis Tests
  // =========================================================================

  describe('Cohort Analysis', () => {
    it('should get customer cohorts', async () => {
      const cohorts = await analytics.getCustomerCohorts();
      expect(Array.isArray(cohorts)).toBe(true);
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete customer lifecycle', async () => {
      // Step 1: Add customer
      await analytics.addCustomer('lifecycle-test-001', {
        name: 'Lifecycle Test',
        plan: 'starter',
        monthlyRecurringRevenue: 49
      });

      // Step 2: Record activity
      await analytics.recordFeatureUsage('lifecycle-test-001', 'feature1', { count: 10 });
      await analytics.recordPayment('lifecycle-test-001', {
        amount: 49,
        status: 'succeeded'
      });

      // Step 3: Predict churn (should be low)
      const initialRisk = await analytics.predictChurnRisk('lifecycle-test-001');
      expect(initialRisk).toBeLessThan(70);

      // Step 4: Record expansion
      await analytics.recordExpansion('lifecycle-test-001', 'starter', 'professional', 100);

      // Step 5: Get LTV
      const ltv = await analytics.estimateLTV('lifecycle-test-001');
      expect(ltv).toBeGreaterThan(0);
    });

    it('should handle churn scenario', async () => {
      // Add customer
      await analytics.addCustomer('churn-scenario-001', {
        plan: 'professional',
        monthlyRecurringRevenue: 149
      });

      // Failed payments
      await analytics.recordPayment('churn-scenario-001', { status: 'failed' });
      await analytics.recordPayment('churn-scenario-001', { status: 'failed' });

      // Support tickets
      await analytics.recordSupportTicket('churn-scenario-001', { priority: 'high' });

      // Should be high risk
      const riskScore = await analytics.predictChurnRisk('churn-scenario-001');
      expect(riskScore).toBeGreaterThan(60);

      // Eventually churns
      await analytics.recordChurn('churn-scenario-001', {
        reason: 'Payment issues',
        revenueImpact: 149
      });

      // Should be inactive
      const customerData = await analytics.queries.getCustomerData('churn-scenario-001');
      expect(customerData.isActive).toBe(false);
    });
  });
});
