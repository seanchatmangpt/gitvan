# Develop: Intro to Reliability

## What is Reliability?

**Reliability** is the probability that a system will perform its intended function without failure for a specified period of time under stated conditions. It is a measure of success over time.

In software, we often think about reliability in terms of:

*   **Availability:** The percentage of time the system is operational (e.g., 99.9% uptime).
*   **Mean Time Between Failures (MTBF):** The average time that passes between one failure and the next.
*   **Mean Time To Recovery (MTTR):** The average time it takes to recover from a failure.

A key goal of reliability engineering is to design systems that are not just **fault-free** (which is impossible) but **fault-tolerant**. A fault-tolerant system can continue to operate, perhaps in a degraded mode, even after one or more of its components have failed.

## GitVan v3.0 Case Study: Designing a Reliable Knowledge Hook Engine

The GitVan v3 team needs to ensure that their new Knowledge Hook engine is highly reliable. A failure in one part of the system should not cause a user's entire automation to fail.

### The Challenge: The "Jira Critical Issue" Hook

A key Knowledge Hook is one that runs on `pre-push` and queries the Jira API to check for open critical issues related to the branch being pushed. This hook relies on an external system (Jira) that could fail.

*   The Jira API could be down.
*   The network connection to Jira could fail.
*   The Jira API could return an unexpected response.

If the `pre-push` hook fails because of a Jira outage, it could prevent a developer from pushing their code, which is unacceptable if the outage is unrelated to their code.

### Applying Reliability Patterns

The team decides to apply several reliability patterns to make the system fault-tolerant.

**1. The Circuit Breaker Pattern**

They wrap all calls to the external Jira API in a **Circuit Breaker**.

*   **How it works:**
    1.  **Closed State:** Initially, requests are allowed to pass through to the Jira API.
    2.  **Open State:** If the number of failures in a given period exceeds a threshold (e.g., 5 consecutive failures), the circuit "opens." For a configured period (e.g., 60 seconds), all subsequent calls to the Jira API will fail *immediately* without even trying to make the network call. This prevents the system from wasting resources on a service that is known to be down.
    3.  **Half-Open State:** After the timeout, the circuit moves to a "half-open" state. It allows a single request to pass through. If that request succeeds, the circuit closes and normal operation resumes. If it fails, the circuit opens again for another timeout period.

**2. Graceful Degradation**

What happens when the circuit is open? The system should degrade gracefully.

*   **The `pre-push` hook has a primary function:** Prevent merging code with associated critical issues.
*   **The hook's operation depends on an external system.**

**Design Decision:** The hook should "fail open" or "fail safe" in a controlled way. The team decides that if the Jira API is unavailable, the hook should log a warning but allow the push to proceed. The risk of blocking a developer due to an external system outage is higher than the risk of a critical issue slipping through for a short period.

```
function pre_push_jira_hook():
  try:
    // Call the Jira API with a short timeout
    // and wrapped in a circuit breaker.
    has_critical_issues = check_jira_for_critical_issues()
    if (has_critical_issues):
      // Block the push
      exit(1)
  catch (error):
    // Log the error for monitoring.
    log_error("Jira API is unavailable", error)
    // Fallback to a "fail safe" behavior: log a warning and allow the push.
    log_warning("Could not verify Jira issues. Allowing push to proceed.")
    exit(0)

  // The primary function (the push) is allowed to proceed if Jira is down.
  exit(0)
```

**3. Fault Detection and Monitoring**

The team adds monitoring and alerting.

*   **Monitoring:** They create a dashboard that tracks the state of the circuit breaker and the error rate of the Jira API.
*   **Alerting:** If the circuit breaker opens, an automated alert is sent to the on-call developer in Slack, notifying them that the Jira API is having issues.

### Conclusion

By applying these reliability patterns, the GitVan v3 team has designed a robust and fault-tolerant system.

*   A failure in an external knowledge source (the Jira API) **will not** cause the developer's workflow to be blocked.
*   The system **detects** the failure (via the circuit breaker) and **degrades gracefully** (by logging a warning and allowing the push).
*   The core development lifecycle is preserved.
*   The support team is **automatically notified** of the problem.

This is a classic example of designing for reliability. Instead of assuming components will never fail, we assume they *will* fail and design a resilient system that can handle those failures gracefully.
