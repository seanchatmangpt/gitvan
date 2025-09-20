# Develop: DOE Simulation for CLI Performance

## Adapting a Classic: The Catapult Simulation

In traditional Lean Six Sigma training, the **Catapult Simulation** is a famous hands-on exercise used to teach Design of Experiments. Teams use a small catapult to launch a ball and try to find the optimal settings for factors like hook position, arm length, and pull-back angle to hit a target distance.

We will adapt this classic simulation to a modern software problem: **optimizing the performance of a core system component.**

## GitVan v3.0 Case Study: The `KnowledgeHookRegistry` Initialization

The `KnowledgeHookRegistry` is responsible for finding, parsing, and loading all the Knowledge Hook definitions (Turtle files) in a repository when GitVan starts. As a repository grows and accumulates many hooks, this initialization process can become slow. The team wants to find the optimal configuration to minimize this startup time.

**The Goal:** Minimize the initialization time of the `KnowledgeHookRegistry`.

### The Factors and Levels

The team identifies three key software design choices (factors) they can control:

| Factor | Level 1 (-) | Level 2 (+) | Description |
| :--- | :--- | :--- | :--- |
| **A: Discovery** | `Glob` | `Walk` | The method used to find Turtle files. `Glob` uses a pattern matching library, while `Walk` recursively walks the directory tree. |
| **B: Caching** | `Disabled` | `Enabled` | Whether to use a file-based cache to store the parsed hooks after the first run. |
| **C: Concurrency** | `Serial` | `Parallel` | Whether to read and parse multiple Turtle files sequentially or in parallel using a worker pool. |

### The Experimental Setup (Our "Catapult")

Instead of a physical catapult, our experiment will be a script that runs the `KnowledgeHookRegistry` initialization with different configurations.

*   **The "Ball":** A request to initialize the registry.
*   **The "Distance":** The initialization time in milliseconds (ms).
*   **The "Target":** The lowest possible initialization time.

We will use a 2³ Full-Factorial design, requiring 8 runs. We will test on a large repository with 500 Turtle files to ensure the differences are measurable.

### Design Matrix and Results

| Run | A: Discovery | B: Caching | C: Concurrency | **Latency (ms) (Response)** |
| :---: | :---: | :---: | :---: | :---: |
| 1 | Glob (-) | Disabled (-) | Serial (-) | 850 |
| 2 | Walk (+) | Disabled (-) | Serial (-) | 750 |
| 3 | Glob (-) | Enabled (+) | Serial (-) | 150 |
| 4 | Walk (+) | Enabled (+) | Serial (-) | 55 |
| 5 | Glob (-) | Disabled (-) | Parallel (+) | 450 |
| 6 | Walk (+) | Disabled (-) | Parallel (+) | 360 |
| 7 | Glob (-) | Enabled (+) | Parallel (+) | 145 |
| 8 | Walk (+) | Enabled (+) | Parallel (+) | **50** |

### Analysis of the Effects

Let's calculate the main effects on latency.

*   **Effect (A) Discovery:** `(750+55+360+50)/4 - (850+150+450+145)/4 = 303.75 - 398.75 = -95 ms`
    *   *Interpretation:* Switching from `Glob` to `Walk` reduces latency by 95 ms on average.

*   **Effect (B) Caching:** `(150+55+145+50)/4 - (850+750+450+360)/4 = 100 - 602.5 = -502.5 ms`
    *   *Interpretation:* **Enabling the cache** has a massive impact, reducing latency by over 500 ms on average.

*   **Effect (C) Concurrency:** `(450+360+145+50)/4 - (850+750+150+55)/4 = 251.25 - 451.25 = -200 ms`
    *   *Interpretation:* Using parallel processing reduces latency by 200 ms on average.

### Main Effects Plot

A Main Effects plot makes the results clear:

```
 Latency | 
   (ms)  | 
     600 +                        O (B-)
         |
     500 +                        |
         |                        |
     400 +    O (A-)              |              O (C-)
         |    |
     300 +    |    O (A+)         |              O (C+)
         |    |
     200 +    |
         |    O (B+)
     100 + 
         +---------------------------------------------------->
              Discovery (A)      Caching (B)      Concurrency (C)
```

**Conclusion:**

1.  **Caching (B) is the most important factor by far.** This is the first thing the team should implement.
2.  **Concurrency (C)** is the second most important factor.
3.  **Discovery Method (A)** has the smallest (but still significant) effect.

### The Optimal Configuration

Based on the analysis, the combination of factors that results in the lowest latency is found in **Run 8**:

*   **Discovery:** `Walk`
*   **Caching:** `Enabled`
*   **Concurrency:** `Parallel`

This configuration gives a latency of only **50 ms**, a 94% improvement over the worst-case configuration (Run 1, 850 ms).

This simulation demonstrates how DOE can be used to systematically explore a software design space and find the optimal combination of architectural choices to achieve a specific performance goal. The team now has a clear, data-driven mandate for how to build the fastest possible `KnowledgeHookRegistry`.
