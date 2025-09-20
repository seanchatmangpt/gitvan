# Explore: Regression and Multi-Vari Analysis

## Regression Analysis: Modeling Relationships

**Regression analysis** is a statistical method used to model the relationship between a dependent variable (the outcome we want to predict) and one or more independent variables (the factors we think influence the outcome).

## GitVan v3.0 Case Study: Predicting Knowledge Hook Evaluation Time

The GitVan v3 team is concerned about the performance of the Knowledge Hook engine. They want to understand the key factors that contribute to the evaluation time of a hook so they can focus their optimization efforts.

*   **Dependent Variable (Y):** Hook Evaluation Time (in ms).
*   **Independent Variables (X):**
    *   `X1`: Number of active Knowledge Hooks in the repository.
    *   `X2`: Number of triples in the knowledge graph (in thousands).
    *   `X3`: Complexity of the SPARQL query (e.g., number of clauses).

### The Experiment and Data

The team runs a series of tests with different configurations and collects the data:

| Evaluation Time (Y) | # Hooks (X1) | # Triples (X2) | Query Complexity (X3) |
| :---: | :---: | :---: | :---: |
| 150 | 10 | 50 | 5 |
| 250 | 20 | 100 | 10 |
| 350 | 30 | 150 | 15 |
| 200 | 15 | 80 | 8 |
| ... | ... | ... | ... |

### Multiple Regression Analysis

They use a statistical package to perform a multiple regression analysis on this data.

**The Resulting Equation:**

`Evaluation Time = 50 + (2 * # Hooks) + (0.5 * # Triples) + (10 * Query Complexity)`

**Statistical Output:**

*   **R-squared:** 0.92 (This means that 92% of the variation in Evaluation Time can be explained by our three independent variables. This is a very good model.)
*   **P-values for coefficients:** All p-values are < 0.05, meaning each variable has a statistically significant impact on evaluation time.

### Interpretation and Action

The regression equation is a powerful tool for the team:

1.  **Understanding the Drivers:** The coefficients tell them the magnitude of each factor's impact.
    *   For every **1 hook** added, the evaluation time increases by **2 ms**.
    *   For every **1000 triples** added, the evaluation time increases by **0.5 ms**.
    *   For every **1 clause** added to the SPARQL query, the evaluation time increases by **10 ms**.

2.  **Focusing Optimization Efforts:** The equation clearly shows that the **complexity of the SPARQL query** is the single biggest contributor to evaluation time. This is a critical insight. The team should focus on **optimizing SPARQL queries** and providing developers with tools to analyze and simplify their queries.

3.  **Predictive Modeling:** They can now predict the evaluation time for different scenarios. For example, for an enterprise customer with 100 active hooks, a 1 million triple knowledge graph, and an average query complexity of 20 clauses:
    `Time = 50 + (2 * 100) + (0.5 * 1000) + (10 * 20) = 50 + 200 + 500 + 200 = 950 ms`
    A predicted evaluation time of almost 1 second might be unacceptable, leading them to invest in a caching layer for the SPARQL engine.

---

## Multi-Vari Analysis: Visualizing Sources of Variation

**Multi-Vari analysis** is a graphical tool used to visualize the sources of variation in a process.

### GitVan v3.0 Case Study: Analyzing Knowledge Hook Evaluation Latency

The team wants to understand the sources of variation in the Knowledge Hook evaluation latency. They suspect that the type of hook and the location of the knowledge source are the main factors.

**The Experiment:**

*   **Factors:**
    *   **Hook Type:** (ASK, SELECTThreshold)
    *   **Knowledge Source:** (Local Git Repo, Remote Jira API)
*   **Response:** Latency (in ms).
*   They run the evaluation 3 times for each combination.

### Multi-Vari Chart

A Multi-Vari chart would look something like this:

```
        |        Local Git Repo       |        Remote Jira API
        |---------------------------|---------------------------
        |      ASK      | SELECTThresh |      ASK      | SELECTThresh
--------|---------------|--------------|---------------|--------------
 300ms  |
        |                                      O (280)
 250ms  |                                      | (260)
        |                                      O (240)
 200ms  |
        |
 150ms  |                 O (140)
        |                 | (130)
 100ms  |                 O (120)
        |
  50ms  |    O (45)       O (55)
        |    | (40)       | (50)
   0ms  |    O (35)       O (45)
```

*   Each vertical line represents the range of variation for 3 trials in one specific condition.
*   The circles represent the average for that condition.

### Interpretation

The chart makes the sources of variation immediately obvious:

1.  **Biggest Source of Variation:** The difference between the **Local Git Repo** and the **Remote Jira API** is huge. The averages for the remote API are much higher. This is the dominant factor affecting latency.
2.  **Second Biggest Source:** Within each knowledge source, the difference between an **ASK** hook and a **SELECTThreshold** hook is the next biggest source of variation.
3.  **Smallest Source:** The variation within each set of 3 trials (the length of the vertical lines) is very small, indicating the measurement is repeatable.

### Conclusion

The Multi-Vari chart provides a clear visual roadmap for optimization. The team now knows that to reduce the latency of Knowledge Hook evaluations, their primary focus should be on **caching data from remote knowledge sources like Jira**. Optimizing the performance of different hook types would have a smaller impact. This graphical tool prevented them from focusing on the wrong problem.
