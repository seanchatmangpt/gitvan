---
name: RevOps Issue
about: Report an issue with RevOps functionality (churn prediction, expansion discovery, etc.)
title: '[RevOps] '
labels: revops, phase-3
assignees: ''
---

## Issue Type

<!-- Select one -->
- [ ] Churn Prediction Issue
- [ ] Expansion Discovery Issue
- [ ] Customer Segmentation Issue
- [ ] Feature Analysis Issue
- [ ] LTV Estimation Issue
- [ ] Customer Journey Issue
- [ ] Other RevOps Functionality

## Description

<!-- Clear and concise description of the issue -->

## Customer/Entity Details

**Customer ID:** <!-- If applicable -->
**Segment:** <!-- e.g., SMB, Mid-Market, Enterprise -->
**Plan:** <!-- e.g., Basic, Professional, Enterprise -->
**MRR:** <!-- Monthly Recurring Revenue -->

## RDF Query

<!-- If issue involves SPARQL query, paste it here -->
```sparql

```

## Expected Behavior

<!-- What should happen? -->

## Actual Behavior

<!-- What actually happens? -->

## Steps to Reproduce

1.
2.
3.

## Sample Data

<!-- Provide sample RDF data (anonymized) -->
```turtle
@prefix revops: <https://gitvan.dev/revops#> .
@prefix customer: <https://gitvan.dev/customer#> .

:customer-123 a revops:Customer ;
  revops:name "Example Corp" ;
  revops:plan "professional" ;
  revops:monthlyRecurringRevenue 5000 .
```

## Churn Risk Details (if applicable)

**Churn Score:** <!-- Current churn risk score -->
**Risk Level:** <!-- High, Medium, Low -->
**Contributing Factors:**
- [ ] Payment failed
- [ ] Support tickets > threshold
- [ ] Low feature usage
- [ ] Inactivity
- [ ] Other: <!-- Please describe -->

**Recommended Intervention:** <!-- What action was recommended? -->

## Expansion Opportunity Details (if applicable)

**Current Plan:**
**Recommended Plan:**
**Extra Features Used:** <!-- Features customer uses but plan doesn't include -->
**Potential Revenue Lift:** <!-- Additional MRR -->

## Cohort Analysis Details (if applicable)

**Cohort:** <!-- e.g., Q1-2025 -->
**Cohort Size:**
**Avg MRR:**
**Avg Churn Risk:**

## Feature Analysis Details (if applicable)

**Feature ID:**
**Adoption Rate:**
**Revenue Correlation:**
**Churn Impact:**

## N3 Rules Applied

<!-- Which N3 rules were evaluated? -->
- [ ] High risk detection rule
- [ ] Onboarding needed rule
- [ ] Expansion ready rule
- [ ] Payment pattern rule
- [ ] Other: <!-- Please describe -->

## Performance Impact

<!-- If issue affects performance -->
**Query Time:** <!-- e.g., 500ms -->
**Performance Target:** <!-- e.g., < 500ms -->
**Exceeds Target By:** <!-- e.g., +20% -->

## Environment

- **Node Version:**
- **GitVan Version:**
- **UnRDF Version:**
- **Database Size:** <!-- Number of customers, events, etc. -->

## Logs/Screenshots

<!-- Add relevant logs or screenshots -->

## Suggested Solution

<!-- How might this be fixed or improved? -->

## Impact

<!-- Who/what is affected by this issue? -->
- **Affected Customers:**
- **Revenue at Risk:**
- **Urgency:** <!-- Low, Medium, High, Critical -->

## Additional Context

<!-- Any other relevant information -->

## Related Issues

<!-- Link to related issues -->
