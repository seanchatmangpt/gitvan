# Develop: DOE with Curvature (Response Surface Methodology)

## Beyond Linearity: Finding the True Optimum

Our previous Design of Experiments (DOE) work assumed that the effects of our factors were **linear**. That is, changing a factor from its low level to its high level produces a straight-line change in the response.

But what if the true relationship is a curve? A linear model might point us in the right direction, but it won't help us find the peak of the curve—the true optimal setting.

**Response Surface Methodology (RSM)** is a collection of statistical and mathematical techniques used for modeling and analyzing problems where a response of interest is influenced by several variables and the objective is to optimize this response. RSM is used to:

1.  Find the optimal settings of factors.
2.  Understand how factors influence the response in a region of interest.
3.  Create a mathematical model of the process.

RSM experiments typically involve adding **center points** and **axial points** to a factorial design, which allows us to detect and model curvature in the response.

## Adapting the "Helicopter" Simulation for Software

In DFLSS training, the "Helicopter" simulation is a popular RSM exercise. Participants build paper helicopters and use DOE to find the combination of wing length and body width that maximizes flight time. The relationship is non-linear, so a simple factorial design isn't enough.

We will adapt this to a software problem: **finding the optimal configuration for the Knowledge Hook engine's worker pool to maximize throughput.**

## GitVan v3.0 Case Study: Optimizing the Knowledge Hook Engine

The Knowledge Hook engine processes incoming Git events and evaluates them against a set of hooks. To handle high loads (e.g., a push to the main branch of a large monorepo), the engine uses a worker pool to evaluate hooks in parallel.

**The Goal:** Maximize **Throughput** (measured in hooks evaluated per second).

### The Factors

The team identifies two key configuration parameters for their worker pool:

*   **Factor A: Pool Size.** The number of parallel worker processes to run. (Too few, and you don't get enough parallelism. Too many, and you waste resources on context switching.)
*   **Factor B: Batch Size.** The number of hooks to send to a worker in a single batch. (Too small, and the overhead of communication dominates. Too large, and one slow hook can hold up a whole batch.)

The team suspects that the relationship is not linear. The optimal settings are likely a curve.

### The RSM Experiment (Central Composite Design)

The team uses a **Central Composite Design (CCD)**, a standard RSM design.

*   **Factorial Points:** The corners of our factorial design (low/high for both factors).
*   **Center Points:** Replicated runs at the center of our design space.
*   **Axial Points:** "Star" points that extend beyond our factorial space to help model curvature.

| Run | Type | A: Pool Size | B: Batch Size | **Throughput (Response)** |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Factorial | 2 (-) | 10 (-) | 150 |
| 2 | Factorial | 10 (+) | 10 (-) | 450 |
| 3 | Factorial | 2 (-) | 50 (+) | 250 |
| 4 | Factorial | 10 (+) | 50 (+) | 650 |
| 5 | Center | 6 | 30 | 780 |
| 6 | Center | 6 | 30 | 800 |
| 7 | Center | 6 | 30 | 790 |
| 8 | Axial | 0.6 | 30 | 100 |
| 9 | Axial | 11.4 | 30 | 600 |
| 10 | Axial | 6 | 2.9 | 300 |
| 11 | Axial | 6 | 57.1 | 550 |

### Analysis and Visualization

Running this data through statistical software would generate a **contour plot** and a **3D surface plot**.

**Contour Plot:**

```
Batch  |
Size   |
   50 -|--------------------(650)बाट
      |                   /           \
   40 -|                  /             \ (800)
      |                 /      (Peak)   \
   30 -|----------------O-----------------O----(780)
      |                 \               /
   20 -|                  \             /
      |                   \           /
   10 -|--------(150)--------O--------/----(450)
      |
      +----------------------------------------------------> 
        2         4         6         8         10
                                Pool Size
```

**Interpretation:**

1.  **Curvature is Present:** The contour lines are curved ellipses, not straight lines. This confirms that a simple linear model is not sufficient. The effect of Pool Size depends on the Batch Size.
2.  **The Optimal Region:** The plot clearly shows a "peak" where throughput is maximized. The center of the ellipses is the sweet spot.
3.  **Finding the Optimum:** The analysis indicates that the maximum throughput (~800 hooks/sec) is achieved with a **Pool Size of around 7 workers** and a **Batch Size of around 35 hooks**.

### The Regression Model

RSM also produces a **quadratic regression equation** that models the response surface:

`Throughput = -50 + (150 * Pool) + (25 * Batch) - (10 * Pool²) - (0.3 * Batch²) + (0.5 * Pool * Batch)`

This equation is the mathematical model of the system. The team can now use it to:

*   Find the precise optimal point by taking the derivative.
*   Predict the throughput for any combination of settings, even ones they didn't test.

### Conclusion

By using Response Surface Methodology, the GitVan v3 team was able to:

1.  **Prove that the relationship** between their factors and the response was non-linear.
2.  **Visualize the entire operating window** of their system using contour plots.
3.  **Find the true optimal settings** for their worker pool (Pool Size = 7, Batch Size = 35) to maximize throughput, even though they never explicitly tested that exact combination.
4.  **Create a predictive mathematical model** of their system's performance.

This is a far more powerful approach than simple one-factor-at-a-time testing or basic factorial designs, and it is essential for optimizing complex systems where factor interactions and non-linearities are common.
