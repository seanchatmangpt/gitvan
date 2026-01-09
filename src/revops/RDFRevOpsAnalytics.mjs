/**
 * RDFRevOpsAnalytics - Revenue Operations Analytics using RDF/SPARQL
 *
 * Provides comprehensive business intelligence including:
 * - Churn prediction and risk scoring
 * - Expansion opportunity discovery
 * - Customer cohort analysis
 * - Feature adoption and revenue correlation
 * - Lifetime value (LTV) estimation
 * - Payment pattern analysis
 * - Business health metrics
 */

import { KnowledgeSubstrate } from '../core/KnowledgeSubstrate.mjs';
import { RevOpsQueries } from './queries/RevOpsQueries.mjs';

const REVOPS_NS = 'http://gitvan.org/ontology/revops#';

export class RDFRevOpsAnalytics {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.ontologyPath - Path to revops-ontology.ttl
   */
  constructor(options = {}) {
    this.options = {
      ontologyPath: options.ontologyPath || '/home/user/gitvan/src/rdf/ontologies/revops-ontology.ttl',
      ...options
    };

    this.knowledgeSubstrate = null;
    this.queries = null;
    this.initialized = false;
  }

  /**
   * Initialize the RevOps analytics engine
   * @param {KnowledgeSubstrate} knowledgeSubstrate - Optional existing substrate
   * @returns {Promise<void>}
   */
  async initialize(knowledgeSubstrate = null) {
    if (this.initialized) {
      return;
    }

    // Use provided substrate or create new one
    if (knowledgeSubstrate) {
      this.knowledgeSubstrate = knowledgeSubstrate;
    } else {
      this.knowledgeSubstrate = new KnowledgeSubstrate({
        ontologyPaths: [this.options.ontologyPath],
        enableInference: true,
        enableReasoning: true
      });
      await this.knowledgeSubstrate.initialize();
    }

    // Load ontology
    await this.knowledgeSubstrate.loadOntology(this.options.ontologyPath);

    // Initialize query helper
    this.queries = new RevOpsQueries(this.knowledgeSubstrate);

    this.initialized = true;
  }

  /**
   * Add a new customer to the knowledge graph
   * @param {string} customerId - Unique customer identifier
   * @param {Object} customerData - Customer data
   * @returns {Promise<string>} Customer URI
   */
  async addCustomer(customerId, customerData = {}) {
    this._ensureInitialized();

    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    const timestamp = new Date().toISOString();

    // Build triples
    const triples = [
      `<${customerUri}> a <${REVOPS_NS}Customer> .`,
      `<${customerUri}> <${REVOPS_NS}customerId> "${customerId}" .`,
      `<${customerUri}> <${REVOPS_NS}signupDate> "${timestamp}"^^xsd:dateTime .`,
      `<${customerUri}> <${REVOPS_NS}isActive> true .`
    ];

    // Add optional properties
    if (customerData.name) {
      triples.push(`<${customerUri}> <${REVOPS_NS}customerName> "${customerData.name}" .`);
    }
    if (customerData.email) {
      triples.push(`<${customerUri}> <${REVOPS_NS}customerEmail> "${customerData.email}" .`);
    }
    if (customerData.plan) {
      const planUri = `${REVOPS_NS}plan/${customerData.plan}`;
      triples.push(`<${customerUri}> <${REVOPS_NS}hasPlan> <${planUri}> .`);
    }
    if (customerData.monthlyRecurringRevenue !== undefined) {
      triples.push(`<${customerUri}> <${REVOPS_NS}monthlyRecurringRevenue> "${customerData.monthlyRecurringRevenue}"^^xsd:decimal .`);
    }

    // Insert triples
    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return customerUri;
  }

