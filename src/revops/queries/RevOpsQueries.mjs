/**
 * RevOpsQueries - SPARQL query library for business intelligence
 *
 * Provides specialized queries for:
 * - Churn prediction and risk analysis
 * - Expansion opportunity discovery
 * - Cohort analysis and retention
 * - Feature correlation to revenue
 * - LTV estimation
 * - Payment pattern analysis
 * - Business health metrics
 */

const REVOPS_NS = 'http://gitvan.org/ontology/revops#';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';

export class RevOpsQueries {
  constructor(knowledgeSubstrate) {
    this.ks = knowledgeSubstrate;
  }

  /**
   * Get high-risk customers (churn prediction)
   * @param {number} minRiskScore - Minimum risk score threshold (default: 60)
   * @returns {Promise<Array>} List of high-risk customers
   */
  async getHighRiskCustomers(minRiskScore = 60) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?customer ?customerId ?name ?riskScore ?recommendation
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId ?customerId ;
                  revops:churnRiskScore ?riskScore ;
                  revops:isActive true .

        OPTIONAL { ?customer revops:customerName ?name }

        FILTER(?riskScore >= ${minRiskScore})

        # Generate recommendation based on risk factors
        BIND(
          IF(?riskScore >= 80, "Urgent: Contact immediately and offer retention incentives",
          IF(?riskScore >= 60, "High Priority: Schedule check-in call and review account health",
          "Monitor: Track activity and engagement closely"))
          AS ?recommendation
        )
      }
      ORDER BY DESC(?riskScore)
    `;

    return await this.ks.query(query);
  }

  /**
   * Predict churn probability for specific customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Churn prediction details
   */
  async predictChurnProbability(customerId) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?customer ?riskScore ?lastActivity ?failedPayments ?ticketCount ?usagePercent
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId "${customerId}" .

        OPTIONAL { ?customer revops:churnRiskScore ?riskScore }
        OPTIONAL { ?customer revops:lastActivityDate ?lastActivity }
        OPTIONAL { ?customer revops:consecutiveFailedPayments ?failedPayments }
        OPTIONAL { ?customer revops:supportTicketCount ?ticketCount }
        OPTIONAL { ?customer revops:featureUsagePercent ?usagePercent }
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || null;
  }

  /**
   * Find customers ready for upsell/expansion
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} List of upsell candidates
   */
  async findUpsellCandidates(options = {}) {
    const minUsagePercent = options.minUsagePercent || 60;
    const minActiveMonths = options.minActiveMonths || 3;

    const query = `
      PREFIX revops: <${REVOPS_NS}>
      PREFIX xsd: <${XSD_NS}>

      SELECT ?customer ?customerId ?name ?currentPlan ?usagePercent ?mrr ?recommendation
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId ?customerId ;
                  revops:isActive true ;
                  revops:hasPlan ?planUri ;
                  revops:featureUsagePercent ?usagePercent ;
                  revops:signupDate ?signupDate .

        ?planUri revops:planName ?currentPlan .

        OPTIONAL { ?customer revops:customerName ?name }
        OPTIONAL { ?customer revops:monthlyRecurringRevenue ?mrr }

        # High usage indicates need for higher tier
        FILTER(?usagePercent >= ${minUsagePercent})

        # Must be active for minimum period
        BIND((NOW() - ?signupDate) / (60*60*24*30) AS ?activeMonths)
        FILTER(?activeMonths >= ${minActiveMonths})

        # Generate recommendation
        BIND(
          IF(?usagePercent >= 80, "Strong candidate: Using most features, suggest premium tier",
          IF(?usagePercent >= 60, "Good candidate: High usage, offer advanced features",
          "Monitor: Track usage trends"))
          AS ?recommendation
        )
      }
      ORDER BY DESC(?usagePercent)
    `;

    return await this.ks.query(query);
  }

  /**
   * Get expansion likelihood for specific customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Expansion analysis
   */
  async getExpansionLikelihood(customerId) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?customer ?likelihood ?currentPlan ?usagePercent ?mrr
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId "${customerId}" .

        OPTIONAL { ?customer revops:expansionLikelihood ?likelihood }
        OPTIONAL { ?customer revops:hasPlan/revops:planName ?currentPlan }
        OPTIONAL { ?customer revops:featureUsagePercent ?usagePercent }
        OPTIONAL { ?customer revops:monthlyRecurringRevenue ?mrr }
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || null;
  }

  /**
   * Analyze customer cohorts
   * @returns {Promise<Array>} Cohort data with retention metrics
   */
  async analyzeCohorts() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?cohortName ?size ?retentionRate ?avgLTV
      WHERE {
        ?cohort a revops:Cohort ;
                revops:cohortName ?cohortName .

        OPTIONAL { ?cohort revops:cohortSize ?size }
        OPTIONAL { ?cohort revops:cohortRetentionRate ?retentionRate }
        OPTIONAL { ?cohort revops:cohortAverageLTV ?avgLTV }
      }
      ORDER BY ?cohortName
    `;

    return await this.ks.query(query);
  }

  /**
   * Compare retention between two cohorts
   * @param {string} cohort1 - First cohort name
   * @param {string} cohort2 - Second cohort name
   * @returns {Promise<Object>} Comparison data
   */
  async compareRetention(cohort1, cohort2) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?cohort1Name ?cohort1Retention ?cohort2Name ?cohort2Retention ?difference
      WHERE {
        ?c1 a revops:Cohort ;
            revops:cohortName "${cohort1}" ;
            revops:cohortRetentionRate ?cohort1Retention .

        ?c2 a revops:Cohort ;
            revops:cohortName "${cohort2}" ;
            revops:cohortRetentionRate ?cohort2Retention .

        BIND("${cohort1}" AS ?cohort1Name)
        BIND("${cohort2}" AS ?cohort2Name)
        BIND((?cohort1Retention - ?cohort2Retention) AS ?difference)
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || null;
  }

  /**
   * Correlate features to revenue
   * @returns {Promise<Array>} Feature correlation data
   */
  async correlateFeaturesToRevenue() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?featureName ?revenueCorrelation ?churnCorrelation ?adoptionRate ?mau
      WHERE {
        ?feature a revops:Feature ;
                 revops:featureName ?featureName .

        OPTIONAL { ?feature revops:revenueCorrelation ?revenueCorrelation }
        OPTIONAL { ?feature revops:churnCorrelation ?churnCorrelation }
        OPTIONAL { ?feature revops:adoptionRate ?adoptionRate }
        OPTIONAL { ?feature revops:monthlyActiveUsers ?mau }
      }
      ORDER BY DESC(?revenueCorrelation)
    `;

    return await this.ks.query(query);
  }

  /**
   * Find high-value features (strong revenue correlation)
   * @param {number} minCorrelation - Minimum correlation threshold
   * @returns {Promise<Array>} High-value features
   */
  async findHighValueFeatures(minCorrelation = 0.5) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?featureName ?revenueCorrelation ?adoptionRate ?recommendation
      WHERE {
        ?feature a revops:Feature ;
                 revops:featureName ?featureName ;
                 revops:revenueCorrelation ?revenueCorrelation .

        OPTIONAL { ?feature revops:adoptionRate ?adoptionRate }

        FILTER(?revenueCorrelation >= ${minCorrelation})

        BIND(
          IF(?adoptionRate < 30, "Promote this feature - high value but low adoption",
          IF(?adoptionRate < 60, "Continue marketing - valuable feature gaining traction",
          "Success - high value and high adoption"))
          AS ?recommendation
        )
      }
      ORDER BY DESC(?revenueCorrelation)
    `;

    return await this.ks.query(query);
  }

  /**
   * Estimate lifetime value for customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<number>} Estimated LTV
   */
  async estimateLifetimeValue(customerId) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?customer ?ltv ?mrr ?plan
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId "${customerId}" .

        OPTIONAL { ?customer revops:lifetimeValue ?ltv }
        OPTIONAL { ?customer revops:monthlyRecurringRevenue ?mrr }
        OPTIONAL { ?customer revops:hasPlan/revops:planName ?plan }
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || null;
  }

  /**
   * Predict LTV by customer segment
   * @returns {Promise<Array>} LTV by segment
   */
  async predictLTVBySegment() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?planName (AVG(?ltv) AS ?avgLTV) (COUNT(?customer) AS ?customerCount)
      WHERE {
        ?customer a revops:Customer ;
                  revops:hasPlan ?plan ;
                  revops:lifetimeValue ?ltv .

        ?plan revops:planName ?planName .
      }
      GROUP BY ?planName
      ORDER BY DESC(?avgLTV)
    `;

    return await this.ks.query(query);
  }

  /**
   * Analyze payment patterns
   * @returns {Promise<Object>} Payment pattern analysis
   */
  async getPaymentPatterns() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT
        (AVG(?avgDays) AS ?overallAvgPaymentDays)
        (COUNT(?earlyPayer) AS ?earlyPayerCount)
        (COUNT(?latePayer) AS ?latePayerCount)
      WHERE {
        ?customer a revops:Customer ;
                  revops:isActive true .

        OPTIONAL {
          ?customer revops:averagePaymentDays ?avgDays .
          BIND(IF(?avgDays <= 7, ?customer, ?unbound) AS ?earlyPayer)
          BIND(IF(?avgDays > 30, ?customer, ?unbound) AS ?latePayer)
        }
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || {};
  }

  /**
   * Detect payment anomalies
   * @returns {Promise<Array>} Customers with payment issues
   */
  async detectPaymentAnomalies() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?customerId ?name ?failedPayments ?avgDays ?mrr
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId ?customerId ;
                  revops:isActive true .

        OPTIONAL { ?customer revops:customerName ?name }
        OPTIONAL { ?customer revops:consecutiveFailedPayments ?failedPayments }
        OPTIONAL { ?customer revops:averagePaymentDays ?avgDays }
        OPTIONAL { ?customer revops:monthlyRecurringRevenue ?mrr }

        # Flag if failed payments OR unusually slow payment
        FILTER(?failedPayments > 0 || ?avgDays > 45)
      }
      ORDER BY DESC(?failedPayments) DESC(?avgDays)
    `;

    return await this.ks.query(query);
  }

  /**
   * Get monthly recurring revenue (MRR)
   * @returns {Promise<number>} Total MRR
   */
  async getMonthlyRecurringRevenue() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT (SUM(?mrr) AS ?totalMRR)
      WHERE {
        ?customer a revops:Customer ;
                  revops:isActive true ;
                  revops:monthlyRecurringRevenue ?mrr .
      }
    `;

    const results = await this.ks.query(query);
    return results[0]?.totalMRR || 0;
  }

  /**
   * Calculate month-over-month growth rate
   * @returns {Promise<number>} Growth rate percentage
   */
  async getGrowthRate() {
    // This is simplified - in production you'd compare current vs previous month
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT
        (COUNT(?newCustomer) AS ?newCustomers)
        (COUNT(?churnedCustomer) AS ?churnedCustomers)
      WHERE {
        OPTIONAL {
          ?newCustomer a revops:Customer ;
                      revops:signupDate ?signupDate .
          FILTER(?signupDate >= NOW() - "P30D"^^xsd:duration)
        }

        OPTIONAL {
          ?churnEvent a revops:ChurnEvent ;
                      revops:churnCustomer ?churnedCustomer ;
                      revops:churnTimestamp ?churnDate .
          FILTER(?churnDate >= NOW() - "P30D"^^xsd:duration)
        }
      }
    `;

    const results = await this.ks.query(query);
    const data = results[0] || { newCustomers: 0, churnedCustomers: 0 };

    // Simplified growth calculation
    const netGrowth = data.newCustomers - data.churnedCustomers;
    const totalCustomers = await this.getActiveCustomerCount();

    return totalCustomers > 0 ? (netGrowth / totalCustomers) * 100 : 0;
  }

  /**
   * Calculate churn rate
   * @returns {Promise<number>} Churn rate percentage
   */
  async getChurnRate() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT
        (COUNT(DISTINCT ?customer) AS ?totalCustomers)
        (COUNT(DISTINCT ?churnedCustomer) AS ?churnedCustomers)
      WHERE {
        ?customer a revops:Customer .

        OPTIONAL {
          ?churnEvent a revops:ChurnEvent ;
                      revops:churnCustomer ?churnedCustomer ;
                      revops:churnTimestamp ?churnDate .
          # Last 30 days
          FILTER(?churnDate >= NOW() - "P30D"^^xsd:duration)
        }
      }
    `;

    const results = await this.ks.query(query);
    const data = results[0] || { totalCustomers: 0, churnedCustomers: 0 };

    return data.totalCustomers > 0
      ? (data.churnedCustomers / data.totalCustomers) * 100
      : 0;
  }

  /**
   * Get active customer count
   * @returns {Promise<number>} Number of active customers
   */
  async getActiveCustomerCount() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT (COUNT(?customer) AS ?count)
      WHERE {
        ?customer a revops:Customer ;
                  revops:isActive true .
      }
    `;

    const results = await this.ks.query(query);
    return results[0]?.count || 0;
  }

  /**
   * Get high-risk customer count
   * @returns {Promise<number>} Number of high-risk customers
   */
  async getHighRiskCustomerCount() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT (COUNT(?customer) AS ?count)
      WHERE {
        ?customer a revops:Customer ;
                  revops:isActive true ;
                  revops:churnRiskScore ?score .
        FILTER(?score >= 60)
      }
    `;

    const results = await this.ks.query(query);
    return results[0]?.count || 0;
  }

  /**
   * Get expansion candidate count
   * @returns {Promise<number>} Number of expansion candidates
   */
  async getExpansionCandidateCount() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT (COUNT(?customer) AS ?count)
      WHERE {
        ?customer a revops:Customer ;
                  revops:isActive true ;
                  revops:featureUsagePercent ?usage .
        FILTER(?usage >= 60)
      }
    `;

    const results = await this.ks.query(query);
    return results[0]?.count || 0;
  }

  /**
   * Get customer data
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Customer data
   */
  async getCustomerData(customerId) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT *
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId "${customerId}" .

        OPTIONAL { ?customer revops:customerName ?name }
        OPTIONAL { ?customer revops:customerEmail ?email }
        OPTIONAL { ?customer revops:hasPlan/revops:planName ?plan }
        OPTIONAL { ?customer revops:monthlyRecurringRevenue ?monthlyRecurringRevenue }
        OPTIONAL { ?customer revops:isActive ?isActive }
        OPTIONAL { ?customer revops:churnRiskScore ?churnRiskScore }
        OPTIONAL { ?customer revops:lastPaymentFailed ?lastPaymentFailed }
        OPTIONAL { ?customer revops:consecutiveFailedPayments ?consecutiveFailedPayments }
        OPTIONAL { ?customer revops:supportTicketCount ?supportTicketCount }
        OPTIONAL { ?customer revops:featureUsagePercent ?featureUsagePercent }
        OPTIONAL { ?customer revops:lastActivityDate ?lastActivityDate }
        OPTIONAL { ?customer revops:daysSinceLastActivity ?daysSinceLastActivity }
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || null;
  }

  /**
   * Get average customer lifespan by plan
   * @param {string} planName - Plan name
   * @returns {Promise<number>} Average lifespan in months
   */
  async getAverageLifespanByPlan(planName) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT (AVG(?months) AS ?avgMonths)
      WHERE {
        ?customer a revops:Customer ;
                  revops:hasPlan ?plan ;
                  revops:signupDate ?signup .

        ?plan revops:planName "${planName}" .

        OPTIONAL {
          ?churnEvent a revops:ChurnEvent ;
                      revops:churnCustomer ?customer ;
                      revops:churnTimestamp ?churn .
          BIND((xsd:integer(?churn) - xsd:integer(?signup)) / (60*60*24*30) AS ?months)
        }
      }
    `;

    const results = await this.ks.query(query);
    // Default to 24 months if no churn data
    return results[0]?.avgMonths || 24;
  }

  /**
   * Get all features
   * @returns {Promise<Array>} List of features
   */
  async getAllFeatures() {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT ?featureName
      WHERE {
        ?feature a revops:Feature ;
                 revops:featureName ?featureName .
      }
    `;

    return await this.ks.query(query);
  }

  /**
   * Get feature metrics
   * @param {string} featureName - Feature name
   * @returns {Promise<Object>} Feature metrics
   */
  async getFeatureMetrics(featureName) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT *
      WHERE {
        ?feature a revops:Feature ;
                 revops:featureName "${featureName}" .

        OPTIONAL { ?feature revops:adoptionRate ?adoptionRate }
        OPTIONAL { ?feature revops:monthlyActiveUsers ?monthlyActiveUsers }
        OPTIONAL { ?feature revops:revenueCorrelation ?revenueCorrelation }
        OPTIONAL { ?feature revops:churnCorrelation ?churnCorrelation }
      }
    `;

    const results = await this.ks.query(query);
    return results[0] || {};
  }

  /**
   * Get customer ticket count
   * @param {string} customerId - Customer ID
   * @returns {Promise<number>} Ticket count
   */
  async getCustomerTicketCount(customerId) {
    const query = `
      PREFIX revops: <${REVOPS_NS}>

      SELECT (COUNT(?ticket) AS ?count)
      WHERE {
        ?customer a revops:Customer ;
                  revops:customerId "${customerId}" .

        ?ticket a revops:SupportTicket ;
                revops:ticketCustomer ?customer .
      }
    `;

    const results = await this.ks.query(query);
    return results[0]?.count || 0;
  }
}

export default RevOpsQueries;
