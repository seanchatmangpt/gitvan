# Develop: Conjoint Analysis

## What is Conjoint Analysis?

**Conjoint analysis** is a statistical technique used in market research to determine how people value different attributes (features, functions, benefits) that make up an individual product or service.

The primary objective is to understand the trade-offs that customers are willing to make. It forces them to make choices between different product configurations, and by analyzing their choices, we can deconstruct their preferences and calculate the **part-worth utility** of each individual attribute.

It helps answer questions like:

*   Which features are most important to customers?
*   What is the optimal combination of features to include in a product?
*   How much are customers willing to "pay" (in terms of price or satisfaction) for a specific feature?

## GitVan v3.0 Case Study: Prioritizing Enterprise Features

The GitVan v3 team is planning the features for their "Enterprise" edition. They have a long list of potential features but a limited budget and timeline. They need a data-driven way to decide which features to prioritize.

**The Goal:** Determine which combination of Enterprise features provides the most value to potential customers.

### The Attributes and Levels

The team identifies four key feature areas they are considering for the Enterprise edition:

| Attribute | Level 1 | Level 2 | Level 3 |
| :--- | :--- | :--- | :--- |
| **1. Security** | Standard | Audit Logging | Enterprise SSO |
| **2. Scalability** | Standard | Distributed Execution | Load Balancing |
| **3. Collaboration**| Standard | Team Workspaces | Real-time Collaboration |
| **4. Support** | Community | Business Hours (Email) | 24/7 (Phone & Chat) |

### The Conjoint Study Design

It would be impractical to ask users to rank all possible combinations (3 x 3 x 3 x 3 = 81). Instead, conjoint analysis uses a fractional factorial design to create a small, manageable set of hypothetical product profiles.

The team creates a survey with ~10-15 choice tasks. In each task, the user is shown two or three different product profiles and asked to choose the one they would prefer.

**Sample Choice Task:**

| | **Package A** | **Package B** |
| :--- | :--- | :--- |
| **Security** | Audit Logging | Enterprise SSO |
| **Scalability** | Distributed Execution | Standard |
| **Collaboration**| Real-time Collaboration | Team Workspaces |
| **Support** | Community | 24/7 (Phone & Chat) |
| **Your Choice:** | [ ] | [ ] |

They send this survey to 100 potential enterprise customers.

### Analysis of the Results

After collecting the survey responses, they use statistical software to perform a conjoint analysis. The output of the analysis is a set of **part-worth utilities** for each level of each attribute.

**Part-Worth Utilities (Example Results):**

| Attribute | Level | Utility Score |
| :--- | :--- | :--- |
| **Security** | Standard | 0 |
| | Audit Logging | 25 |
| | **Enterprise SSO** | **60** |
| **Scalability** | Standard | 0 |
| | Distributed Execution | 15 |
| | Load Balancing | 20 |
| **Collaboration**| Standard | 0 |
| | **Team Workspaces** | **45** |
| | Real-time Collaboration | 50 |
| **Support** | Community | 0 |
| | Business Hours (Email) | 30 |
| | **24/7 (Phone & Chat)** | **35** |

**Relative Importance of Attributes:**

*   **Security:** (60 - 0) = 60 -> **41%**
*   **Collaboration:** (50 - 0) = 50 -> **34%**
*   **Support:** (35 - 0) = 35 -> **24%**
*   **Scalability:** (20 - 0) = 20 -> **1%**
*   **Total Importance:** 146

### Interpretation and Strategic Decisions

The results of the conjoint analysis provide clear, actionable insights for the product team:

1.  **Security is the Most Important Driver:** The range of utility for the Security attribute is the largest (60), making it the most important factor in a customer's decision. Specifically, **Enterprise SSO** is a must-have feature.

2.  **Collaboration is a Close Second:** Team features are highly valued. Interestingly, the jump from "Standard" to **"Team Workspaces"** provides most of the value (45 utility points). "Real-time Collaboration" adds only a little more value (5 points), suggesting it might be a lower priority or a "nice-to-have."

3.  **Scalability is Not a Key Differentiator (Yet):** The features related to Scalability have very low utility scores. This suggests that while these features might be technically impressive, they are not what customers are currently prioritizing. The team can likely de-prioritize Load Balancing and Distributed Execution for the initial Enterprise release.

4.  **Support Matters:** 24/7 support is a significant driver of value.

### Designing the Optimal Product Package

Based on this analysis, the team can design an initial Enterprise package that maximizes customer value within their budget constraints.

**The "Must-Have" Enterprise Package:**

*   **Security:** Enterprise SSO (Utility: 60)
*   **Collaboration:** Team Workspaces (Utility: 45)
*   **Support:** 24/7 (Phone & Chat) (Utility: 35)
*   **Scalability:** Standard (Utility: 0)

**Total Utility:** 60 + 45 + 35 + 0 = **140**

This package delivers the vast majority of the total possible utility to the customer while allowing the team to defer the development effort for complex features that customers don't value as highly (like Load Balancing and Real-time Collaboration). Conjoint analysis allowed them to make a data-driven trade-off, ensuring their development effort is spent on the features that will have the biggest impact on the customer's purchase decision.