  /**
   * Record a customer expansion event
   * @param {string} customerId - Customer ID
   * @param {string} previousPlan - Previous plan name
   * @param {string} newPlan - New plan name
   * @param {number} value - Expansion value (additional MRR)
   * @returns {Promise<string>} Expansion event URI
   */
  async recordExpansion(customerId, previousPlan, newPlan, value) {
    this._ensureInitialized();

    const eventId = `${customerId}-${Date.now()}`;
    const eventUri = `${REVOPS_NS}expansion/${eventId}`;
    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    const previousPlanUri = `${REVOPS_NS}plan/${previousPlan}`;
    const newPlanUri = `${REVOPS_NS}plan/${newPlan}`;
    const timestamp = new Date().toISOString();

    const triples = [
      `<${eventUri}> a <${REVOPS_NS}ExpansionEvent> .`,
      `<${eventUri}> <${REVOPS_NS}expansionCustomer> <${customerUri}> .`,
      `<${eventUri}> <${REVOPS_NS}previousPlan> <${previousPlanUri}> .`,
      `<${eventUri}> <${REVOPS_NS}newPlan> <${newPlanUri}> .`,
      `<${eventUri}> <${REVOPS_NS}expansionValue> "${value}"^^xsd:decimal .`,
      `<${eventUri}> <${REVOPS_NS}expansionTimestamp> "${timestamp}"^^xsd:dateTime .`,
      // Update customer's current plan
      `<${customerUri}> <${REVOPS_NS}hasPlan> <${newPlanUri}> .`
    ];

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return eventUri;
  }

  /**
   * Record a customer churn event
   * @param {string} customerId - Customer ID
   * @param {Object} options - Churn details
   * @returns {Promise<string>} Churn event URI
   */
  async recordChurn(customerId, options = {}) {
    this._ensureInitialized();

    const eventId = `${customerId}-${Date.now()}`;
    const eventUri = `${REVOPS_NS}churn/${eventId}`;
    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    const timestamp = new Date().toISOString();

    const triples = [
      `<${eventUri}> a <${REVOPS_NS}ChurnEvent> .`,
      `<${eventUri}> <${REVOPS_NS}churnCustomer> <${customerUri}> .`,
      `<${eventUri}> <${REVOPS_NS}churnTimestamp> "${timestamp}"^^xsd:dateTime .`,
      // Mark customer as inactive
      `<${customerUri}> <${REVOPS_NS}isActive> false .`
    ];

    if (options.reason) {
      triples.push(`<${eventUri}> <${REVOPS_NS}churnReason> "${options.reason}" .`);
    }
    if (options.revenueImpact !== undefined) {
      triples.push(`<${eventUri}> <${REVOPS_NS}churnRevenueImpact> "${options.revenueImpact}"^^xsd:decimal .`);
    }

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return eventUri;
  }

  /**
   * Predict churn risk for a customer (0-100 score)
   * @param {string} customerId - Customer ID
   * @returns {Promise<number>} Churn risk score (0-100, higher = more risk)
   */
  async predictChurnRisk(customerId) {
    this._ensureInitialized();

    const customerUri = `${REVOPS_NS}customer/${customerId}`;

    // Get customer data
    const customerData = await this.queries.getCustomerData(customerId);

    if (!customerData) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Churn prediction model (rule-based for demonstration)
    let riskScore = 0;

    // Factor 1: Failed payments (high weight)
    if (customerData.lastPaymentFailed) {
      riskScore += 30;
    }
    if (customerData.consecutiveFailedPayments > 0) {
      riskScore += customerData.consecutiveFailedPayments * 10;
    }

    // Factor 2: Support ticket volume
    if (customerData.supportTicketCount > 5) {
      riskScore += 20;
    } else if (customerData.supportTicketCount > 2) {
      riskScore += 10;
    }

    // Factor 3: Feature usage
    if (customerData.featureUsagePercent < 20) {
      riskScore += 25;
    } else if (customerData.featureUsagePercent < 40) {
      riskScore += 15;
    }

    // Factor 4: Activity recency
    if (customerData.daysSinceLastActivity > 30) {
      riskScore += 20;
    } else if (customerData.daysSinceLastActivity > 14) {
      riskScore += 10;
    }

    // Cap at 100
    riskScore = Math.min(100, riskScore);

    // Store prediction
    await this.knowledgeSubstrate.insert(
      `<${customerUri}> <${REVOPS_NS}churnRiskScore> "${riskScore}"^^xsd:integer .`
    );

    return riskScore;
  }

