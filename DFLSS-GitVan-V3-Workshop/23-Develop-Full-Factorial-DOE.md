# Develop: Full-Factorial DOE

## What is a Full-Factorial Experiment?

A **Full-Factorial** Design of Experiments is an experiment where we test every possible combination of the factor levels. This is the most comprehensive type of DOE because it allows us to study all possible main effects and interaction effects.

The number of runs required is `L^F`, where `L` is the number of levels and `F` is the number of factors. For our case, with 3 factors at 2 levels each, we need 2³ = 8 runs.

## GitVan v3.0 Case Study: The AI Generation Experiment

Let's proceed with the experiment we designed in the previous module.

*   **Factors:** A (Model), B (Temperature), C (Context)
*   **Response:** Quality Score (0-100)

### The Design Matrix

We create a matrix that lays out the 8 required experimental runs. We use `(-)` for Level 1 and `(+)` for Level 2.

| Run | A: Model | B: Temp | C: Context | **Quality Score (Response)** |
| :---: | :---: | :---: | :---: | :---: |
| 1 | - | - | - | 75 |
| 2 | + | - | - | 78 |
| 3 | - | + | - | 65 |
| 4 | + | + | - | 85 |
| 5 | - | - | + | 92 |
| 6 | + | - | + | 96 |
| 7 | - | + | + | 88 |
| 8 | + | + | + | 98 |

*For a real experiment, we would replicate each run multiple times to get a better estimate of the error, but we will use a single run for simplicity here.*

### Analysis of the Results

We can now calculate the **main effect** of each factor. The effect is the average change in the response when the factor is changed from its low level to its high level.

**1. Main Effect of A (Model):**
*   Avg Response when A is `+` (gpt-4o): `(78 + 85 + 96 + 98) / 4 = 89.25`
*   Avg Response when A is `-` (qwen3): `(75 + 65 + 92 + 88) / 4 = 80.0`
*   **Effect (A):** `89.25 - 80.0 = +9.25`
    *   *Interpretation:* Changing the model from `qwen3` to `gpt-4o` increases the Quality Score by an average of 9.25 points.

**2. Main Effect of B (Temperature):**
*   Avg Response when B is `+` (0.8): `(65 + 85 + 88 + 98) / 4 = 84.0`
*   Avg Response when B is `-` (0.2): `(75 + 78 + 92 + 96) / 4 = 85.25`
*   **Effect (B):** `84.0 - 85.25 = -1.25`
    *   *Interpretation:* Increasing the temperature (making the AI more creative) slightly *decreases* the Quality Score on average.

**3. Main Effect of C (Context):**
*   Avg Response when C is `+` (Detailed): `(92 + 96 + 88 + 98) / 4 = 93.5`
*   Avg Response when C is `-` (Basic): `(75 + 78 + 65 + 85) / 4 = 75.75`
*   **Effect (C):** `93.5 - 75.75 = +17.75`
    *   *Interpretation:* Providing detailed context has a very large positive impact, increasing the Quality Score by an average of 17.75 points.

### Analyzing Interaction Effects

The real power of DOE is in finding interaction effects. Let's look at the **A*C Interaction (Model * Context)**.

We can visualize this with an interaction plot:

```
  Quality |               / C+ (Detailed Context)
  Score   |              /
     95 --|             /------------------ O (97.0)
          |            /                 /
     90 --|           /                 /
          |          /                 /
     85 --|         O (90.0)          /
          |                        /
     80 --|                       /------ O (76.5)
          |                      /
     75 --|                     /
          |--------------------O (70.0)
     70 --|   C- (Basic Context)
          |
          +------------------------------------>
            A- (qwen3)         A+ (gpt-4o)
```

*   **Line C- (Basic Context):** When the context is basic, changing the model from `qwen3` (avg 70.0) to `gpt-4o` (avg 76.5) has a moderate positive effect.
*   **Line C+ (Detailed Context):** When the context is detailed, changing the model from `qwen3` (avg 90.0) to `gpt-4o` (avg 97.0) still has a positive effect, but the lines are not parallel.

**Interpretation of the Interaction:** The effect of the **Model (A)** depends on the level of **Context (C)**. `gpt-4o` gets a bigger boost from detailed context than `qwen3-coder` does. This is a crucial insight that would be missed with one-factor-at-a-time testing.

### Conclusion and Optimal Settings

Based on our analysis:

1.  **Context (C) is the most important factor.** Providing detailed context gives the biggest boost to quality.
2.  **Model (A) is the second most important factor.** `gpt-4o` generally outperforms `qwen3-coder`.
3.  **Temperature (B) has a small negative effect.** Lower temperature (more deterministic) is slightly better for quality.
4.  There is a significant **interaction between Model and Context**.

**Optimal Settings:** To achieve the highest possible Quality Score, the team should use the settings from **Run 8**:

*   **Model (A):** `+` (gpt-4o)
*   **Temperature (B):** `+` (0.8) -- *Wait, this is surprising!* Let's re-check.

Let's re-examine the data. The highest score (98) was achieved in Run 8 (A+, B+, C+). The second highest (96) was in Run 6 (A+, B-, C+). This suggests that for the `gpt-4o` model, a higher temperature might be beneficial *if and only if* detailed context is also provided. This is another **interaction effect (A*B*C)**.

Without getting into the complex math of a three-way interaction, the data clearly points to the best combination.

**Final Decision:** The optimal configuration to maximize the Quality Score is:

*   **Model:** `gpt-4o`
*   **Temperature:** `0.8` (Creative)
*   **Context:** `Detailed`

This DOE allowed the team to efficiently explore the entire decision space, understand the main drivers of quality, uncover surprising interactions, and find the optimal settings with just 8 experimental runs.
