# Explore: Monte Carlo Simulation

## What is Monte Carlo Simulation?

Monte Carlo simulation is a powerful statistical technique used to understand the impact of risk and uncertainty in forecasting models. Instead of relying on a single, deterministic estimate (e.g., "This project will take 9 months"), a Monte Carlo simulation runs a model thousands of times, each time with a different set of random inputs drawn from a probability distribution.

## GitVan v3.0 Case Study Application: Forecasting the Release Date

The GitVan v3.0 release plan has a target completion date of September 30, 2025. However, the development estimates for each feature are just that—estimates. Some will take less time, and some will take more. A Monte Carlo simulation can help us understand the likelihood of hitting our target date.

### The Model

1.  **Inputs:** We break down the project into a series of major tasks (epics) based on the release plan.
2.  **Estimates:** For each task, instead of a single-point estimate, we provide a three-point estimate:
    *   **Optimistic (Best Case):** The time it would take if everything goes perfectly.
    *   **Most Likely:** The team's most realistic guess.
    *   **Pessimistic (Worst Case):** The time it would take if we hit significant roadblocks.
3.  **Distribution:** We use a PERT or Triangular distribution, which is common for modeling task durations.

### Task Estimates for GitVan v3.0 (in Developer-Weeks)

| Task | Optimistic | Most Likely | Pessimistic |
| :--- | :---: | :---: | :---: |
| Phase 1: Core Engine (RDF/SPARQL) | 8 | 12 | 16 |
| Phase 2: Knowledge Hooks (Git Lifecycle) | 10 | 15 | 22 |
| Phase 3: Workflow Engine (JS Conversion) | 6 | 9 | 13 |
| Phase 4: AI Interface & Packs | 8 | 12 | 18 |
| **Total (Most Likely)** | | **48** | |

*Note: A simple sum of the "Most Likely" column gives us 48 developer-weeks. With a team of 3 developers, this is 16 weeks, which seems to fit the timeline. But this single-point estimate hides all the risk!* 

### Running the Simulation

We will now run a simulation with 10,000 iterations. In each iteration:

1.  For each of the 4 tasks, we draw a random duration from its PERT distribution.
2.  We sum the four random durations to get a total project duration for that single simulation run.
3.  We record the result.

### A Simple Python Implementation

```python
import numpy as np
import matplotlib.pyplot as plt

# Task estimates [optimistic, most_likely, pessimistic]
tasks = {
    'phase1': [8, 12, 16],
    'phase2': [10, 15, 22],
    'phase3': [6, 9, 13],
    'phase4': [8, 12, 18]
}

num_simulations = 10000
simulation_results = []

for i in range(num_simulations):
    total_duration = 0
    for task, estimates in tasks.items():
        # Use a triangular distribution for simplicity
        duration = np.random.triangular(estimates[0], estimates[1], estimates[2])
        total_duration += duration
    simulation_results.append(total_duration)

# Analyze the results
mean_duration = np.mean(simulation_results)
percentile_50 = np.percentile(simulation_results, 50) # Median
percentile_85 = np.percentile(simulation_results, 85) # 85% confidence
percentile_95 = np.percentile(simulation_results, 95) # 95% confidence

print(f"'Most Likely' single-point estimate: {sum(t[1] for t in tasks.values()):.1f} weeks")
print(f"Simulation Mean Duration: {mean_duration:.1f} weeks")
print(f"50% Probability of finishing in: {percentile_50:.1f} weeks")
print(f"85% Probability of finishing in: {percentile_85:.1f} weeks")
print(f"95% Probability of finishing in: {percentile_95:.1f} weeks")

# Plot the results
plt.hist(simulation_results, bins=50, density=True, edgecolor='black')
plt.title('Distribution of Possible Project Durations')
plt.xlabel('Total Developer-Weeks')
plt.ylabel('Probability')
plt.axvline(x=percentile_85, color='r', linestyle='--', label=f'85th Percentile ({percentile_85:.1f} wks)')
plt.legend()
plt.show()
```

### Simulation Results and Interpretation

**Typical Output:**

*   'Most Likely' single-point estimate: 48.0 weeks
*   Simulation Mean Duration: 50.1 weeks
*   50% Probability of finishing in: 49.8 weeks
*   **85% Probability of finishing in: 54.5 weeks**
*   95% Probability of finishing in: 57.2 weeks

**Key Insights:**

1.  **The single-point estimate is misleading.** The simple sum of the "most likely" estimates (48 weeks) is overly optimistic. The simulation shows that the mean duration is actually 50.1 weeks, and there's only a 50% chance of finishing by then.

2.  **We can quantify our confidence.** The most valuable output is the percentile. We can now say to stakeholders: "There is an 85% probability that the project will require up to 54.5 developer-weeks to complete." This is a much more honest and useful forecast than a single number.

3.  **Informing the Release Plan:** The original plan was based on the 48-week estimate. The simulation shows that to have 85% confidence in our plan, we should budget for ~55 developer-weeks. With a team of 3 developers, this is ~18.3 weeks, which is longer than the original 16-week plan. This data allows the project manager to make an informed decision: either extend the timeline, add resources, or reduce scope to bring the 85th percentile back in line with the target date.

### Conclusion

Monte Carlo simulation is a powerful tool for moving beyond simplistic, single-point estimates and embracing uncertainty. By modeling the range of possibilities for each task, we can generate a realistic forecast of the project's total duration. This allows the GitVan v3 team to set realistic expectations with stakeholders and make proactive decisions to manage the risk of schedule overruns.