  /**
   * Find customers with expansion opportunities
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} List of expansion opportunities
   */
  async findExpansionOpportunities(options = {}) {
    this._ensureInitialized();

    const opportunities = await this.queries.findUpsellCandidates({
      minUsagePercent: options.minUsagePercent || 60,
      minActiveMonths: options.minActiveMonths || 3
    });

    return opportunities;
  }

  /**
   * Analyze feature adoption across customer base
   * @returns {Promise<Array>} Feature adoption metrics
   */
  async analyzeFeatureAdoption() {
    this._ensureInitialized();

    const features = await this.queries.getAllFeatures();
    const adoptionData = [];

    for (const feature of features) {
      const metrics = await this.queries.getFeatureMetrics(feature.name);
      adoptionData.push({
        featureName: feature.name,
        adoptionRate: metrics.adoptionRate,
        monthlyActiveUsers: metrics.monthlyActiveUsers,
        revenueCorrelation: metrics.revenueCorrelation,
        churnCorrelation: metrics.churnCorrelation
      });
    }

    return adoptionData;
  }

  /**
   * Get customer cohorts with retention analysis
   * @returns {Promise<Array>} Cohort data
   */
  async getCustomerCohorts() {
    this._ensureInitialized();

    return await this.queries.analyzeCohorts();
  }

  /**
   * Estimate lifetime value (LTV) for a customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<number>} Estimated LTV
   */
  async estimateLTV(customerId) {
    this._ensureInitialized();

    const customerData = await this.queries.getCustomerData(customerId);

    if (!customerData) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Get average customer lifespan for similar customers (same plan)
    const avgLifespan = await this.queries.getAverageLifespanByPlan(customerData.plan);

    // LTV = MRR * Average Lifespan (in months)
    const ltv = customerData.monthlyRecurringRevenue * avgLifespan;

    // Store estimate
    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    await this.knowledgeSubstrate.insert(
      `<${customerUri}> <${REVOPS_NS}lifetimeValue> "${ltv}"^^xsd:decimal .`
    );

    return ltv;
  }

  /**
   * Analyze payment patterns across customers
   * @returns {Promise<Object>} Payment pattern analysis
   */
  async getPaymentPatterns() {
    this._ensureInitialized();

    return await this.queries.getPaymentPatterns();
  }

  /**
   * Get overall business health metrics
   * @returns {Promise<Object>} Business health dashboard
   */
  async getBusinessHealth() {
    this._ensureInitialized();

    const [
      mrr,
      growthRate,
      churnRate,
      activeCustomers,
      highRiskCustomers,
      expansionCandidates
    ] = await Promise.all([
      this.queries.getMonthlyRecurringRevenue(),
      this.queries.getGrowthRate(),
      this.queries.getChurnRate(),
      this.queries.getActiveCustomerCount(),
      this.queries.getHighRiskCustomerCount(),
      this.queries.getExpansionCandidateCount()
    ]);

    return {
      monthlyRecurringRevenue: mrr,
      monthOverMonthGrowthRate: growthRate,
      churnRate: churnRate,
      activeCustomers: activeCustomers,
      highRiskCustomers: highRiskCustomers,
      expansionOpportunities: expansionCandidates,
      healthScore: this._calculateHealthScore(churnRate, growthRate)
    };
  }

