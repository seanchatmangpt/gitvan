# Develop: Detailed Design and ANOVA

## Detailed Design

In the Develop phase, we move from the conceptual design to a detailed, implementation-ready design. This involves creating detailed specifications for each component of the system. For a software project like GitVan v3, this includes API contracts, data schemas, and component-level architecture.

### GitVan v3.0 Case Study: Detailed Design of the `AI-Workflow-Generator`

Based on our work in the Explore phase, we chose an architecture where an AI model acts as an intermediary to translate natural language into a Turtle (.ttl) workflow file. Now, we need to create the detailed design for the service that will perform this function.

**Service Name:** `AI-Workflow-Generator`

**API Endpoint:** `POST /api/v1/workflows/generate`

**Request Body Schema:**
```json
{
  "prompt": "string (required) - The natural language prompt from the user.",
  "context": {
    "repo_structure": "object (optional) - A summary of the user's repository.",
    "existing_workflows": "array (optional) - A list of existing workflow names."
  },
  "config": {
    "model": "string (optional, default: 'qwen3-coder') - The AI model to use.",
    "temperature": "number (optional, default: 0.5) - The creativity of the AI."
  }
}
```

**Success Response (200 OK):**
```json
{
  "workflow_id": "string - A unique ID for the generated workflow.",
  "turtle_code": "string - The generated .ttl file content.",
  "plain_language_summary": "string - A summary of what the workflow does, for user confirmation.",
  "confidence_score": "number - The AI's confidence in the generated code (0-1)."
}
```

This detailed design provides a clear contract for the frontend and backend developers. It specifies the exact inputs and outputs, which is critical for parallel development and testing.

---

## Analysis of Variance (ANOVA)

**ANOVA** is a statistical method used to analyze the results of an experiment. It is used to determine if there are any statistically significant differences between the means of two or more independent groups.

While a t-test can compare the means of two groups, ANOVA is used when you have three or more groups. It tells you if there is a significant difference *somewhere* among the groups, but it doesn't tell you which specific groups are different from each other.

### GitVan v3.0 Case Study: Choosing an AI Model

The team wants to choose the best AI model for the `AI-Workflow-Generator` service. They want a model that consistently produces high-quality, valid Turtle code.

**The Experiment:**

*   **Response Variable:** They create a **Quality Score** (0-100) for each generated workflow. The score is based on a combination of SHACL validation compliance, code linting, and a human review for correctness.
*   **Factor:** The AI Model.
*   **Levels (Groups):** They decide to test three different models:
    1.  `qwen3-coder` (a specialized coding model)
    2.  `llama3` (a general-purpose model)
    3.  `gpt-4o` (a proprietary model)
*   **Setup:** They run the same 10 prompts through each model and record the Quality Score for each of the 30 generated workflows.

### The Hypotheses

*   **Null Hypothesis (H₀):** There is no difference in the mean Quality Score among the three AI models. (μ_qwen3 = μ_llama3 = μ_gpt4o)
*   **Alternative Hypothesis (H₁):** At least one model has a different mean Quality Score.
*   **Significance Level (α):** 0.05

### The Data (Quality Score out of 100)

*   **qwen3-coder:** `[92, 88, 95, 90, 91, 89, 94, 87, 93, 91]` -> **Mean = 91.0**
*   **llama3:** `[85, 82, 88, 79, 84, 81, 86, 83, 80, 82]` -> **Mean = 82.0**
*   **gpt-4o:** `[94, 96, 91, 98, 93, 95, 97, 92, 94, 95]` -> **Mean = 94.5**

### ANOVA Analysis

Running a one-way ANOVA test on this data would produce a result like this:

```python
from scipy import stats

qwen3 = [92, 88, 95, 90, 91, 89, 94, 87, 93, 91]
llama3 = [85, 82, 88, 79, 84, 81, 86, 83, 80, 82]
gpt4o = [94, 96, 91, 98, 93, 95, 97, 92, 94, 95]

f_statistic, p_value = stats.f_oneway(qwen3, llama3, gpt4o)

print(f"F-statistic: {f_statistic:.4f}")
print(f"P-value: {p_value:.4f}")
```

**Results:**

*   **F-statistic:** 25.5
*   **P-value:** 0.000008

### Decision and Conclusion

1.  **Compare p-value to α:** Our p-value (0.000008) is much smaller than our significance level α (0.05).

2.  **Make a Decision:** We **reject the null hypothesis**.

3.  **Conclusion:** We have statistically significant evidence to conclude that there is a difference in the mean Quality Score among the three AI models. The choice of model matters.

### Post-Hoc Analysis

ANOVA tells us that a difference exists, but not where. To find out which specific models are different, we would perform a **post-hoc test** (like Tukey's HSD - Honestly Significant Difference test). This test would compare each pair of models (qwen3 vs llama3, llama3 vs gpt-4o, qwen3 vs gpt-4o).

The post-hoc test would likely show:

*   There is a significant difference between `llama3` and the other two.
*   There may or may not be a statistically significant difference between `qwen3-coder` and `gpt-4o` (even though their means are different, their variation might overlap).

Based on this, the team can make a data-driven decision. They would likely eliminate `llama3` from consideration. The choice between `qwen3-coder` and `gpt-4o` might then come down to other factors, such as cost, licensing, or the ability to run locally (`qwen3-coder` can, `gpt-4o` cannot). This statistical analysis provides a solid, objective foundation for that final decision.
