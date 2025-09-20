# Develop: Mixture Designs

## What is a Mixture Design?

**Mixture Design** is a specialized type of Design of Experiments (DOE) used when the response depends on the *proportions* of the components in a mixture, rather than their absolute amounts. The key constraint in a mixture design is that the components must sum to a constant, usually 1 or 100%.

For example, in baking a cake, the proportions of flour, sugar, and eggs are what determine the taste and texture (the response), and they must sum to 100% of the batter.

While less common in software than in chemical engineering or food science, we can adapt the concept to model situations where we are allocating a fixed resource.

## GitVan v3.0 Case Study: Optimizing the Developer Experience (DX) Score

The GitVan v3 product manager wants to optimize the overall **Developer Experience (DX) Score** for the product. The DX Score is a composite metric (0-100) derived from user surveys, measuring overall satisfaction.

The product manager believes that the DX is driven by how the development team allocates its effort across three key areas. The team has a fixed amount of **developer time** (100%) to allocate for the next quarter.

**The Goal:** Find the optimal allocation of developer time across three focus areas to maximize the predicted DX Score.

### The Components (The Mixture)

*   **Component A: New Features.** Building new, powerful features for the autonomous engine.
*   **Component B: Performance.** Optimizing the speed and memory usage of the existing application.
*   **Component C: Bug Fixes.** Fixing existing bugs and improving stability.

**The Constraint:** `A + B + C = 100%` of the team's time.

### The Mixture Design Experiment

We will use a **Simplex-Lattice Design**, which is a standard design for mixture experiments. We will test different blends of effort.

*   **Pure Components (Vertices):** We test allocating 100% of the time to each component individually. (This is a thought experiment; in reality, we'd use historical data or expert opinion to predict the outcome).
*   **Binary Mixtures (Edges):** We test 50/50 splits between pairs of components.
*   **Centroid:** We test an equal blend of all three components.

| Run | A: New Features (%) | B: Performance (%) | C: Bug Fixes (%) | **Predicted DX Score (Response)** |
| :---: | :---: | :---: | :---: | :---: |
| 1 | 100 | 0 | 0 | 60 |
| 2 | 0 | 100 | 0 | 55 |
| 3 | 0 | 0 | 100 | 70 |
| 4 | 50 | 50 | 0 | 75 |
| 5 | 50 | 0 | 50 | **90** |
| 6 | 0 | 50 | 50 | 80 |
| 7 | 33.3 | 33.3 | 33.3 | 85 |

### Analysis and Visualization

The results of a mixture experiment are best visualized on a **ternary plot** (a triangular graph).

```
                      C: Bug Fixes (100%)
                           / \
                          /   \
                         /     \
                        / (70)  \
                       /         \
                      /           \
                     /             \
                    /      (90)     \
                   /         .       \
                  /           .       \
                 /             . (85)  \
                /               .     \
               /                 .     \
              /           (80)    .     \
             /                       .   \
            /___________________________. \
    A: New Features (100%)      B: Performance (100%)
          (60)         (75)          (55)
```

**Interpretation:**

1.  **Pure Components:** Focusing solely on one area is suboptimal. Focusing only on new features yields a DX of 60. Focusing only on performance is even worse (55), as the tool gets faster but users are still frustrated by bugs. Focusing only on bug fixes (70) is better, but the product stagnates.

2.  **The Optimal Blend:** The highest DX Score (90) is achieved with the blend from **Run 5**, which is a 50/50 split between **New Features** and **Bug Fixes**, with no time allocated to performance.

3.  **The Balanced Approach:** The centroid point (33.3% on each) yields a very good score of 85. This is a safe and robust allocation.

### The Regression Model and Conclusion

A mixture design analysis would produce a regression model like:

`DX Score = 60*A + 55*B + 70*C + 30*A*B + 60*A*C + 40*B*C`

*(The interaction terms like A*B represent the synergistic effect of blending those two components.)*

**Strategic Decision:**

The model and the plot provide clear guidance for the product manager.

*   The data suggests that for the next quarter, the optimal strategy to maximize developer satisfaction is to focus the team's effort on a **balanced mix of shipping new, exciting features AND fixing existing bugs and stability issues.**
*   Dedicated performance optimization work, at this stage, seems to have a lower impact on the overall user experience compared to the other two areas.
*   The best predicted outcome is a 50/50 split between features and fixes. A 33/33/33 split is also a very strong and potentially less risky strategy.

This is a powerful insight. Without this analysis, the team might have spent a third of their time on performance work that, while technically valuable, would not have contributed as much to the overall user experience as fixing bugs would have. Mixture design allowed them to find the optimal resource allocation to maximize a key business outcome.