  /**
   * Add a subscription plan
   * @param {string} planName - Plan name
   * @param {Object} planData - Plan details
   * @returns {Promise<string>} Plan URI
   */
  async addPlan(planName, planData = {}) {
    this._ensureInitialized();

    const planUri = `${REVOPS_NS}plan/${planName}`;

    const triples = [
      `<${planUri}> a <${REVOPS_NS}Plan> .`,
      `<${planUri}> <${REVOPS_NS}planName> "${planName}" .`
    ];

    if (planData.monthlyPrice !== undefined) {
      triples.push(`<${planUri}> <${REVOPS_NS}monthlyPrice> "${planData.monthlyPrice}"^^xsd:decimal .`);
    }
    if (planData.annualPrice !== undefined) {
      triples.push(`<${planUri}> <${REVOPS_NS}annualPrice> "${planData.annualPrice}"^^xsd:decimal .`);
    }
    if (planData.tier) {
      triples.push(`<${planUri}> <${REVOPS_NS}planTier> "${planData.tier}" .`);
    }
    if (planData.maxUsers !== undefined) {
      triples.push(`<${planUri}> <${REVOPS_NS}maxUsers> "${planData.maxUsers}"^^xsd:integer .`);
    }
    if (planData.features && Array.isArray(planData.features)) {
      for (const feature of planData.features) {
        const featureUri = `${REVOPS_NS}feature/${feature}`;
        triples.push(`<${planUri}> <${REVOPS_NS}includesFeature> <${featureUri}> .`);
      }
    }

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return planUri;
  }

  /**
   * Add a feature
   * @param {string} featureName - Feature name
   * @param {Object} featureData - Feature details
   * @returns {Promise<string>} Feature URI
   */
  async addFeature(featureName, featureData = {}) {
    this._ensureInitialized();

    const featureUri = `${REVOPS_NS}feature/${featureName}`;

    const triples = [
      `<${featureUri}> a <${REVOPS_NS}Feature> .`,
      `<${featureUri}> <${REVOPS_NS}featureName> "${featureName}" .`
    ];

    if (featureData.adoptionRate !== undefined) {
      triples.push(`<${featureUri}> <${REVOPS_NS}adoptionRate> "${featureData.adoptionRate}"^^xsd:decimal .`);
    }
    if (featureData.monthlyActiveUsers !== undefined) {
      triples.push(`<${featureUri}> <${REVOPS_NS}monthlyActiveUsers> "${featureData.monthlyActiveUsers}"^^xsd:integer .`);
    }

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return featureUri;
  }

  /**
   * Record a payment event
   * @param {string} customerId - Customer ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise<string>} Payment event URI
   */
  async recordPayment(customerId, paymentData = {}) {
    this._ensureInitialized();

    const eventId = `${customerId}-payment-${Date.now()}`;
    const eventUri = `${REVOPS_NS}payment/${eventId}`;
    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    const timestamp = new Date().toISOString();

    const triples = [
      `<${eventUri}> a <${REVOPS_NS}PaymentEvent> .`,
      `<${eventUri}> <${REVOPS_NS}paymentCustomer> <${customerUri}> .`,
      `<${eventUri}> <${REVOPS_NS}paymentTimestamp> "${timestamp}"^^xsd:dateTime .`
    ];

    if (paymentData.amount !== undefined) {
      triples.push(`<${eventUri}> <${REVOPS_NS}paymentAmount> "${paymentData.amount}"^^xsd:decimal .`);
    }
    if (paymentData.status) {
      triples.push(`<${eventUri}> <${REVOPS_NS}paymentStatus> "${paymentData.status}" .`);

      // Update customer payment status
      if (paymentData.status === 'failed') {
        triples.push(`<${customerUri}> <${REVOPS_NS}lastPaymentFailed> true .`);
      } else if (paymentData.status === 'succeeded') {
        triples.push(`<${customerUri}> <${REVOPS_NS}lastPaymentFailed> false .`);
      }
    }
    if (paymentData.method) {
      triples.push(`<${eventUri}> <${REVOPS_NS}paymentMethod> "${paymentData.method}" .`);
    }

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return eventUri;
  }

