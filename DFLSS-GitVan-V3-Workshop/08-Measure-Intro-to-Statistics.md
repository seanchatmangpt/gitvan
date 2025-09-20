# Measure: Intro to Statistics for Software Development

## From Minitab to Code: Statistical Analysis in Software

In traditional Lean Six Sigma, statistical software like Minitab is a cornerstone of the Measure and Analyze phases. In the context of software development, we have an even more powerful tool at our disposal: **code**. We can use libraries within Python (like `pandas`, `numpy`, `matplotlib`) or JavaScript to perform the same statistical analyses directly on our project's data.

This module introduces the fundamental statistical concepts that we will use to measure and analyze the GitVan v3 development process and the product itself.

### Why Use Statistics in Software Development?

*   **Objective Decision-Making:** Move from gut feelings to data-driven decisions.
*   **Process Understanding:** Understand the performance and variation in our development processes.
*   **Performance Tuning:** Identify bottlenecks and opportunities for optimization.
*   **Quality Improvement:** Quantify and track the quality of our product and processes.

### Key Statistical Concepts

1.  **Descriptive Statistics:** Summarizing data.
    *   **Measures of Central Tendency:** Mean (average), Median (midpoint), Mode (most frequent).
    *   **Measures of Dispersion:** Standard Deviation (spread of the data), Variance, Range.

2.  **Inferential Statistics:** Making predictions or inferences about a population from a sample.
    *   **Hypothesis Testing:** Testing an assumption about a population.
    *   **Confidence Intervals:** Estimating a population parameter with a certain level of confidence.
    *   **Regression Analysis:** Modeling the relationship between variables.

### GitVan v3.0 Case Study Application: Analyzing CLI Performance

Let's say we want to understand the performance of the `gitvan save` command. We collect the execution time (in milliseconds) for 100 recent runs.

**Raw Data (Sample):** `[85, 92, 78, 110, 95, 88, 99, 105, 81, 94, ...]`

#### 1. Descriptive Statistics

We can use a simple script to calculate descriptive statistics:

```python
import numpy as np

data = [85, 92, 78, 110, 95, 88, 99, 105, 81, 94, ...] # 100 data points

mean = np.mean(data)
median = np.median(data)
std_dev = np.std(data)

print(f"Mean: {mean:.2f} ms")
print(f"Median: {median:.2f} ms")
print(f"Standard Deviation: {std_dev:.2f} ms")
```

**Results:**
*   **Mean:** 95.3 ms
*   **Median:** 94.5 ms
*   **Standard Deviation:** 8.7 ms

**Interpretation:** The average execution time is 95.3 ms. The standard deviation tells us that most of the data points are clustered closely around the average, indicating a relatively consistent performance.

#### 2. Data Visualization: Histogram

A histogram helps us visualize the distribution of the data.

```python
import matplotlib.pyplot as plt

plt.hist(data, bins=10, edgecolor='black')
plt.title('Distribution of `gitvan save` Execution Times')
plt.xlabel('Execution Time (ms)')
plt.ylabel('Frequency')
plt.show()
```

This would likely show a roughly normal distribution centered around 95 ms, confirming our descriptive statistics.

#### 3. Inferential Statistics: Setting a Performance Target

Our CTQ for this command is a p99 latency of < 100ms. We can use our sample data to infer if we are meeting this target.

We can calculate the 99th percentile from our data:

```python
percentile_99 = np.percentile(data, 99)
print(f"99th Percentile: {percentile_99:.2f} ms")
```

**Result:** `99th Percentile: 115.4 ms`

**Interpretation:** This result tells us that 99% of the `save` commands completed in under 115.4 ms. This is **above our target of 100 ms**. This is a data-driven insight! It tells us that while the *average* performance is good, the tail-end latency is too high. This allows us to focus our optimization efforts not on the average case, but on the worst-case scenarios that are breaching our performance budget.

This simple example demonstrates how basic statistics can transform vague goals ("make it fast") into precise, actionable engineering tasks ("reduce the p99 latency of the `save` command from 115ms to below 100ms"). In the following modules, we will explore more advanced statistical tools to further analyze and improve the GitVan v3 project.
