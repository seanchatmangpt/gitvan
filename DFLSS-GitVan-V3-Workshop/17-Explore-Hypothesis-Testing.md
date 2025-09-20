# Explore: Hypothesis Testing

## What is Hypothesis Testing?

Hypothesis testing is a formal statistical method used to make decisions based on data. It provides a structured way to test an assumption (a "hypothesis") about a population. The core idea is to determine if there is enough evidence in a sample of data to infer that a certain condition is true for the entire population.

## GitVan v3.0 Case Study Application: A/B Testing a Knowledge Hook Output

The GitVan v3 team has created a Knowledge Hook that runs on `pre-push` and checks for open critical issues in Jira. If it finds any, it blocks the push. They have two competing designs for the output message that is displayed to the user.

*   **Design A (Verbose):** Shows a detailed table with the issue key, summary, assignee, and status for each critical issue found.
*   **Design B (Minimal):** Shows a single summary line (e.g., "❌ Push blocked: 3 critical issues found. Run `gitvan issues list --critical` for details.") and provides a command to get more information.

The team believes the minimal design is better because it's less noisy and provides a clear action for the user, but they need data to prove it.

### The Experiment (A/B Test)

*   **Metric:** They decide to measure the **task completion time** for a common user story: "After a blocked push, find the key of the first critical issue."
*   **Setup:** They recruit 20 developers. 10 are randomly assigned to see Design A, and 10 are assigned to see Design B.
*   **Data:** They measure the time (in seconds) from when the push is blocked to when the user correctly identifies the first issue key.

### Stating the Hypotheses

*   **Null Hypothesis (H₀):** There is no difference in the mean task completion time between Design A and Design B. (μ_A = μ_B)
*   **Alternative Hypothesis (H₁):** The mean task completion time for Design B is less than for Design A. (μ_B < μ_A)
*   **Significance Level (α):** 0.05

### The Data (Task Completion Time in seconds)

*   **Design A:** `[4.5, 5.1, 4.8, 5.5, 4.9, 5.3, 5.8, 4.7, 5.2, 5.0]`
    *   Mean (μ_A) = 5.08 s
    *   Std Dev (σ_A) = 0.38 s
*   **Design B:** `[3.1, 2.8, 3.5, 2.9, 3.3, 3.0, 2.7, 3.2, 3.6, 2.9]`
    *   Mean (μ_B) = 3.10 s
    *   Std Dev (σ_B) = 0.29 s

### Analysis (2-Sample t-Test)

A 2-sample t-test is the appropriate statistical test to compare the means of two independent groups.

```python
from scipy import stats

group_a = [4.5, 5.1, 4.8, 5.5, 4.9, 5.3, 5.8, 4.7, 5.2, 5.0]
group_b = [3.1, 2.8, 3.5, 2.9, 3.3, 3.0, 2.7, 3.2, 3.6, 2.9]

# Perform the 2-sample t-test
# We use alternative='less' because our H1 is that B is less than A
t_statistic, p_value = stats.ttest_ind(group_b, group_a, equal_var=False, alternative='less')

print(f"T-statistic: {t_statistic:.4f}")
print(f"P-value: {p_value:.4f}")
```

### Results

*   **T-statistic:** -12.55
*   **P-value:** 0.0000006

### Decision and Conclusion

1.  **Compare p-value to α:** Our p-value (0.0000006) is vastly smaller than our significance level α (0.05).

2.  **Make a Decision:** Because the p-value is less than α, we **reject the null hypothesis**.

3.  **Conclusion:** We have statistically significant evidence to conclude that the mean task completion time for **Design B is lower than for Design A**. The observed difference is not due to random chance.

Based on this data-driven result, the GitVan v3 team can confidently choose **Design B** for the Knowledge Hook output, knowing that it measurably improves user efficiency. Hypothesis testing allowed them to move from a subjective opinion ("we think minimal is better") to an objective, defensible design decision.
