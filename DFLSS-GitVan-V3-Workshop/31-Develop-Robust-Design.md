# Develop: Robust Design (The Taguchi Method)

## What is Robust Design?

**Robust Design**, pioneered by Genichi Taguchi, is a philosophy for designing products and processes that are **insensitive to variation**. The goal is to create a design that performs consistently and correctly despite the presence of "noise" factors in the real-world environment.

Noise factors are variables that are difficult, expensive, or impossible to control. Examples include:

*   **Environmental Noise:** Temperature, humidity, network latency.
*   **Manufacturing Variation:** Slight differences between manufactured parts.
*   **User Variation:** Different users interacting with the product in different ways.

A robust design is one that continues to meet customer expectations even when these noise factors are present.

## The Taguchi Method

The Taguchi method uses a special type of Design of Experiments (DOE) to find the optimal settings for our **control factors** (the things we *can* control) that make the response **robust** to the variation from the **noise factors** (the things we *can't* control).

This is done by using an **orthogonal array** for the experiment, which allows us to test both the control factors and the noise factors simultaneously in a very efficient manner.

The key metric in a Taguchi experiment is the **Signal-to-Noise (S/N) Ratio**. We want to find the settings that maximize this ratio, which represents the most robust design.

## GitVan v3.0 Case Study: Designing a Robust AI Prompt

The GitVan v3 team is designing the standard prompt that will be used to ask the AI model to generate a workflow. They want the prompt to be robust, meaning it should produce a high-quality workflow regardless of which specific AI model is being used.

**The Goal:** Find the prompt structure that produces the highest **Quality Score** consistently across different AI models.

### The Factors

*   **Control Factors (Things we can design in our prompt):**
    *   **A: Role:** (None, "You are an expert software engineer")
    *   **B: Specificity:** (Low, High - i.e., providing few-shot examples)
    *   **C: Constraints:** (None, "You must only use these functions...")

*   **Noise Factor (Something we can't control in the field):**
    *   **N: AI Model:** (`qwen3-coder`, `llama3`, `gpt-4o`)

### The Taguchi DOE (L9 Orthogonal Array)

An L9 orthogonal array allows us to study up to 4 factors at 3 levels each in just 9 runs. We will assign our 3 control factors and our 1 noise factor to this array.

*(The design of this array is complex; we are using a standard statistical design.)*

For each of the 9 runs, we will get 3 results for the Quality Score (one for each level of the noise factor, i.e., one for each AI model).

| Run | A: Role | B: Specificity | C: Constraints | **Responses (Quality Score)** | **Mean** | **Std Dev** | **S/N Ratio** |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| 1 | 1 | 1 | 1 | 75, 65, 80 | 73.3 | 7.6 | 19.7 |
| 2 | 1 | 2 | 2 | 85, 78, 88 | 83.7 | 5.1 | 24.2 |
| 3 | 1 | 3 | 3 | 92, 85, 94 | 90.3 | 4.7 | 25.7 |
| 4 | 2 | 1 | 2 | 88, 82, 90 | 86.7 | 4.2 | 26.3 |
| 5 | 2 | 2 | 3 | 94, 90, 96 | 93.3 | 3.1 | 29.6 |
| 6 | 2 | 3 | 1 | 80, 75, 82 | 79.0 | 3.6 | 26.8 |
| 7 | 3 | 1 | 3 | 95, 92, 97 | 94.7 | 2.5 | **31.5** |
| 8 | 3 | 2 | 1 | 82, 80, 85 | 82.3 | 2.5 | 29.3 |
| 9 | 3 | 3 | 2 | 90, 88, 91 | 89.7 | 1.5 | **35.5** |

*S/N Ratio (for "larger is better"): -10 * log10( sum(1/y²) / n )* 

### Analysis of the S/N Ratio

We want to find the factor levels that give us the highest Signal-to-Noise ratio. A high S/N ratio means the response is high (good quality) and the variation (noise) is low.

We would calculate the average S/N ratio for each level of each control factor.

**Average S/N Ratio by Factor Level:**

| Level | A: Role | B: Specificity | C: Constraints |
| :---: | :---: | :---: | :---: |
| **1** | 23.2 | 25.8 | 25.3 |
| **2** | 27.6 | 27.7 | 28.7 |
| **3** | **32.1** | **30.7** | **29.0** |

**Interpretation:**

*   **For Factor A (Role):** Level 3 has the highest average S/N ratio (32.1).
*   **For Factor B (Specificity):** Level 3 has the highest average S/N ratio (30.7).
*   **For Factor C (Constraints):** Level 3 has the highest average S/N ratio (29.0).

### Conclusion: The Optimal, Robust Design

The Taguchi experiment tells us that the most **robust** prompt design—the one that will produce the highest quality score with the least amount of variation, *regardless of which AI model is used*—is:

*   **A: Role:** Level 3 (e.g., "You are a world-class expert in RDF and Turtle syntax...")
*   **B: Specificity:** Level 3 (e.g., providing multiple, high-quality examples of the desired output)
*   **C: Constraints:** Level 3 (e.g., providing strict instructions on what the AI can and cannot do)

This is a powerful result. We have not just found the settings that work best on average; we have found the settings that are most resilient to the noise we cannot control (in this case, the choice of the underlying AI model).

By designing the prompt to be robust, the GitVan v3 team ensures that their feature will work reliably for their users, even as they swap out different AI models in the backend. This reduces future maintenance costs, improves customer satisfaction, and creates a more resilient system.
