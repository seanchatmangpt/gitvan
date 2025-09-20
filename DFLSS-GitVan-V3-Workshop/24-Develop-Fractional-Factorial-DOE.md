# Develop: Fractional Factorial DOE

## When Full-Factorial is Too Expensive

A Full-Factorial experiment is the gold standard because it tests every combination, allowing us to analyze all main effects and all interaction effects. However, it can quickly become too expensive or time-consuming.

Imagine if the GitVan team wanted to test 6 factors. A full-factorial design would require 2⁶ = 64 runs. If each run takes 10 minutes, that's over 10 hours of testing.

This is where **Fractional Factorial** designs become useful. They are a special type of experiment that uses a carefully chosen *fraction* of the full-factorial runs to study the most important effects.

### The Trade-Off: Resolution and Confounding

There is no free lunch. By running fewer experiments, we lose some information. In a fractional factorial design, some effects become **confounded** (or aliased) with each other. This means we can't distinguish the effect of one factor from the effect of an interaction.

The **Resolution** of a design tells us what is confounded:

*   **Resolution III:** Main effects are confounded with two-factor interactions. (Bad - avoid if possible).
*   **Resolution IV:** Main effects are clear, but two-factor interactions are confounded with other two-factor interactions.
*   **Resolution V:** Main effects and two-factor interactions are all clear.

A Resolution V design is ideal, but often a Resolution IV is a very good and efficient choice for screening many factors.

## GitVan v3.0 Case Study: Screening More AI Factors

The team was happy with their 3-factor experiment, but now they want to screen more factors to see if there are other important variables they missed. They want to test 6 factors in total.

*   **A:** Model (`qwen3` vs `gpt-4o`)
*   **B:** Temperature (`0.2` vs `0.8`)
*   **C:** Context (`Basic` vs `Detailed`)
*   **D:** Prompt Style (`Simple` vs `Chain-of-Thought`)
*   **E:** Response Format (`JSON` vs `Turtle`)
*   **F:** Fine-tuning (`None` vs `GitVan-specific`)

A full factorial would be 64 runs. The team decides to use a **2⁶⁻² Fractional Factorial design**, which is a **quarter fraction** design that only requires **16 runs**. This is a Resolution IV design.

### The Design Matrix (16 runs instead of 64)

Creating the design matrix for a fractional factorial is complex and usually done with statistical software. The key idea is that the levels for the new factors (E and F) are created by multiplying the levels of the original factors. For example, `E = A*B*C` and `F = B*C*D`.

This creates a set of 16 specific combinations to test.

| Run | A | B | C | D | E | F | Response |
| :---: |:-:|:-:|:-:|:-:|:-:|:-:| :---: |
| 1 | - | - | - | - | - | - | 70 |
| 2 | + | - | - | - | + | - | 75 |
| 3 | - | + | - | - | + | + | 68 |
| ... |...|...|...|...|...|...| ... |
| 16 | + | + | + | + | - | - | 99 |

### Analysis of a Fractional Factorial Design

When we analyze the results, we get estimates for the main effects just like before.

**Main Effects:**
*   Effect(A) = +8.5
*   Effect(B) = -2.1
*   Effect(C) = +15.3
*   Effect(D) = +5.0
*   Effect(E) = +1.5
*   Effect(F) = +12.8

**Interpretation:**

From this screening experiment, the team can quickly identify the **vital few** factors from the **trivial many**.

*   **Most Important Factors:** Context (C), Fine-tuning (F), and Model (A) have the largest effects.
*   **Less Important Factors:** Prompt Style (D) has a moderate effect.
*   **Insignificant Factors:** Temperature (B) and Response Format (E) have very small effects in this experiment.

**Confounding:**

Because this is a Resolution IV design, we can trust the main effects. However, the two-factor interactions are confounded. For example, the analysis might show that the `A*B` interaction is confounded with the `C*D` interaction. We can't separate them without more experiments.

### Conclusion and Next Steps

Fractional Factorial DOE is an incredibly efficient tool for **screening**. In just 16 runs, the GitVan v3 team was able to study 6 different factors and learn which ones were the most important drivers of quality.

The results tell them to focus their future efforts on:

1.  **Context:** Always provide the most detailed context possible.
2.  **Fine-tuning:** A fine-tuned model is significantly better.
3.  **Model:** The choice of model is important.

They also learned that they don't need to spend much time worrying about the AI's response format (`JSON` vs `Turtle`) or the temperature setting, as these have a much smaller impact.

If they wanted to study the interactions between the top 3 factors (A, C, F) in more detail, they could now run a **Full Factorial** experiment on just those three factors (which would only require 8 runs). This two-phased approach (Screening -> Optimization) is a very common and powerful strategy in DOE.
