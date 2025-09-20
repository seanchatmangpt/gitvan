# Measure: Process Capability (Cp, Cpk)

## What is Process Capability?

Process Capability analysis tells us how capable our process is of meeting customer specifications. It compares the **Voice of the Process** (the natural variation of the process) with the **Voice of the Customer** (the allowable specification limits).

*   **Specification Limits:** These are the limits defined by the customer or business requirements (e.g., "The build must complete in under 15 minutes").
    *   **USL:** Upper Specification Limit
    *   **LSL:** Lower Specification Limit
*   **Process Variation:** This is the natural variation of the process, typically measured as +/- 3 standard deviations (σ).

### Key Capability Indices:

*   **Cp (Process Potential):** Measures if the process variation is narrow enough to fit within the specification limits. It doesn't care if the process is centered.
    *   `Cp = (USL - LSL) / (6 * σ)`
    *   A Cp > 1.33 is generally considered good.

*   **Cpk (Process Capability):** Measures if the process is actually *capable* of meeting the specifications. It accounts for both the variation and the centering of the process.
    *   `Cpk = min( (USL - μ) / (3 * σ), (μ - LSL) / (3 * σ) )` (where μ is the process mean)
    *   A Cpk > 1.33 is generally considered good.

**The difference:** A process can have a high Cp (it's narrow enough) but a low Cpk (it's off-center and producing defects).

## GitVan v3.0 Case Study Application: Pull Request Cycle Time

The GitVan v3 development team has set an internal Service Level Objective (SLO) to improve their development velocity. This is a critical requirement from their internal customer, the Engineering Director.

**Customer Specification:** "The cycle time for a pull request (from creation to merge) should be no more than 2 working days (16 hours). Any PR taking longer is considered a 'defect'."

*   **LSL:** 0 hours (not applicable in this one-sided spec)
*   **USL:** 16 hours

**Process Data:** The team collects data on the cycle time for the last 50 merged PRs.

*   **Process Mean (μ):** 10 hours
*   **Process Standard Deviation (σ):** 2 hours

### Calculating the Process Capability

#### 1. Is the process stable?

Before calculating capability, we must ensure the process is in control. Let's assume a control chart of the PR cycle times shows only common cause variation. The process is stable.

#### 2. Calculate Cp (Process Potential)

Since we only have an upper spec limit, Cp is not the best measure, but we can calculate a one-sided equivalent.

`Cpu = (USL - μ) / (3 * σ) = (16 - 10) / (3 * 2) = 6 / 6 = 1.0`

This tells us that the process *potential* is okay, but not great. A value of 1.0 means the process spread just barely fits inside the specification if it were perfectly centered.

#### 3. Calculate Cpk (Process Capability)

Cpk is the more meaningful metric here.

`Cpk = min( (USL - μ) / (3 * σ), (μ - LSL) / (3 * σ) )`

Since we have no LSL, we only use the first part of the formula:

`Cpk = (USL - μ) / (3 * σ) = (16 - 10) / (3 * 2) = 6 / 6 = 1.0`

### Interpretation of the Results

A Cpk of **1.0** is generally considered **not capable** for a business-critical process. A Cpk of 1.0 implies that about 0.27% of the output will be defective. In our case, this means roughly 1 in every 370 PRs will take longer than 16 hours.

While this might sound good, the goal for a high-performing team is often a Cpk of 1.33 or even 1.67 (Six Sigma level).

**Visualizing the Capability:**

```
<-- Process Variation (μ ± 3σ) -->
|---------------------------------|
|                                 |
|         <-- Your Process -->    |
|         |--------------|        |
|         |              |        |
+---------|--------------|--------+-------------------->
          μ=4            μ=10     μ=16 (USL)

```

As the diagram shows, the tail end of our process variation (the slowest 3σ PRs) is right up against the specification limit. There is no room for error. Any slight shift in the process average or increase in variation will immediately result in more "defects" (PRs taking > 16 hours).

### Action Plan

The Cpk of 1.0 tells the GitVan team that their PR review process needs improvement. They are meeting the spec on average, but they are not *capable* of meeting it consistently with a high degree of confidence.

**Improvement Initiatives (Kaizen Event):**

1.  **Reduce Variation:** The team investigates the causes of the 2-hour standard deviation. They find that PRs for the UI and the AI engine have very different review times. They decide to create specialized review guidelines for each.
2.  **Shift the Mean:** They implement a policy that all PRs must be reviewed by at least one person within 4 hours of submission. This is designed to shift the average (μ) to the left (i.e., reduce the average cycle time).

After implementing these changes, they will collect new data and recalculate the Cpk, expecting to see a value closer to 1.33. This demonstrates how process capability analysis provides a quantitative driver for process improvement.