  /**
   * Record a support ticket
   * @param {string} customerId - Customer ID
   * @param {Object} ticketData - Ticket details
   * @returns {Promise<string>} Ticket URI
   */
  async recordSupportTicket(customerId, ticketData = {}) {
    this._ensureInitialized();

    const ticketId = ticketData.ticketId || `${customerId}-ticket-${Date.now()}`;
    const ticketUri = `${REVOPS_NS}ticket/${ticketId}`;
    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    const timestamp = new Date().toISOString();

    const triples = [
      `<${ticketUri}> a <${REVOPS_NS}SupportTicket> .`,
      `<${ticketUri}> <${REVOPS_NS}ticketCustomer> <${customerUri}> .`,
      `<${ticketUri}> <${REVOPS_NS}ticketId> "${ticketId}" .`,
      `<${ticketUri}> <${REVOPS_NS}ticketCreatedAt> "${timestamp}"^^xsd:dateTime .`
    ];

    if (ticketData.priority) {
      triples.push(`<${ticketUri}> <${REVOPS_NS}ticketPriority> "${ticketData.priority}" .`);
    }
    if (ticketData.status) {
      triples.push(`<${ticketUri}> <${REVOPS_NS}ticketStatus> "${ticketData.status}" .`);
    }

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    // Update customer ticket count
    const currentCount = await this.queries.getCustomerTicketCount(customerId);
    await this.knowledgeSubstrate.insert(
      `<${customerUri}> <${REVOPS_NS}supportTicketCount> "${currentCount + 1}"^^xsd:integer .`
    );

    return ticketUri;
  }

  /**
   * Record feature usage
   * @param {string} customerId - Customer ID
   * @param {string} featureName - Feature name
   * @param {Object} usageData - Usage details
   * @returns {Promise<string>} Usage event URI
   */
  async recordFeatureUsage(customerId, featureName, usageData = {}) {
    this._ensureInitialized();

    const eventId = `${customerId}-${featureName}-${Date.now()}`;
    const eventUri = `${REVOPS_NS}usage/${eventId}`;
    const customerUri = `${REVOPS_NS}customer/${customerId}`;
    const featureUri = `${REVOPS_NS}feature/${featureName}`;
    const timestamp = new Date().toISOString();

    const triples = [
      `<${eventUri}> a <${REVOPS_NS}UsageEvent> .`,
      `<${eventUri}> <${REVOPS_NS}usageCustomer> <${customerUri}> .`,
      `<${eventUri}> <${REVOPS_NS}usageFeature> <${featureUri}> .`,
      `<${eventUri}> <${REVOPS_NS}usageTimestamp> "${timestamp}"^^xsd:dateTime .`,
      // Mark that customer uses this feature
      `<${customerUri}> <${REVOPS_NS}usesFeature> <${featureUri}> .`,
      // Update last activity
      `<${customerUri}> <${REVOPS_NS}lastActivityDate> "${timestamp}"^^xsd:dateTime .`
    ];

    if (usageData.count !== undefined) {
      triples.push(`<${eventUri}> <${REVOPS_NS}usageCount> "${usageData.count}"^^xsd:integer .`);
    }

    await this.knowledgeSubstrate.insert(triples.join('\n'));

    return eventUri;
  }

  /**
   * Calculate overall health score
   * @private
   */
  _calculateHealthScore(churnRate, growthRate) {
    // Health score: 100 = perfect, 0 = critical
    // Lower churn and higher growth = better health
    const churnPenalty = churnRate * 2; // 5% churn = -10 points
    const growthBonus = growthRate * 1.5; // 10% growth = +15 points

    const score = 70 + growthBonus - churnPenalty;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Ensure analytics engine is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('RDFRevOpsAnalytics not initialized. Call initialize() first.');
    }
  }

  /**
   * Close and cleanup
   */
  async close() {
    if (this.knowledgeSubstrate) {
      await this.knowledgeSubstrate.close();
    }
    this.initialized = false;
  }
}

export default RDFRevOpsAnalytics;
