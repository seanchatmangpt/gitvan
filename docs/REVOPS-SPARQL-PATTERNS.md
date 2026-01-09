# RevOps SPARQL Query Patterns

This document provides comprehensive SPARQL query examples for business intelligence using the RevOps ontology.

## Table of Contents

1. [Churn Risk Prediction](#churn-risk-prediction)
2. [Expansion Opportunity Discovery](#expansion-opportunity-discovery)
3. [Lifetime Value Estimation](#lifetime-value-estimation)
4. [Feature Correlation Analysis](#feature-correlation-analysis)
5. [Payment Pattern Analysis](#payment-pattern-analysis)
6. [Cohort Analysis](#cohort-analysis)
7. [Business Health Metrics](#business-health-metrics)

---

## Churn Risk Prediction

### High-Risk Customers with Recommendations

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?customer ?customerId ?name ?riskScore ?recommendation
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:churnRiskScore ?riskScore ;
            revops:isActive true .

  OPTIONAL { ?customer revops:customerName ?name }

  FILTER(?riskScore >= 60)

  # Generate actionable recommendation
  BIND(
    IF(?riskScore >= 80,
       "Urgent: Contact immediately and offer retention incentives",
    IF(?riskScore >= 60,
       "High Priority: Schedule check-in call and review account health",
       "Monitor: Track activity and engagement closely"))
    AS ?recommendation
  )
}
ORDER BY DESC(?riskScore)
```

### Compound Risk Factors

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?customerId ?failedPayments ?tickets ?usagePercent ?daysSinceActivity ?totalRisk
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:isActive true .

  OPTIONAL { ?customer revops:consecutiveFailedPayments ?failedPayments }
  OPTIONAL { ?customer revops:supportTicketCount ?tickets }
  OPTIONAL { ?customer revops:featureUsagePercent ?usagePercent }
  OPTIONAL { ?customer revops:daysSinceLastActivity ?daysSinceActivity }

  # Calculate compound risk
  BIND(
    (COALESCE(?failedPayments, 0) * 10) +
    (COALESCE(?tickets, 0) * 5) +
    (100 - COALESCE(?usagePercent, 50)) +
    (COALESCE(?daysSinceActivity, 0) / 2)
    AS ?totalRisk
  )

  FILTER(?totalRisk > 50)
}
ORDER BY DESC(?totalRisk)
```

### Churn Prediction by Plan Tier

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?planTier (AVG(?riskScore) AS ?avgRisk) (COUNT(?customer) AS ?customerCount)
WHERE {
  ?customer a revops:Customer ;
            revops:isActive true ;
            revops:churnRiskScore ?riskScore ;
            revops:hasPlan ?plan .

  ?plan revops:planTier ?planTier .
}
GROUP BY ?planTier
ORDER BY DESC(?avgRisk)
```

---

## Expansion Opportunity Discovery

### High-Usage Customers Ready for Upgrade

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?customer ?customerId ?name ?currentPlan ?usagePercent ?mrr ?potentialMRR
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:isActive true ;
            revops:hasPlan ?planUri ;
            revops:featureUsagePercent ?usagePercent ;
            revops:monthlyRecurringRevenue ?mrr ;
            revops:signupDate ?signupDate .

  ?planUri revops:planName ?currentPlan ;
           revops:planTier ?currentTier .

  OPTIONAL { ?customer revops:customerName ?name }

  # High usage indicates need for higher tier
  FILTER(?usagePercent >= 75)

  # Must be active for at least 3 months
  BIND((NOW() - ?signupDate) / (60*60*24*30) AS ?activeMonths)
  FILTER(?activeMonths >= 3)

  # Find next tier pricing
  ?nextPlan revops:planTier ?nextTier ;
            revops:monthlyPrice ?potentialMRR .

  # Simple tier ordering (in reality would be more sophisticated)
  FILTER(
    (?currentTier = "starter" && ?nextTier = "professional") ||
    (?currentTier = "professional" && ?nextTier = "enterprise")
  )
}
ORDER BY DESC(?usagePercent)
```

### Customers Using Features Beyond Their Plan

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?customerId ?currentPlan ?usedFeature ?recommendedPlan
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:usesFeature ?feature ;
            revops:hasPlan ?currentPlanUri .

  ?currentPlanUri revops:planName ?currentPlan ;
                  revops:includesFeature ?includedFeature .

  ?feature revops:featureName ?usedFeature .

  # Feature is NOT included in current plan
  FILTER NOT EXISTS {
    ?currentPlanUri revops:includesFeature ?feature .
  }

  # Find plan that includes this feature
  ?recommendedPlanUri revops:includesFeature ?feature ;
                      revops:planName ?recommendedPlan .

  FILTER(?recommendedPlan != ?currentPlan)
}
```

### Expansion Revenue Forecast

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT
  (COUNT(?candidate) AS ?totalCandidates)
  (SUM(?currentMRR) AS ?currentRevenue)
  (SUM(?potentialMRR) AS ?potentialRevenue)
  (SUM(?potentialMRR - ?currentMRR) AS ?expansionOpportunity)
WHERE {
  ?candidate a revops:ExpansionCandidate ;
             revops:monthlyRecurringRevenue ?currentMRR ;
             revops:hasPlan ?currentPlan .

  ?currentPlan revops:planTier ?tier .

  # Estimate potential MRR if they upgrade
  BIND(
    IF(?tier = "starter", 149,
    IF(?tier = "professional", 499,
    999))
    AS ?potentialMRR
  )
}
```

---

## Lifetime Value Estimation

### LTV by Customer Segment

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?planName
       (AVG(?ltv) AS ?avgLTV)
       (AVG(?mrr) AS ?avgMRR)
       (COUNT(?customer) AS ?customerCount)
WHERE {
  ?customer a revops:Customer ;
            revops:lifetimeValue ?ltv ;
            revops:monthlyRecurringRevenue ?mrr ;
            revops:hasPlan ?plan .

  ?plan revops:planName ?planName .
}
GROUP BY ?planName
ORDER BY DESC(?avgLTV)
```

### LTV with Customer Tenure

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?customerId ?name ?ltv ?mrr ?tenureMonths ?actualValue
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:lifetimeValue ?ltv ;
            revops:monthlyRecurringRevenue ?mrr ;
            revops:signupDate ?signup .

  OPTIONAL { ?customer revops:customerName ?name }

  # Calculate tenure
  BIND((NOW() - ?signup) / (60*60*24*30) AS ?tenureMonths)

  # Calculate actual value to date
  BIND(?mrr * ?tenureMonths AS ?actualValue)
}
ORDER BY DESC(?ltv)
```

### LTV vs Acquisition Cost Analysis

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?planName
       (AVG(?ltv) AS ?avgLTV)
       (AVG(?cac) AS ?avgCAC)
       (AVG(?ltv) / AVG(?cac) AS ?ltvCacRatio)
WHERE {
  ?customer a revops:Customer ;
            revops:lifetimeValue ?ltv ;
            revops:acquisitionCost ?cac ;
            revops:hasPlan ?plan .

  ?plan revops:planName ?planName .
}
GROUP BY ?planName
HAVING (AVG(?ltv) / AVG(?cac) > 3)  # Healthy ratio is 3:1 or better
ORDER BY DESC(?ltvCacRatio)
```

---

## Feature Correlation Analysis

### Features Correlated with Revenue

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?featureName ?revenueCorrelation ?churnCorrelation ?adoptionRate ?mau
WHERE {
  ?feature a revops:Feature ;
           revops:featureName ?featureName ;
           revops:revenueCorrelation ?revenueCorrelation .

  OPTIONAL { ?feature revops:churnCorrelation ?churnCorrelation }
  OPTIONAL { ?feature revops:adoptionRate ?adoptionRate }
  OPTIONAL { ?feature revops:monthlyActiveUsers ?mau }

  # Strong positive correlation with revenue
  FILTER(?revenueCorrelation >= 0.6)
}
ORDER BY DESC(?revenueCorrelation)
```

### Feature Adoption vs Revenue

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?featureName
       (AVG(?mrr) AS ?avgRevenueOfUsers)
       (COUNT(?customer) AS ?userCount)
WHERE {
  ?customer a revops:Customer ;
            revops:usesFeature ?feature ;
            revops:monthlyRecurringRevenue ?mrr ;
            revops:isActive true .

  ?feature revops:featureName ?featureName .
}
GROUP BY ?featureName
ORDER BY DESC(?avgRevenueOfUsers)
```

### Under-Adopted High-Value Features

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?featureName ?revenueCorrelation ?adoptionRate ?recommendation
WHERE {
  ?feature a revops:Feature ;
           revops:featureName ?featureName ;
           revops:revenueCorrelation ?revenueCorrelation ;
           revops:adoptionRate ?adoptionRate .

  # High value but low adoption
  FILTER(?revenueCorrelation >= 0.6 && ?adoptionRate < 40)

  BIND("Promote this feature - high value but low adoption. Increase marketing and education."
       AS ?recommendation)
}
ORDER BY DESC(?revenueCorrelation)
```

---

## Payment Pattern Analysis

### Payment Velocity by Customer

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?customerId ?name ?avgPaymentDays ?status
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:averagePaymentDays ?avgPaymentDays ;
            revops:isActive true .

  OPTIONAL { ?customer revops:customerName ?name }

  # Classify payment behavior
  BIND(
    IF(?avgPaymentDays <= 7, "Fast Payer",
    IF(?avgPaymentDays <= 30, "Normal",
    "Slow Payer"))
    AS ?status
  )
}
ORDER BY ?avgPaymentDays
```

### Failed Payment Risk Analysis

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?customerId ?name ?failedPayments ?mrr ?riskLevel
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:consecutiveFailedPayments ?failedPayments ;
            revops:monthlyRecurringRevenue ?mrr ;
            revops:isActive true .

  OPTIONAL { ?customer revops:customerName ?name }

  FILTER(?failedPayments > 0)

  BIND(
    IF(?failedPayments >= 3, "Critical",
    IF(?failedPayments >= 2, "High",
    "Medium"))
    AS ?riskLevel
  )
}
ORDER BY DESC(?failedPayments) DESC(?mrr)
```

### Payment Method Performance

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?paymentMethod
       (COUNT(?payment) AS ?totalPayments)
       (SUM(IF(?status = "succeeded", 1, 0)) AS ?successfulPayments)
       (SUM(IF(?status = "failed", 1, 0)) AS ?failedPayments)
       ((SUM(IF(?status = "succeeded", 1, 0)) * 100.0) / COUNT(?payment) AS ?successRate)
WHERE {
  ?payment a revops:PaymentEvent ;
           revops:paymentMethod ?paymentMethod ;
           revops:paymentStatus ?status .
}
GROUP BY ?paymentMethod
ORDER BY DESC(?successRate)
```

---

## Cohort Analysis

### Monthly Cohort Retention

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?cohortName ?cohortSize ?retentionRate ?avgLTV ?churnCount
WHERE {
  ?cohort a revops:Cohort ;
          revops:cohortName ?cohortName ;
          revops:cohortSize ?cohortSize ;
          revops:cohortRetentionRate ?retentionRate .

  OPTIONAL { ?cohort revops:cohortAverageLTV ?avgLTV }

  # Calculate churn count
  BIND(?cohortSize * (1 - ?retentionRate / 100) AS ?churnCount)
}
ORDER BY ?cohortName
```

### Cohort Comparison

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?month1 ?month2 ?retention1 ?retention2 ?difference
WHERE {
  ?cohort1 a revops:Cohort ;
           revops:cohortName ?month1 ;
           revops:cohortRetentionRate ?retention1 .

  ?cohort2 a revops:Cohort ;
           revops:cohortName ?month2 ;
           revops:cohortRetentionRate ?retention2 .

  # Compare consecutive months
  FILTER(?month2 > ?month1)

  BIND(?retention2 - ?retention1 AS ?difference)
}
ORDER BY ?month1
```

---

## Business Health Metrics

### Overall Business Dashboard

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT
  (SUM(?mrr) AS ?totalMRR)
  (COUNT(DISTINCT ?activeCustomer) AS ?activeCustomers)
  (COUNT(DISTINCT ?highRiskCustomer) AS ?highRiskCustomers)
  (COUNT(DISTINCT ?expansionCandidate) AS ?expansionOpportunities)
  (AVG(?riskScore) AS ?avgChurnRisk)
WHERE {
  ?activeCustomer a revops:Customer ;
                  revops:isActive true ;
                  revops:monthlyRecurringRevenue ?mrr .

  OPTIONAL {
    ?activeCustomer revops:churnRiskScore ?riskScore .
    BIND(IF(?riskScore >= 60, ?activeCustomer, ?unbound) AS ?highRiskCustomer)
  }

  OPTIONAL {
    ?activeCustomer revops:featureUsagePercent ?usage .
    BIND(IF(?usage >= 70, ?activeCustomer, ?unbound) AS ?expansionCandidate)
  }
}
```

### Growth Metrics

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT
  (COUNT(?newCustomer) AS ?newCustomersThisMonth)
  (COUNT(?churnedCustomer) AS ?churnedCustomersThisMonth)
  (COUNT(?expansion) AS ?expansionsThisMonth)
  (SUM(?expansionValue) AS ?expansionRevenue)
WHERE {
  # New customers (signed up in last 30 days)
  OPTIONAL {
    ?newCustomer a revops:Customer ;
                 revops:signupDate ?signupDate .
    FILTER(?signupDate >= NOW() - "P30D"^^xsd:duration)
  }

  # Churned customers
  OPTIONAL {
    ?churnEvent a revops:ChurnEvent ;
                revops:churnCustomer ?churnedCustomer ;
                revops:churnTimestamp ?churnDate .
    FILTER(?churnDate >= NOW() - "P30D"^^xsd:duration)
  }

  # Expansions
  OPTIONAL {
    ?expansion a revops:ExpansionEvent ;
               revops:expansionValue ?expansionValue ;
               revops:expansionTimestamp ?expansionDate .
    FILTER(?expansionDate >= NOW() - "P30D"^^xsd:duration)
  }
}
```

### Customer Health Distribution

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>

SELECT ?healthCategory (COUNT(?customer) AS ?count)
WHERE {
  ?customer a revops:Customer ;
            revops:isActive true ;
            revops:churnRiskScore ?riskScore .

  BIND(
    IF(?riskScore <= 30, "Healthy",
    IF(?riskScore <= 60, "At Risk",
    "High Risk"))
    AS ?healthCategory
  )
}
GROUP BY ?healthCategory
ORDER BY ?healthCategory
```

---

## Advanced Patterns

### Multi-Factor Churn Prediction

```sparql
PREFIX revops: <http://gitvan.org/ontology/revops#>
PREFIX math: <http://www.w3.org/2000/10/swap/math#>

SELECT ?customerId ?predictedChurnProb ?factors
WHERE {
  ?customer a revops:Customer ;
            revops:customerId ?customerId ;
            revops:isActive true .

  # Collect risk factors
  OPTIONAL { ?customer revops:lastPaymentFailed ?paymentFailed }
  OPTIONAL { ?customer revops:featureUsagePercent ?usage }
  OPTIONAL { ?customer revops:daysSinceLastActivity ?daysSinceActivity }
  OPTIONAL { ?customer revops:supportTicketCount ?tickets }

  # Calculate probability (0-100)
  BIND(
    (IF(?paymentFailed = true, 30, 0)) +
    (IF(?usage < 30, 25, IF(?usage < 60, 15, 0))) +
    (IF(?daysSinceActivity > 30, 20, IF(?daysSinceActivity > 14, 10, 0))) +
    (IF(?tickets > 5, 15, IF(?tickets > 2, 8, 0)))
    AS ?predictedChurnProb
  )

  # List contributing factors
  BIND(
    CONCAT(
      IF(?paymentFailed = true, "payment-failure,", ""),
      IF(?usage < 30, "low-usage,", ""),
      IF(?daysSinceActivity > 14, "inactive,", ""),
      IF(?tickets > 2, "high-support,", "")
    )
    AS ?factors
  )

  FILTER(?predictedChurnProb >= 50)
}
ORDER BY DESC(?predictedChurnProb)
```

---

## Notes

- All queries use the RevOps ontology namespace: `http://gitvan.org/ontology/revops#`
- Date/time calculations use XSD duration types
- Correlation values range from -1 (negative) to 1 (positive)
- Risk scores range from 0 (low risk) to 100 (high risk)
- Percentage values are stored as decimals (e.g., 75.5 for 75.5%)

---

**Last Updated**: 2026-01-09
**Version**: 1.0.0
